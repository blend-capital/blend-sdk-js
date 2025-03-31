import { rpc, xdr } from '@stellar/stellar-sdk';
import {
  EmissionConfig,
  EmissionData,
  EmissionDataV2,
  Emissions,
  EmissionsV1,
  EmissionsV2,
} from '../emissions.js';
import { Network, Version } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import * as FixedMath from '../math.js';
import {
  getEmissionIndex,
  getReserveId,
  ReserveConfig,
  ReserveConfigV2,
  ReserveData,
  ReserveEmissionConfig,
  ReserveEmissionData,
} from './reserve_types.js';

/**
 * Manage ledger data for a reserve in a Blend pool
 */
export abstract class Reserve {
  constructor(
    /**
     * The contract address of the Pool the reserve belongs to
     */
    public poolId: string,
    /**
     * The contract address of the Reserve asset
     */
    public assetId: string,
    /**
     * The configuration of the Reserve
     */
    public config: ReserveConfig,
    /**
     * The data of the Reserve
     */
    public data: ReserveData,
    /**
     * The borrow emissions for the Reserve. This will be undefined if there are no borrow emissions
     */
    public borrowEmissions: Emissions | undefined,
    /**
     * The supply emissions for the Reserve. This will be undefined if there are no supply emissions
     */
    public supplyEmissions: Emissions | undefined,
    /**
     * The current APR being charged to borrowers
     */
    public borrowApr: number,
    /**
     * The estimated APY for borrowers based on the current APR and
     * a daily compounding period
     */
    public estBorrowApy: number,
    /**
     * The current APR being earned by suppliers
     */
    public supplyApr: number,
    /**
     * The estimated APY for suppliers based on the current APR and
     * a weekly compounding period
     */
    public estSupplyApy: number,
    /**
     * The ledger number of the latest ledger entry
     */
    public latestLedger: number
  ) {}

  /**
   * The decimals used for b and d rate values
   */
  abstract readonly rateDecimals: number;

  /**
   * The decimals used for the IR modifier value
   */
  abstract readonly irmodDecimals: number;

  /**
   * The version of the reserve
   */
  abstract readonly version: Version;

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
    return FixedMath.mulCeil(dTokens, this.data.dRate, FixedMath.toFixed(1, this.rateDecimals));
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
    return FixedMath.mulFloor(bTokens, this.data.bRate, FixedMath.toFixed(1, this.rateDecimals));
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
    return FixedMath.divFloor(asset, this.data.dRate, FixedMath.toFixed(1, this.rateDecimals));
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
    return FixedMath.divCeil(asset, this.data.dRate, FixedMath.toFixed(1, this.rateDecimals));
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
    return FixedMath.divFloor(asset, this.data.bRate, FixedMath.toFixed(1, this.rateDecimals));
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
    return FixedMath.divCeil(asset, this.data.bRate, FixedMath.toFixed(1, this.rateDecimals));
  }

  /********** Math Helpers **********/

  /**
   * Set the borrow and supply APRs and APYs based on the current state of the Reserve
   *
   * @param backstopTakeRate - The backstop take rate (as a fixed point number w/ 7 decimals)
   * @returns the APR as a bigint with 7 decimals.
   */
  public setRates(backstopTakeRate: bigint): bigint {
    const curUtil = this.getUtilization();
    if (curUtil === BigInt(0)) {
      this.borrowApr = FixedMath.toFloat(BigInt(this.config.r_base), 7);
      this.supplyApr = 0;
      return 0n;
    }

    const IR_MOD_SCALAR = FixedMath.toFixed(1, this.irmodDecimals);

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
      curIr = FixedMath.mulCeil(baseRate, this.data.interestRateModifier, IR_MOD_SCALAR);
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
      curIr = FixedMath.mulCeil(baseRate, this.data.interestRateModifier, IR_MOD_SCALAR);
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
        IR_MOD_SCALAR
      );
      curIr = extraRate + intersection;
    }
    const borrowApr = FixedMath.toFloat(curIr, 7);
    const supplyCapture = FixedMath.mulFloor(
      FixedMath.SCALAR_7 - backstopTakeRate,
      curUtil,
      FixedMath.SCALAR_7
    );
    const supplyApr = FixedMath.toFloat(
      FixedMath.mulFloor(curIr, supplyCapture, FixedMath.SCALAR_7),
      7
    );

    // est borrow apy at a higher compounding rate than supply such that each is a "safer" estimate
    // for the user
    const estBorrowApy = (1 + borrowApr / 365) ** 365 - 1;
    const estSupplyApy = (1 + supplyApr / 52) ** 52 - 1;

    this.borrowApr = borrowApr;
    this.supplyApr = supplyApr;
    this.estBorrowApy = estBorrowApy;
    this.estSupplyApy = estSupplyApy;
    return curIr;
  }

  /**
   * Accrue interest on the Reserve to the given timestamp, or now if no timestamp is provided.
   *
   * Calls `setRates` internally and updates ReserveData based on the accrual.
   *
   * @param backstopTakeRate - The backstop take rate (as a fixed point number)
   * @param timestamp - The timestamp to accrue interest to (in seconds since epoch)
   */
  public accrue(backstopTakeRate: bigint, timestamp?: number | undefined): void {
    if (timestamp === undefined) {
      timestamp = Math.floor(Date.now() / 1000);
    }

    const curIr = this.setRates(backstopTakeRate);
    const curUtil = this.getUtilization();
    if (curUtil === BigInt(0)) {
      this.data.lastTime = timestamp;
      return;
    }

    const IR_MOD_SCALAR = FixedMath.toFixed(1, this.irmodDecimals);
    const RATE_SCALAR = FixedMath.toFixed(1, this.rateDecimals);
    const targetUtil = BigInt(this.config.util);

    // update rate_modifier on reserve data
    const deltaTime = timestamp - this.data.lastTime;
    if (deltaTime <= 0) {
      return;
    }
    if (curUtil > targetUtil) {
      // rate modifier increasing - scale to IR_MOD_SCALAR
      const utilDif = FixedMath.mulFloor(IR_MOD_SCALAR, curUtil - targetUtil, FixedMath.SCALAR_7);
      // util and reactivity are 7 decimals
      const utilError = BigInt(deltaTime) * utilDif;
      const rateDif = FixedMath.mulFloor(
        utilError,
        BigInt(this.config.reactivity),
        FixedMath.SCALAR_7
      );
      const nextIrMod = this.data.interestRateModifier + rateDif;
      const irModMax = BigInt(10) * IR_MOD_SCALAR;
      this.data.interestRateModifier = nextIrMod > irModMax ? irModMax : nextIrMod;
    } else if (curUtil < targetUtil) {
      // rate modifier decreasing - scale to IR_MOD_SCALAR
      const utilDif = FixedMath.mulFloor(IR_MOD_SCALAR, targetUtil - curUtil, FixedMath.SCALAR_7);
      // util and reactivity are 7 decimals
      const utilError = BigInt(deltaTime) * utilDif;
      const rateDif = FixedMath.mulCeil(
        utilError,
        BigInt(this.config.reactivity),
        FixedMath.SCALAR_7
      );
      const nextIrMod = this.data.interestRateModifier - rateDif;
      const irModMin = IR_MOD_SCALAR / 10n;
      this.data.interestRateModifier = nextIrMod < irModMin ? irModMin : nextIrMod;
    }

    // calc accrual amount over blocks
    // scale time weight to RATE_SCALAR
    const timeWeight = (BigInt(deltaTime) * RATE_SCALAR) / BigInt(31536000);
    // curIr is 7 decimals
    const accrualRate = RATE_SCALAR + FixedMath.mulCeil(timeWeight, curIr, FixedMath.SCALAR_7);

    // apply accrual to reserveData
    const preUpdateSupply = this.totalSupply();
    const preUpdateLiabilities = this.totalLiabilities();

    this.data.dRate = FixedMath.mulCeil(accrualRate, this.data.dRate, RATE_SCALAR);

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
        RATE_SCALAR
      );
    }
    this.data.lastTime = timestamp;
  }
}

export class ReserveV1 extends Reserve {
  readonly rateDecimals: number = 9;
  readonly irmodDecimals: number = 9;
  readonly version: Version = Version.V1;

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
    const stellarRpc = new rpc.Server(network.rpc, network.opts);

    const dTokenIndex = index * 2;
    const bTokenIndex = index * 2 + 1;
    const ledgerKeys: xdr.LedgerKey[] = [
      ReserveConfig.ledgerKey(poolId, assetId),
      ReserveData.ledgerKey(poolId, assetId),
      ReserveEmissionConfig.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionConfig.ledgerKey(poolId, dTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, dTokenIndex),
    ];
    const reserveLedgerEntries = await stellarRpc.getLedgerEntries(...ledgerKeys);

    // not all reserves have emissions, but the first 2 entries are required
    if (reserveLedgerEntries.entries.length < 2) {
      throw new Error('Unable to load reserve: missing ledger entries.');
    }

    let reserveConfig: ReserveConfig | undefined;
    let reserveData: ReserveData | undefined;
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
        case `EmisConfig`: {
          const index = getEmissionIndex(ledgerEntry);
          if (index % 2 == 0) {
            emissionBorrowConfig = EmissionConfig.fromLedgerEntryData(ledgerEntry);
          } else {
            emissionSupplyConfig = EmissionConfig.fromLedgerEntryData(ledgerEntry);
          }
          break;
        }
        case `EmisData`: {
          const index = getEmissionIndex(ledgerEntry);
          if (index % 2 == 0) {
            emissionBorrowData = EmissionData.fromLedgerEntryData(ledgerEntry);
          } else {
            emissionSupplyData = EmissionData.fromLedgerEntryData(ledgerEntry);
          }
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    if (reserveConfig == undefined || reserveData == undefined) {
      throw new Error('Unable to load reserve: missing data.');
    }

    let borrowEmissions: Emissions | undefined = undefined;
    if (emissionBorrowConfig && emissionBorrowData) {
      borrowEmissions = new EmissionsV1(
        emissionBorrowConfig,
        emissionBorrowData,
        reserveLedgerEntries.latestLedger
      );
      borrowEmissions.accrue(reserveData.dSupply, reserveConfig.decimals, timestamp);
    }

    let supplyEmissions: Emissions | undefined = undefined;
    if (emissionSupplyConfig && emissionSupplyData) {
      supplyEmissions = new EmissionsV1(
        emissionSupplyConfig,
        emissionSupplyData,
        reserveLedgerEntries.latestLedger
      );
      supplyEmissions.accrue(reserveData.bSupply, reserveConfig.decimals, timestamp);
    }

    const reserve = new ReserveV1(
      poolId,
      assetId,
      reserveConfig,
      reserveData,
      borrowEmissions,
      supplyEmissions,
      0,
      0,
      0,
      0,
      reserveLedgerEntries.latestLedger
    );
    reserve.accrue(backstopTakeRate, timestamp);
    return reserve;
  }

  static async loadList(
    network: Network,
    poolId: string,
    backstopTakeRate: bigint,
    reserveList: string[],
    timestamp?: number
  ): Promise<Reserve[]> {
    const reserves = new Array<Reserve>();
    const stellarRpc = new rpc.Server(network.rpc, network.opts);

    const ledgerKeys: xdr.LedgerKey[] = [];
    for (const [index, reserveId] of reserveList.entries()) {
      const dTokenIndex = index * 2;
      const bTokenIndex = index * 2 + 1;
      ledgerKeys.push(
        ...[
          ReserveConfig.ledgerKey(poolId, reserveId),
          ReserveData.ledgerKey(poolId, reserveId),
          ReserveEmissionConfig.ledgerKey(poolId, bTokenIndex),
          ReserveEmissionData.ledgerKey(poolId, bTokenIndex),
          ReserveEmissionConfig.ledgerKey(poolId, dTokenIndex),
          ReserveEmissionData.ledgerKey(poolId, dTokenIndex),
        ]
      );
    }

    const reserveLedgerEntries = await stellarRpc.getLedgerEntries(...ledgerKeys);

    const reserveConfigMap: Map<string, ReserveConfig> = new Map();
    const reserveDataMap: Map<string, ReserveData> = new Map();
    const emissionConfigMap: Map<number, EmissionConfig> = new Map();
    const emissionDataMap: Map<number, EmissionData> = new Map();

    for (const entry of reserveLedgerEntries.entries) {
      const ledgerEntry = entry.val;
      const key = decodeEntryKey(ledgerEntry.contractData().key());
      switch (key) {
        case 'ResConfig': {
          const reserveId = getReserveId(ledgerEntry);
          reserveConfigMap.set(reserveId, ReserveConfig.fromLedgerEntryData(ledgerEntry));
          break;
        }
        case 'ResData': {
          const reserveId = getReserveId(ledgerEntry);
          reserveDataMap.set(reserveId, ReserveData.fromLedgerEntryData(ledgerEntry));
          break;
        }
        case `EmisConfig`: {
          const emissionIndex = getEmissionIndex(ledgerEntry);
          emissionConfigMap.set(emissionIndex, EmissionConfig.fromLedgerEntryData(ledgerEntry));
          break;
        }
        case `EmisData`: {
          const emissionIndex = getEmissionIndex(ledgerEntry);
          emissionDataMap.set(emissionIndex, EmissionData.fromLedgerEntryData(ledgerEntry));
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    for (const [index, reserveId] of reserveList.entries()) {
      const reserveConfig = reserveConfigMap.get(reserveId);
      const reserveData = reserveDataMap.get(reserveId);
      if (reserveConfig == undefined || reserveData == undefined) {
        throw new Error('Unable to load reserve: missing data.');
      }
      const dTokenIndex = index * 2;
      const bTokenIndex = index * 2 + 1;
      const emissionBorrowConfig = emissionConfigMap.get(dTokenIndex);
      const emissionBorrowData = emissionDataMap.get(dTokenIndex);
      const emissionSupplyConfig = emissionConfigMap.get(bTokenIndex);
      const emissionSupplyData = emissionDataMap.get(bTokenIndex);

      let borrowEmissions: Emissions | undefined = undefined;
      if (emissionBorrowConfig && emissionBorrowData) {
        borrowEmissions = new EmissionsV1(
          emissionBorrowConfig,
          emissionBorrowData,
          reserveLedgerEntries.latestLedger
        );
        borrowEmissions.accrue(reserveData.dSupply, reserveConfig.decimals, timestamp);
      }
      let supplyEmissions: Emissions | undefined = undefined;
      if (emissionSupplyConfig && emissionSupplyData) {
        supplyEmissions = new EmissionsV1(
          emissionSupplyConfig,
          emissionSupplyData,
          reserveLedgerEntries.latestLedger
        );
        supplyEmissions.accrue(reserveData.bSupply, reserveConfig.decimals, timestamp);
      }
      const reserve = new ReserveV1(
        poolId,
        reserveId,
        reserveConfig,
        reserveData,
        borrowEmissions,
        supplyEmissions,
        0,
        0,
        0,
        0,
        reserveLedgerEntries.latestLedger
      );
      reserve.accrue(backstopTakeRate, timestamp);
      reserves.push(reserve);
    }
    return reserves;
  }
}

export class ReserveV2 extends Reserve {
  readonly rateDecimals: number = 12;
  readonly irmodDecimals: number = 7;
  readonly version: Version = Version.V2;

  /**
   * Load a Reserve from asset `assetId` from the pool `poolId` on the network `network`
   * @param network - The network configuration
   * @param poolId - The contract address of the Pool
   * @param backstopTakeRate - The backstop take rate of the pool
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
    const stellarRpc = new rpc.Server(network.rpc, network.opts);

    const dTokenIndex = index * 2;
    const bTokenIndex = index * 2 + 1;
    const ledgerKeys: xdr.LedgerKey[] = [
      ReserveConfig.ledgerKey(poolId, assetId),
      ReserveData.ledgerKey(poolId, assetId),
      ReserveEmissionData.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, dTokenIndex),
    ];
    const reserveLedgerEntries = await stellarRpc.getLedgerEntries(...ledgerKeys);

    // not all reserves have emissions, but the first 2 entries are required
    if (reserveLedgerEntries.entries.length < 2) {
      throw new Error('Unable to load reserve: missing ledger entries.');
    }

    let reserveConfig: ReserveConfig | undefined;
    let reserveData: ReserveData | undefined;
    let emissionBorrowData: EmissionDataV2 | undefined;
    let emissionSupplyData: EmissionDataV2 | undefined;
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

        case `EmisData`: {
          const index = getEmissionIndex(ledgerEntry);
          if (index % 2 == 0) {
            emissionBorrowData = EmissionDataV2.fromLedgerEntryData(ledgerEntry);
          } else {
            emissionSupplyData = EmissionDataV2.fromLedgerEntryData(ledgerEntry);
          }
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    if (reserveConfig == undefined || reserveData == undefined) {
      throw new Error('Unable to load reserve: missing data.');
    }

    let borrowEmissions: Emissions | undefined = undefined;
    if (emissionBorrowData) {
      borrowEmissions = new EmissionsV2(emissionBorrowData, reserveLedgerEntries.latestLedger);
      borrowEmissions.accrue(reserveData.dSupply, reserveConfig.decimals, timestamp);
    }

    let supplyEmissions: Emissions | undefined = undefined;
    if (emissionSupplyData) {
      supplyEmissions = new EmissionsV2(emissionSupplyData, reserveLedgerEntries.latestLedger);
      supplyEmissions.accrue(reserveData.bSupply, reserveConfig.decimals, timestamp);
    }

    const reserve = new ReserveV2(
      poolId,
      assetId,
      reserveConfig,
      reserveData,
      borrowEmissions,
      supplyEmissions,
      0,
      0,
      0,
      0,
      reserveLedgerEntries.latestLedger
    );
    reserve.accrue(backstopTakeRate, timestamp);
    return reserve;
  }

  static async loadList(
    network: Network,
    poolId: string,
    backstopTakeRate: bigint,
    reserveList: string[],
    timestamp?: number
  ): Promise<Reserve[]> {
    const reserves = new Array<Reserve>();
    const stellarRpc = new rpc.Server(network.rpc, network.opts);

    const ledgerKeys: xdr.LedgerKey[] = [];
    for (const [index, reserveId] of reserveList.entries()) {
      const dTokenIndex = index * 2;
      const bTokenIndex = index * 2 + 1;
      ledgerKeys.push(
        ...[
          ReserveConfigV2.ledgerKey(poolId, reserveId),
          ReserveData.ledgerKey(poolId, reserveId),
          ReserveEmissionConfig.ledgerKey(poolId, bTokenIndex),
          ReserveEmissionData.ledgerKey(poolId, bTokenIndex),
          ReserveEmissionConfig.ledgerKey(poolId, dTokenIndex),
          ReserveEmissionData.ledgerKey(poolId, dTokenIndex),
        ]
      );
    }

    const reserveLedgerEntries = await stellarRpc.getLedgerEntries(...ledgerKeys);

    const reserveConfigMap: Map<string, ReserveConfigV2> = new Map();
    const reserveDataMap: Map<string, ReserveData> = new Map();
    const emissionDataMap: Map<number, EmissionDataV2> = new Map();

    for (const entry of reserveLedgerEntries.entries) {
      const ledgerEntry = entry.val;
      const key = decodeEntryKey(ledgerEntry.contractData().key());
      switch (key) {
        case 'ResConfig': {
          const reserveId = getReserveId(ledgerEntry);
          reserveConfigMap.set(reserveId, ReserveConfigV2.fromLedgerEntryData(ledgerEntry));
          break;
        }
        case 'ResData': {
          const reserveId = getReserveId(ledgerEntry);
          reserveDataMap.set(reserveId, ReserveData.fromLedgerEntryData(ledgerEntry));
          break;
        }

        case `EmisData`: {
          const emissionIndex = getEmissionIndex(ledgerEntry);
          emissionDataMap.set(emissionIndex, EmissionDataV2.fromLedgerEntryData(ledgerEntry));
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    for (const [index, reserveId] of reserveList.entries()) {
      const reserveConfig = reserveConfigMap.get(reserveId);
      const reserveData = reserveDataMap.get(reserveId);
      if (reserveConfig == undefined || reserveData == undefined) {
        throw new Error('Unable to load reserve: missing data.');
      }
      const dTokenIndex = index * 2;
      const bTokenIndex = index * 2 + 1;
      const emissionBorrowData = emissionDataMap.get(dTokenIndex);
      const emissionSupplyData = emissionDataMap.get(bTokenIndex);

      let borrowEmissions: Emissions | undefined = undefined;
      if (emissionBorrowData) {
        borrowEmissions = new EmissionsV2(emissionBorrowData, reserveLedgerEntries.latestLedger);
        borrowEmissions.accrue(reserveData.dSupply, reserveConfig.decimals, timestamp);
      }
      let supplyEmissions: Emissions | undefined = undefined;
      if (emissionSupplyData) {
        supplyEmissions = new EmissionsV2(emissionSupplyData, reserveLedgerEntries.latestLedger);
        supplyEmissions.accrue(reserveData.bSupply, reserveConfig.decimals, timestamp);
      }
      const reserve = new ReserveV2(
        poolId,
        reserveId,
        reserveConfig,
        reserveData,
        borrowEmissions,
        supplyEmissions,
        0,
        0,
        0,
        0,
        reserveLedgerEntries.latestLedger
      );
      reserve.accrue(backstopTakeRate, timestamp);
      reserves.push(reserve);
    }
    return reserves;
  }
}
