import { SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import * as FixedMath from '../math.js';
import { TokenMetadata } from '../token.js';
import { ReserveEmissions } from './reserve_emissions.js';
import { ReserveConfig, ReserveData } from './reserve_types.js';

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
   * @param timestamp - The timestamp to project the Reserve data to (in seconds since epoch)
   * @returns A Reserve object
   */
  static async load(
    network: Network,
    poolId: string,
    backstopTakeRate: bigint,
    assetId: string,
    timestamp?: number
  ): Promise<Reserve> {
    const sorobanRpc = new SorobanRpc.Server(network.rpc, network.opts);

    const ledgerKeys: xdr.LedgerKey[] = [
      ReserveConfig.ledgerKey(poolId, assetId),
      TokenMetadata.ledgerKey(assetId),
      ReserveData.ledgerKey(poolId, assetId),
    ];
    const reserveLedgerEntries = await sorobanRpc.getLedgerEntries(...ledgerKeys);

    // not all reserves have emissions, but the first 3 entries are required
    if (reserveLedgerEntries.entries.length < 3) {
      throw new Error('Unable to load reserve: missing ledger entries.');
    }

    let reserveConfig: ReserveConfig | undefined;
    let reserveData: ReserveData | undefined;
    let tokenMetadata: TokenMetadata | undefined;
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
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    if (tokenMetadata == undefined || reserveConfig == undefined || reserveData == undefined) {
      throw new Error('Unable to load reserve: missing data.');
    }

    const reserve = new Reserve(
      poolId,
      assetId,
      tokenMetadata,
      reserveConfig,
      reserveData,
      reserveLedgerEntries.latestLedger,
      0,
      0
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
  public accrue(backstopTakeRate: bigint, timestamp = Math.floor(Date.now() / 1000)) {
    const curUtilFloat = this.getUtilization();
    const curUtil = FixedMath.toFixed(curUtilFloat);
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
    this.supplyApr = this.borrowApr * curUtilFloat;

    // update rate_modifier on reserve data
    const deltaTimeScaled = FixedMath.toFixed(timestamp - this.data.lastTime);
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

  /**
   * Load the emissions data for the Reserve
   * @param network - The network configuration
   * @returns The ReserveEmissions object, or undefined if no emissions are found
   */
  public async loadEmissions(network: Network): Promise<ReserveEmissions | undefined> {
    const reserveEmissions = await ReserveEmissions.load(
      network,
      this.poolId,
      this.config.index,
      this.data.bSupply,
      this.data.dSupply,
      this.config.decimals
    );
    if (reserveEmissions.supply === undefined && reserveEmissions.borrow === undefined) {
      return undefined;
    }
    return reserveEmissions;
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

  /**
   * Get the utilization of the Reserve as a floating point number
   */
  public getUtilization(): number {
    const totalSupply = this.totalSupply();
    if (totalSupply === BigInt(0)) {
      return 0;
    } else {
      return Number(this.totalLiabilities()) / Number(totalSupply);
    }
  }

  /**
   * Get the total supply of the Reserve
   */
  public totalSupply(): bigint {
    return this.toAssetFromBToken(this.data.bSupply);
  }

  /**
   * Get the total liabilities of the Reserve
   */
  public totalLiabilities(): bigint {
    return this.toAssetFromDToken(this.data.dSupply);
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
   * Convert dTokens to assets as a floating point number
   * @param dTokens - The number of dTokens to convert
   * @returns The asset amount
   */
  public toAssetFromBTokenFloat(dTokens: bigint | undefined): number {
    return FixedMath.toFloat(this.toAssetFromBToken(dTokens), this.config.decimals);
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
