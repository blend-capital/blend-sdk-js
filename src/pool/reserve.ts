import { SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { EmissionConfig, EmissionData, Emissions } from '../emissions.js';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import * as FixedMath from '../math.js';
import { TokenMetadata } from '../token.js';
import {
  getEmissionEntryTokenType,
  ReserveConfig,
  ReserveData,
  ReserveEmissionConfig,
  ReserveEmissionData,
} from './reserve_types.js';

/**
 * Manage ledger data for a reserve in a Blend pool
 */
export class Reserve {
  constructor(
    public poolId: string,
    public assetId: string,
    public tokenMetadata: TokenMetadata,
    public config: ReserveConfig,
    public data: ReserveData,
    public borrowEmissions: Emissions | undefined,
    public supplyEmissions: Emissions | undefined,
    public borrowApr: number,
    public supplyApr: number,
    public latestLedger: number
  ) {}

  /**
   * Load a Reserve from asset `assetId` from the pool `poolId` on the network `network`
   * @param network - The network configuration
   * @param poolId - The contract address of the Pool
   * @param backstopTakeRate - The backstop take rate (as a fixed point number with 7 decimals)
   * @param assetId - The contract address of the Reserve asset
   * @param index - The index of the Reserve in the Pool
   * @param timestamp - The timestamp to project the Reserve data to (in seconds since epoch)
   * @returns A Reserve object
   */
  static async load(
    network: Network,
    poolId: string,
    backstopTakeRate: bigint,
    assetId: string,
    index: number,
    timestamp?: number
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
    const reserveLedgerEntries = await sorobanRpc.getLedgerEntries(...ledgerKeys);

    // not all reserves have emissions, but the first 3 entries are required
    if (reserveLedgerEntries.entries.length < 3) {
      throw new Error('Unable to load reserve: missing ledger entries.');
    }

    let reserveConfig: ReserveConfig | undefined;
    let reserveData: ReserveData | undefined;
    let tokenMetadata: TokenMetadata | undefined;
    let emissionBorrowConfig: EmissionConfig | undefined;
    let emissionBorrowData: EmissionData | undefined;
    let emissionSupplyConfig: EmissionConfig | undefined;
    let emissionSupplyData: EmissionData | undefined;
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

    if (tokenMetadata == undefined || reserveConfig == undefined || reserveData == undefined) {
      throw new Error('Unable to load reserve: missing data.');
    }

    let borrowEmissions: Emissions | undefined = undefined;
    if (emissionBorrowConfig && emissionBorrowData) {
      borrowEmissions = new Emissions(
        emissionBorrowConfig,
        emissionBorrowData,
        reserveLedgerEntries.latestLedger
      );
      borrowEmissions.accrue(reserveData.dSupply, reserveConfig.decimals, timestamp);
    }

    let supplyEmissions: Emissions | undefined = undefined;
    if (emissionSupplyConfig && emissionSupplyData) {
      supplyEmissions = new Emissions(
        emissionSupplyConfig,
        emissionSupplyData,
        reserveLedgerEntries.latestLedger
      );
      supplyEmissions.accrue(reserveData.bSupply, reserveConfig.decimals, timestamp);
    }

    const reserve = new Reserve(
      poolId,
      assetId,
      tokenMetadata,
      reserveConfig,
      reserveData,
      borrowEmissions,
      supplyEmissions,
      0,
      0,
      reserveLedgerEntries.latestLedger
    );
    reserve.accrue(backstopTakeRate, timestamp);
    return reserve;
  }

  /**
   * Accrue interest on the Reserve to the given timestamp, or now if no timestamp is provided.
   *
   * Updates ReserveData based on the accrual.
   *
   * @param backstopTakeRate - The backstop take rate (as a fixed point number)
   * @param timestamp - The timestamp to accrue interest to (in seconds since epoch)
   */
  public accrue(backstopTakeRate: bigint, timestamp?: number | undefined): void {
    if (timestamp === undefined) {
      timestamp = Math.floor(Date.now() / 1000);
    }

    const curUtil = this.getUtilization();
    if (curUtil === BigInt(0)) {
      this.borrowApr = FixedMath.toFloat(BigInt(this.config.r_base), 7);
      this.data.lastTime = timestamp;
      return;
    }

    let curIr: bigint;
    const targetUtil = BigInt(this.config.util);
    const fixed_95_percent = BigInt(9_500_000);
    const fixed_5_percent = BigInt(500_000);

    // calculate current IR
    if (curUtil <= targetUtil) {
      const utilScalar = FixedMath.divCeil(curUtil, targetUtil, FixedMath.SCALAR_7);
      const baseRate =
        FixedMath.mulCeil(utilScalar, BigInt(this.config.r_one), FixedMath.SCALAR_7) +
        BigInt(this.config.r_base);
      curIr = FixedMath.mulCeil(baseRate, this.data.interestRateModifier, FixedMath.SCALAR_9);
    } else if (curUtil <= fixed_95_percent) {
      const utilScalar = FixedMath.divCeil(
        curUtil - targetUtil,
        fixed_95_percent - targetUtil,
        FixedMath.SCALAR_7
      );
      const baseRate =
        FixedMath.mulCeil(utilScalar, BigInt(this.config.r_two), FixedMath.SCALAR_7) +
        BigInt(this.config.r_one) +
        BigInt(this.config.r_base);
      curIr = FixedMath.mulCeil(baseRate, this.data.interestRateModifier, FixedMath.SCALAR_9);
    } else {
      const utilScalar = FixedMath.divCeil(
        curUtil - fixed_95_percent,
        fixed_5_percent,
        FixedMath.SCALAR_7
      );
      const extraRate = FixedMath.mulCeil(
        utilScalar,
        BigInt(this.config.r_three),
        FixedMath.SCALAR_7
      );
      const intersection = FixedMath.mulCeil(
        this.data.interestRateModifier,
        BigInt(this.config.r_two) + BigInt(this.config.r_one) + BigInt(this.config.r_base),
        FixedMath.SCALAR_9
      );
      curIr = extraRate + intersection;
    }
    this.borrowApr = FixedMath.toFloat(curIr, 7);
    this.supplyApr = FixedMath.toFloat(FixedMath.mulFloor(curIr, curUtil, FixedMath.SCALAR_7), 7);

    // update rate_modifier on reserve data
    const deltaTimeScaled = FixedMath.toFixed(timestamp - this.data.lastTime, 9);
    if (curUtil > targetUtil) {
      // rate modifier increasing
      const utilDifScaled = (curUtil - targetUtil) * BigInt(100);
      const utilError = FixedMath.mulFloor(deltaTimeScaled, utilDifScaled, FixedMath.SCALAR_9);
      const rateDif = FixedMath.mulFloor(
        utilError,
        BigInt(this.config.reactivity),
        FixedMath.SCALAR_7
      );
      const nextIrMod = this.data.interestRateModifier + rateDif;
      const irModMax = BigInt(10) * FixedMath.SCALAR_9;
      this.data.interestRateModifier = nextIrMod > irModMax ? irModMax : nextIrMod;
    } else if (curUtil < targetUtil) {
      // rate modifier decreasing
      const utilDifScaled = (targetUtil - curUtil) * BigInt(100);
      const utilError = FixedMath.mulCeil(deltaTimeScaled, utilDifScaled, FixedMath.SCALAR_9);
      const rateDif = FixedMath.mulCeil(
        utilError,
        BigInt(this.config.reactivity),
        FixedMath.SCALAR_7
      );
      const nextIrMod = this.data.interestRateModifier - rateDif;
      const irModMin = FixedMath.SCALAR_9 / 10n;
      this.data.interestRateModifier = nextIrMod < irModMin ? irModMin : nextIrMod;
    }

    // calc accrual amount over blocks
    const timeWeight = deltaTimeScaled / BigInt(31536000);
    const accrualAmount =
      FixedMath.SCALAR_9 + FixedMath.mulCeil(timeWeight, curIr * 100n, FixedMath.SCALAR_9);

    // apply accrual to reserveData
    const preUpdateSupply = this.totalSupply();
    const preUpdateLiabilities = this.totalLiabilities();

    this.data.dRate = FixedMath.mulCeil(accrualAmount, this.data.dRate, FixedMath.SCALAR_9);

    const accruedInterest = this.totalLiabilities() - preUpdateLiabilities;
    if (accruedInterest > 0) {
      const newBackstopCredit = FixedMath.mulFloor(
        accruedInterest,
        backstopTakeRate,
        FixedMath.SCALAR_7
      );
      this.data.backstopCredit += newBackstopCredit;
      this.data.bRate = FixedMath.divFloor(
        preUpdateSupply + accruedInterest - newBackstopCredit,
        this.data.bSupply,
        FixedMath.SCALAR_9
      );
    }
    this.data.lastTime = timestamp;
  }

  /********** Data Helpers **********/

  /**
   * Get the borrow (dToken) emission index
   */
  public getDTokenEmissionIndex(): number {
    return this.config.index * 2;
  }

  /**
   * Get the supply (bToken) emission index
   */
  public getBTokenEmissionIndex(): number {
    return this.config.index * 2 + 1;
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
    return 1 / FixedMath.toFloat(BigInt(this.config.l_factor), 7);
  }

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
    return FixedMath.toFloat(BigInt(this.config.c_factor), 7);
  }

  /**
   * Get the utilization of the Reserve as a fixed point number
   */
  public getUtilization(): bigint {
    const totalSupply = this.totalSupply();
    if (totalSupply === BigInt(0)) {
      return BigInt(0);
    } else {
      return FixedMath.divCeil(
        this.totalLiabilities(),
        totalSupply,
        FixedMath.toFixed(1, this.config.decimals)
      );
    }
  }

  /**
   * Get the utilization of the Reserve as a floating point number
   */
  public getUtilizationFloat(): number {
    const totalSupply = this.totalSupply();
    if (totalSupply === BigInt(0)) {
      return 0;
    } else {
      return FixedMath.toFloat(
        FixedMath.divCeil(
          this.totalLiabilities(),
          totalSupply,
          FixedMath.toFixed(1, this.config.decimals)
        ),
        7
      );
    }
  }

  /**
   * Get the total liabilities of the Reserve
   */
  public totalLiabilities(): bigint {
    return this.toAssetFromDToken(this.data.dSupply);
  }

  /**
   * Get the total liabilities of the Reserve as a floating point number
   */
  public totalLiabilitiesFloat(): number {
    return this.toAssetFromDTokenFloat(this.data.dSupply);
  }

  /**
   * Get the total supply of the Reserve
   */
  public totalSupply(): bigint {
    return this.toAssetFromBToken(this.data.bSupply);
  }

  /**
   * Get the total supply of the Reserve as a floating point number
   */
  public totalSupplyFloat(): number {
    return this.toAssetFromBTokenFloat(this.data.bSupply);
  }

  /**
   * Get the BLND per year currently being emitted to each borrowed asset
   */
  public emissionsPerYearPerBorrowedAsset(): number {
    if (this.borrowEmissions === undefined) {
      return 0;
    }
    return this.borrowEmissions.emissionsPerYearPerToken(
      this.totalLiabilities(),
      this.config.decimals
    );
  }

  /**
   * Get the BLND per year currently being emitted to each supplied asset
   */
  public emissionsPerYearPerSuppliedAsset(): number {
    if (this.supplyEmissions === undefined) {
      return 0;
    }
    return this.supplyEmissions.emissionsPerYearPerToken(this.totalSupply(), this.config.decimals);
  }

  /********** Conversion Functions ***********/

  /**
   * Convert dTokens to assets
   * @param dTokens - The number of dTokens to convert
   * @returns The asset amount
   */
  public toAssetFromDToken(dTokens: bigint | undefined): bigint {
    if (dTokens === undefined) {
      return BigInt(0);
    }
    return FixedMath.mulCeil(dTokens, this.data.dRate, FixedMath.SCALAR_9);
  }

  /**
   * Convert bTokens to assets
   * @param bTokens - The number of bTokens to convert
   * @returns The asset amount
   */
  public toAssetFromBToken(bTokens: bigint | undefined): bigint {
    if (bTokens === undefined) {
      return BigInt(0);
    }
    return FixedMath.mulFloor(bTokens, this.data.bRate, FixedMath.SCALAR_9);
  }

  /**
   * Convert dTokens to their corresponding effective asset value. This takes
   * into account the liability factor
   * @param dTokens - The number of dTokens to convert
   * @returns The liability amount in assets
   */
  public toEffectiveAssetFromDToken(dTokens: bigint | undefined): bigint {
    if (dTokens === undefined) {
      return BigInt(0);
    }
    return FixedMath.divCeil(
      this.toAssetFromDToken(dTokens),
      BigInt(this.config.l_factor),
      FixedMath.SCALAR_7
    );
  }

  /**
   * Convert bTokens to their corresponding effective asset value. This takes
   * into account the collateral factor
   * @param bTokens - The number of bTokens to convert
   * @returns The collateral amount in assets
   */
  public toEffectiveAssetFromBToken(bTokens: bigint | undefined): bigint {
    if (bTokens === undefined) {
      return BigInt(0);
    }
    return FixedMath.mulFloor(
      this.toAssetFromBToken(bTokens),
      BigInt(this.config.c_factor),
      FixedMath.SCALAR_7
    );
  }

  /**
   * Convert dTokens to assets as a floating point number
   * @param dTokens - The number of dTokens to convert
   * @returns The asset amount
   */
  public toAssetFromDTokenFloat(dTokens: bigint | undefined): number {
    return FixedMath.toFloat(this.toAssetFromDToken(dTokens), this.config.decimals);
  }

  /**
   * Convert bTokens to assets as a floating point number
   * @param bTokens - The number of bTokens to convert
   * @returns The asset amount
   */
  public toAssetFromBTokenFloat(bTokens: bigint | undefined): number {
    return FixedMath.toFloat(this.toAssetFromBToken(bTokens), this.config.decimals);
  }

  /**
   * Convert dTokens to their corresponding effective asset value as a floating point number.
   * This takes into account the liability factor.
   * @param dTokens - The number of dTokens to convert
   * @returns The liability amount in assets
   */
  public toEffectiveAssetFromDTokenFloat(dTokens: bigint | undefined): number {
    return FixedMath.toFloat(this.toEffectiveAssetFromDToken(dTokens), this.config.decimals);
  }

  /**
   * Convert bTokens to their corresponding effective asset value. This takes
   * into account the collateral factor
   * @param bTokens - The number of bTokens to convert
   * @returns The collateral amount in assets
   */
  public toEffectiveAssetFromBTokenFloat(bTokens: bigint | undefined): number {
    return FixedMath.toFloat(this.toEffectiveAssetFromBToken(bTokens), this.config.decimals);
  }

  /**
   * Convert an asset amount to dTokens taking the floor
   * @param asset - The asset amount to convert
   * @returns The number of dTokens
   */
  public toDTokensFromAssetFloor(asset: bigint | undefined): bigint {
    if (asset === undefined) {
      return BigInt(0);
    }
    return FixedMath.divFloor(asset, this.data.dRate, FixedMath.SCALAR_9);
  }

  /**
   * Convert an asset amount to dTokens taking the ceiling
   * @param asset - The asset amount to convert
   * @returns The number of dTokens
   */
  public toDTokensFromAssetCeil(asset: bigint | undefined): bigint {
    if (asset === undefined) {
      return BigInt(0);
    }
    return FixedMath.divCeil(asset, this.data.dRate, FixedMath.SCALAR_9);
  }

  /**
   * Convert an asset amount to bTokens taking the floor
   * @param asset - The asset amount to convert
   * @returns The number of bTokens
   */
  public toBTokensFromAssetFloor(asset: bigint | undefined): bigint {
    if (asset === undefined) {
      return BigInt(0);
    }
    return FixedMath.divFloor(asset, this.data.bRate, FixedMath.SCALAR_9);
  }

  /**
   * Convert an asset amount to bTokens taking the ceiling
   * @param asset - The asset amount to convert
   * @returns The number of bTokens
   */
  public toBTokensFromAssetCeil(asset: bigint | undefined): bigint {
    if (asset === undefined) {
      return BigInt(0);
    }
    return FixedMath.divCeil(asset, this.data.bRate, FixedMath.SCALAR_9);
  }
}
