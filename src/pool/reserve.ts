import { Address, SorobanRpc, scValToNative, xdr } from 'stellar-sdk';
import { Network, u32 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { TokenMetadata, getTokenBalance } from '../token.js';
import { EmissionConfig, EmissionData, Emissions } from '../emissions.js';

export type EstReserveData = {
  bRate: number;
  dRate: number;
  totalSupply: number;
  totalLiabilities: number;
  currentApy: number;
  currentUtil: number;
};

export class Reserve {
  constructor(
    public assetId: string,
    public tokenMetadata: TokenMetadata,
    public poolTokens: bigint,
    public config: ReserveConfig,
    public data: ReserveData,
    public supplyEmissions: Emissions | undefined,
    public borrowEmissions: Emissions | undefined
  ) {}

  /**
   * Load a Reserve from asset `assetId` from the pool `poolId` on the network `network`
   * @param network - The network configuration
   * @param poolId - The contract address of the Pool
   * @param assetId - The contract address of the Reserve asset
   * @returns A Reserve object
   */
  static async load(network: Network, poolId: string, assetId: string) {
    const sorobanRpc = new SorobanRpc.Server(network.rpc, network.opts);
    const reserveConfigKey = ReserveConfig.ledgerKey(poolId, assetId);
    const reserveDataKey = ReserveData.ledgerKey(poolId, assetId);
    const tokenInstanceKey = TokenMetadata.ledgerKey(assetId);

    const reserveLedgerEntries = await sorobanRpc.getLedgerEntries(
      tokenInstanceKey,
      reserveConfigKey,
      reserveDataKey
    );
    if (reserveLedgerEntries.entries.length != 3) {
      throw new Error('Unable to load reserve: missing ledger entries.');
    }

    let reserveConfig: ReserveConfig;
    let reserveData: ReserveData;
    let tokenMetadata: TokenMetadata;
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

    const poolTokens = await getTokenBalance(network, assetId, Address.fromString(poolId));
    const bTokenIndex = reserveConfig.index * 2 + 1;
    const dTokenIndex = reserveConfig.index * 2;
    const supplyEmisPromise = Emissions.load(
      network,
      ReserveEmissionConfig.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, bTokenIndex)
    );
    const borrowEmisPromise = Emissions.load(
      network,
      ReserveEmissionConfig.ledgerKey(poolId, dTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, dTokenIndex)
    );
    const [supplyEmissions, borrowEmissions] = await Promise.all([
      supplyEmisPromise,
      borrowEmisPromise,
    ]);

    if (
      assetId == undefined ||
      tokenMetadata == undefined ||
      poolTokens == undefined ||
      reserveConfig == undefined ||
      reserveData == undefined
    ) {
      throw Error('Unable to load reserve');
    }
    return new Reserve(
      assetId,
      tokenMetadata,
      poolTokens,
      reserveConfig,
      reserveData,
      supplyEmissions,
      borrowEmissions
    );
  }

  /**
   * Estimate the reserve data at a given block
   *
   * Translated from: https://github.com/blend-capital/blend-contracts/blob/main/lending-pool/src/reserve.rs#L113
   *
   * @param backstop_take_rate - The block number to accrue to, or undefined to remain at the Reserve's last block
   * @param timestamp - The timestamp to accrue to, or undefined to remain at the Reserve's last block
   * @returns The estimated b_rate, d_rate, and cur_apy (as decimal)
   */
  public estimateData(backstop_take_rate: number, timestamp: number | undefined): EstReserveData {
    const base_rate = 0.01; // base rate
    const scaler = 10 ** this.config.decimals;
    let d_rate = Number(this.data.dRate) / 1e9;
    let total_liabilities = (Number(this.data.dSupply) / scaler) * d_rate;
    let b_rate =
      this.data.bSupply == BigInt(0)
        ? 1
        : (total_liabilities + Number(this.poolTokens) / scaler) /
          (Number(this.data.bSupply) / scaler);
    let total_supply = (Number(this.data.bSupply) / scaler) * b_rate;

    if (total_supply != 0) {
      let cur_apy: number;
      const cur_ir_mod = Number(this.data.interestRateModifier) / 1e9;
      const cur_util = total_liabilities / total_supply;
      const target_util = this.config.util / 1e7;
      if (cur_util <= target_util) {
        cur_apy = (cur_util / target_util) * (this.config.r_one / 1e7) + base_rate;
        cur_apy *= cur_ir_mod;
      } else if (target_util < cur_util && cur_util <= 0.95) {
        cur_apy =
          ((cur_util - target_util) / (0.95 - target_util)) * (this.config.r_two / 1e7) +
          this.config.r_one / 1e7 +
          base_rate;
        cur_apy *= cur_ir_mod;
      } else {
        cur_apy =
          ((cur_util - 0.95) / 0.05) * (this.config.r_three / 1e7) +
          cur_ir_mod * (this.config.r_two / 1e7 + this.config.r_one / 1e7 + base_rate);
      }
      const accrual =
        ((timestamp != undefined ? timestamp - Number(this.data.lastTime) : 0) / 31536000) *
          cur_apy +
        1;
      if (backstop_take_rate > 0) {
        const b_accrual = (accrual - 1) * cur_util;
        total_supply *= b_accrual * backstop_take_rate + 1;
        b_rate *= b_accrual * (1 - backstop_take_rate) + 1;
      } else {
        const b_accrual = (accrual - 1) * cur_util;
        total_supply *= b_accrual + 1;
        b_rate *= b_accrual + 1;
      }
      total_liabilities *= accrual;
      d_rate *= accrual;
      return {
        bRate: b_rate,
        dRate: d_rate,
        totalSupply: total_supply,
        totalLiabilities: total_liabilities,
        currentApy: cur_apy,
        currentUtil: cur_util,
      };
    } else {
      // total supply is zero, can't perform estimation
      return {
        bRate: b_rate,
        dRate: d_rate,
        totalSupply: total_supply,
        totalLiabilities: total_liabilities,
        currentApy: base_rate,
        currentUtil: 0,
      };
    }
  }
}

/********** LedgerDataEntry Helpers **********/

export class ReserveConfig {
  constructor(
    public index: number,
    public decimals: number,
    public c_factor: number,
    public l_factor: number,
    public util: number,
    public max_util: number,
    public r_one: number,
    public r_two: number,
    public r_three: number,
    public reactivity: number
  ) {}

  static ledgerKey(poolId: string, assetId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('ResConfig'),
      Address.fromString(assetId).toScVal(),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): ReserveConfig {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('ReserveConfig contract data value is not a map');
    }

    let index: number | undefined;
    let decimals: number | undefined;
    let c_factor: number | undefined;
    let l_factor: number | undefined;
    let util: number | undefined;
    let max_util: number | undefined;
    let r_one: number | undefined;
    let r_two: number | undefined;
    let r_three: number | undefined;
    let reactivity: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'decimals':
          decimals = scValToNative(map_entry.val());
          break;
        case 'c_factor':
          c_factor = scValToNative(map_entry.val());
          break;
        case 'l_factor':
          l_factor = scValToNative(map_entry.val());
          break;
        case 'util':
          util = scValToNative(map_entry.val());
          break;
        case 'max_util':
          max_util = scValToNative(map_entry.val());
          break;
        case 'r_one':
          r_one = scValToNative(map_entry.val());
          break;
        case 'r_two':
          r_two = scValToNative(map_entry.val());
          break;
        case 'r_three':
          r_three = scValToNative(map_entry.val());
          break;
        case 'reactivity':
          reactivity = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid ReserveConfig key should not contain ${key}`);
      }
    }

    if (
      index == undefined ||
      c_factor == undefined ||
      decimals == undefined ||
      index == undefined ||
      l_factor == undefined ||
      max_util == undefined ||
      r_one == undefined ||
      r_three == undefined ||
      r_two == undefined ||
      reactivity == undefined ||
      util == undefined
    ) {
      throw Error('ReserveConfig scvMap value malformed');
    }
    return new ReserveConfig(
      index,
      decimals,
      c_factor,
      l_factor,
      util,
      max_util,
      r_one,
      r_two,
      r_three,
      reactivity
    );
  }
}

export class ReserveData {
  constructor(
    public dRate: bigint,
    public bRate: bigint,
    public interestRateModifier: bigint,
    public bSupply: bigint,
    public dSupply: bigint,
    public backstopCredit: bigint,
    public lastTime: bigint
  ) {}

  static ledgerKey(poolId: string, assetId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('ResData'),
      Address.fromString(assetId).toScVal(),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): ReserveData {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();

    if (data_entry_map == undefined) {
      throw Error('ReserveData contract data value is not a map');
    }

    let d_rate: bigint | undefined;
    let b_rate: bigint | undefined;
    let ir_mod: bigint | undefined;
    let b_supply: bigint | undefined;
    let d_supply: bigint | undefined;
    let backstop_credit: bigint | undefined;
    let last_time: bigint | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'd_rate':
          d_rate = scValToNative(map_entry.val());
          break;
        case 'b_rate':
          b_rate = scValToNative(map_entry.val());
          break;
        case 'ir_mod':
          ir_mod = scValToNative(map_entry.val());
          break;
        case 'b_supply':
          b_supply = scValToNative(map_entry.val());
          break;
        case 'd_supply':
          d_supply = scValToNative(map_entry.val());
          break;
        case 'backstop_credit':
          backstop_credit = scValToNative(map_entry.val());
          break;
        case 'last_time':
          last_time = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid ReserveData key should not contain ${key}`);
      }
    }

    if (
      d_rate == undefined ||
      b_rate == undefined ||
      ir_mod == undefined ||
      b_supply == undefined ||
      d_supply == undefined ||
      backstop_credit == undefined ||
      last_time == undefined
    ) {
      throw Error('Error: ReserveData scvMap value malformed');
    }

    return new ReserveData(d_rate, b_rate, ir_mod, b_supply, d_supply, backstop_credit, last_time);
  }
}

export class ReserveEmissionConfig extends EmissionConfig {
  static ledgerKey(poolId: string, reserveIndex: u32): xdr.LedgerKey {
    const res: xdr.ScVal[] = [xdr.ScVal.scvSymbol('EmisConfig'), xdr.ScVal.scvU32(reserveIndex)];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }
}

export class ReserveEmissionData extends EmissionData {
  static ledgerKey(poolId: string, reserveIndex: u32): xdr.LedgerKey {
    const res: xdr.ScVal[] = [xdr.ScVal.scvSymbol('EmisData'), xdr.ScVal.scvU32(reserveIndex)];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }
}
