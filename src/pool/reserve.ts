import { xdr } from 'stellar-base';
import { bigintToI128, scvalToBigInt, scvalToNumber } from '../scval_converter';

export type EstReserveData = {
  b_rate: number;
  d_rate: number;
  total_supply: number;
  total_liabilities: number;
  cur_apy: number;
  cur_util: number;
};

export class Reserve {
  constructor(
    public asset_id: string,
    public symbol: string,
    public pool_tokens: bigint,
    public config: ReserveConfig,
    public data: ReserveData
  ) {}

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
    let d_rate = Number(this.data.d_rate) / 1e9;
    let total_liabilities = (Number(this.data.d_supply) / 1e7) * d_rate;
    let b_rate =
      this.data.b_supply == BigInt(0)
        ? 1
        : (total_liabilities + Number(this.pool_tokens) / 1e7) / (Number(this.data.b_supply) / 1e7);
    let total_supply = (Number(this.data.b_supply) / 1e7) * b_rate;

    if (total_supply != 0) {
      let cur_apy: number;
      const cur_ir_mod = Number(this.data.ir_mod) / 1e9;
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
        ((timestamp != undefined ? timestamp - this.data.last_time : 0) / 31536000) * cur_apy + 1;
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
        b_rate,
        d_rate,
        total_supply,
        total_liabilities,
        cur_apy,
        cur_util,
      };
    } else {
      // total supply is zero, can't perform estimation
      return { b_rate, d_rate, total_supply, total_liabilities, cur_apy: base_rate, cur_util: 0 };
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

  static fromContractDataXDR(xdr_string: string): ReserveConfig {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      ?.val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('contract data value is not a map');
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
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'index':
          index = scvalToNumber(map_entry.val());
          break;
        case 'decimals':
          decimals = scvalToNumber(map_entry.val());
          break;
        case 'c_factor':
          c_factor = scvalToNumber(map_entry.val());
          break;
        case 'l_factor':
          l_factor = scvalToNumber(map_entry.val());
          break;
        case 'util':
          util = scvalToNumber(map_entry.val());
          break;
        case 'max_util':
          max_util = scvalToNumber(map_entry.val());
          break;
        case 'r_one':
          r_one = scvalToNumber(map_entry.val());
          break;
        case 'r_two':
          r_two = scvalToNumber(map_entry.val());
          break;
        case 'r_three':
          r_three = scvalToNumber(map_entry.val());
          break;
        case 'reactivity':
          reactivity = scvalToNumber(map_entry.val());
          break;
        default:
          throw Error('scvMap value malformed');
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
      throw Error('scvMap value malformed');
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

  static ReserveConfigToXDR(reserveConfig?: ReserveConfig): xdr.ScVal {
    if (!reserveConfig) {
      return xdr.ScVal.scvVoid();
    }
    const arr = [
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('c_factor'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.c_factor),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('decimals'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.decimals),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('index'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.index),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('l_factor'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.l_factor),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('max_util'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.max_util),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('r_one'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.r_one),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('r_three'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.r_three),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('r_two'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.r_two),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('reactivity'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.reactivity),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('util'),
        val: ((i) => xdr.ScVal.scvU32(i))(reserveConfig.util),
      }),
    ];
    return xdr.ScVal.scvMap(arr);
  }
}

export class ReserveData {
  constructor(
    public d_rate: bigint,
    public b_rate: bigint,
    public ir_mod: bigint,
    public b_supply: bigint,
    public d_supply: bigint,
    public backstop_credit: bigint,
    public last_time: number
  ) {}

  static fromContractDataXDR(xdr_string: string): ReserveData {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      ?.val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('contract data value is not a map');
    }

    let d_rate: bigint | undefined;
    let b_rate: bigint | undefined;
    let ir_mod: bigint | undefined;
    let b_supply: bigint | undefined;
    let d_supply: bigint | undefined;
    let backstop_credit: bigint | undefined;
    let last_time: number | undefined;
    for (const map_entry of data_entry_map) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'd_rate':
          d_rate = scvalToBigInt(map_entry.val());
          break;
        case 'b_rate':
          b_rate = scvalToBigInt(map_entry.val());
          break;
        case 'ir_mod':
          ir_mod = scvalToBigInt(map_entry.val());
          break;
        case 'b_supply':
          b_supply = scvalToBigInt(map_entry.val());
          break;
        case 'd_supply':
          d_supply = scvalToBigInt(map_entry.val());
          break;
        case 'backstop_credit':
          backstop_credit = scvalToBigInt(map_entry.val());
          break;
        case 'last_time':
          last_time = scvalToNumber(map_entry.val());
          break;
        default:
          throw Error(
            `scvMap value malformed: should not contain ${map_entry?.key()?.sym()?.toString()}`
          );
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
      throw Error('scvMap value malformed');
    }

    return new ReserveData(d_rate, b_rate, ir_mod, b_supply, d_supply, backstop_credit, last_time);
  }

  public ReserveDataToXDR(reserveData?: ReserveData): xdr.ScVal {
    if (!reserveData) {
      return xdr.ScVal.scvVoid();
    }
    const arr = [
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('b_supply'),
        val: ((i) => bigintToI128(i))(reserveData.b_supply),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('d_rate'),
        val: ((i) => bigintToI128(i))(reserveData.d_rate),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('d_supply'),
        val: ((i) => bigintToI128(i))(reserveData.d_supply),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('ir_mod'),
        val: ((i) => bigintToI128(i))(reserveData.ir_mod),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('last_time'),
        val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(reserveData.last_time),
      }),
    ];
    return xdr.ScVal.scvMap(arr);
  }
}
