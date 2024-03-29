import { Address, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { EmissionConfig, EmissionData, Emissions } from '../emissions.js';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { getOraclePrice } from '../oracle.js';
import { TokenMetadata, getTokenBalance } from '../token.js';
import { ReserveEst } from './reserve_est.js';
import {
  ReserveConfig,
  ReserveData,
  ReserveEmissionConfig,
  ReserveEmissionData,
  getEmissionEntryTokenType,
} from './reserve_types.js';

/**
 * Manage ledger data for a reserve in a Blend pool
 */
export class Reserve {
  constructor(
    public assetId: string,
    public tokenMetadata: TokenMetadata,
    public poolBalance: bigint,
    public config: ReserveConfig,
    public data: ReserveData,
    public borrowEmissions: Emissions | undefined,
    public supplyEmissions: Emissions | undefined,
    public oraclePrice: number,
    public estimates: ReserveEst,
    public latestLedger: number
  ) {}

  /**
   * Load a Reserve from asset `assetId` from the pool `poolId` on the network `network`
   * @param network - The network configuration
   * @param poolId - The contract address of the Pool
   * @param oracleId - The contract address of the Oracle
   * @param oracleDecimals - The number of decimals the Oracle uses
   * @param backstopTakeRate - The backstop take rate
   * @param assetId - The contract address of the Reserve asset
   * @param index - The index of the reserve in the Pool
   * @param timestamp - The timestamp to project the Reserve data to
   * @returns A Reserve object
   */
  static async load(
    network: Network,
    poolId: string,
    oracleId: string,
    oracleDecimals: number,
    backstopTakeRate: number,
    assetId: string,
    index: number,
    timestamp: number
  ): Promise<Reserve> {
    const sorobanRpc = new SorobanRpc.Server(network.rpc, network.opts);

    const dTokenIndex = index * 2;
    const bTokenIndex = index * 2 + 1;
    const ledgerKeys: xdr.LedgerKey[] = [
      ReserveConfig.ledgerKey(poolId, assetId),
      TokenMetadata.ledgerKey(assetId),
      ReserveData.ledgerKey(poolId, assetId),
      ReserveEmissionConfig.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionConfig.ledgerKey(poolId, dTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, dTokenIndex),
    ];
    const reserveLedgerEntriesPromise = sorobanRpc.getLedgerEntries(...ledgerKeys);
    const balancePromise = getTokenBalance(network, assetId, Address.fromString(poolId));
    const pricePromise = getOraclePrice(network, oracleId, assetId);

    const [reserveLedgerEntries, poolTokens, price] = await Promise.all([
      reserveLedgerEntriesPromise,
      balancePromise,
      pricePromise,
    ]);

    // not all reserves have emissions, but the first 3 entries are required
    if (reserveLedgerEntries.entries.length < 3) {
      throw new Error('Unable to load reserve: missing ledger entries.');
    }

    let reserveConfig: ReserveConfig;
    let reserveData: ReserveData;
    let tokenMetadata: TokenMetadata;
    let emissionSupplyConfig: EmissionConfig | undefined;
    let emissionSupplyData: EmissionData | undefined;
    let emissionBorrowConfig: EmissionConfig | undefined;
    let emissionBorrowData: EmissionData | undefined;
    for (const entry of reserveLedgerEntries.entries) {
      const ledgerEntry = entry.val;
      const key = decodeEntryKey(ledgerEntry.contractData().key());
      switch (key) {
        case 'ResConfig':
          reserveConfig = ReserveConfig.fromLedgerEntryData(ledgerEntry);
          break;
        case 'ResData':
          reserveData = ReserveData.fromLedgerEntryData(ledgerEntry);
          break;
        case 'ContractInstance':
          tokenMetadata = TokenMetadata.fromLedgerEntryData(ledgerEntry);
          break;
        case `EmisConfig`: {
          const token_type = getEmissionEntryTokenType(ledgerEntry);
          if (token_type == 0) {
            emissionBorrowConfig = EmissionConfig.fromLedgerEntryData(ledgerEntry);
          } else if (token_type == 1) {
            emissionSupplyConfig = EmissionConfig.fromLedgerEntryData(ledgerEntry);
          }
          break;
        }
        case `EmisData`: {
          const token_type = getEmissionEntryTokenType(ledgerEntry);
          if (token_type == 0) {
            emissionBorrowData = EmissionData.fromLedgerEntryData(ledgerEntry);
          } else if (token_type == 1) {
            emissionSupplyData = EmissionData.fromLedgerEntryData(ledgerEntry);
          }
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    let borrowEmissions: Emissions | undefined = undefined;
    if (emissionBorrowConfig && emissionBorrowData) {
      borrowEmissions = new Emissions(emissionBorrowConfig, emissionBorrowData);
    }

    let supplyEmissions: Emissions | undefined = undefined;
    if (emissionSupplyConfig && emissionSupplyData) {
      supplyEmissions = new Emissions(emissionSupplyConfig, emissionSupplyData);
    }

    if (
      tokenMetadata == undefined ||
      poolTokens == undefined ||
      reserveConfig == undefined ||
      reserveData == undefined ||
      price == undefined
    ) {
      throw new Error('Unable to load reserve: missing data.');
    }

    return new Reserve(
      assetId,
      tokenMetadata,
      poolTokens,
      reserveConfig,
      reserveData,
      borrowEmissions,
      supplyEmissions,
      Number(price) / 10 ** oracleDecimals,
      ReserveEst.build(reserveConfig, reserveData, poolTokens, backstopTakeRate, timestamp),
      reserveLedgerEntries.latestLedger
    );
  }

  /**
   * Update the estimated reserve data to a new timestamp
   */
  public estimate(backstopTakeRate: number, timestamp: number) {
    this.estimates = ReserveEst.build(
      this.config,
      this.data,
      this.poolBalance,
      backstopTakeRate,
      timestamp
    );
  }

  /********** Data Helpers **********/

  /**
   * Get the collateral factor as a floating point decimal percentage
   * (e.g 0.95 == 95%)
   *
   * The effective collateral of a positions is:
   * ```
   * effective_collateral = collateral * collateral_factor
   * ```
   */
  public getCollateralFactor(): number {
    return Number(this.config.c_factor) / 1e7;
  }

  /**
   * Get the liability factor as a floating point decimal percentage.
   * (e.g 1.23 == 95%). This inverts the stored value on chain to make
   * computing the effective liability easier.
   *
   * The effective liability of a position is:
   * ```
   * effective_liability = liability * liability_factor
   * ```
   */
  public getLiabilityFactor(): number {
    return 1 / (Number(this.config.l_factor) / 1e7);
  }

  /********** Conversion Functions ***********/

  /**
   * Estimate the dTokens to a floating point asset amount
   * @param dTokens - The number of dTokens to convert as an integer
   * @returns The floating point asset amount
   */
  public toAssetFromDToken(dTokens: bigint): number {
    return this.estimates.bRate * (Number(dTokens) / 10 ** this.config.decimals);
  }

  /**
   * Estimate the bTokens to a floating point asset amount
   * @param bTokens - The number of bTokens to convert as an integer
   * @returns The floating point asset amount
   */
  public toAssetFromBToken(bTokens: bigint): number {
    return this.estimates.bRate * (Number(bTokens) / 10 ** this.config.decimals);
  }

  /**
   * Estimate the effective dTokens (liability amount as asset) to a floating point asset amount
   * @param dTokens - The number of dTokens to convert as an integer
   * @returns The floating point asset amount
   */
  public toEffectiveAssetFromDToken(dTokens: bigint): number {
    return this.getLiabilityFactor() * this.toAssetFromDToken(dTokens);
  }

  /**
   * Estimate the effective bTokens (collateral amount as asset) to a floating point asset amount
   * @param bTokens - The number of bTokens to convert as an integer
   * @returns The floating point asset amount
   */
  public toEffectiveAssetFromBToken(bTokens: bigint): number {
    return this.getCollateralFactor() * this.toAssetFromBToken(bTokens);
  }

  /**
   * To dTokens from an asset amount
   */
  public toDTokensFromAsset(asset: number): bigint {
    return BigInt(Math.ceil((asset / this.estimates.dRate) * 10 ** this.config.decimals));
  }

  /**
   * To bTokens from an asset amount
   */
  public toBTokensFromAsset(asset: number): bigint {
    return BigInt(Math.floor((asset / this.estimates.bRate) * 10 ** this.config.decimals));
  }
}
