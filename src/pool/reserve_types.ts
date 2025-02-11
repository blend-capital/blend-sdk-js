import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import {
  EmissionConfig,
  EmissionData,
  EmissionDataV2,
  Emissions,
  EmissionsV2,
} from '../emissions.js';
import { i128, Network, Reserve, ReserveV1, u32, Version } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export class ReserveConfig {
  constructor(
    public index: number,
    public decimals: number,
    public c_factor: number,
    public l_factor: number,
    public util: number,
    public max_util: number,
    public r_base: number,
    public r_one: number,
    public r_two: number,
    public r_three: number,
    public reactivity: number
  ) {}

  static async load(network: Network, poolId: string, assetId: string): Promise<ReserveConfig> {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const ledger_key = this.ledgerKey(poolId, assetId);
    const result = await stellarRpc.getLedgerEntries(ledger_key);
    if (result.entries.length > 0) {
      return this.fromLedgerEntryData(result.entries[0].val);
    } else {
      throw Error(`Unable to find ReserveConfig with key: ${ledger_key.toXDR('base64')}`);
    }
  }

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

    const as_scval = ledger_entry_data.contractData().val();
    if (as_scval === undefined) {
      throw Error('ReserveConfig contract data value invalid');
    }
    return this.fromScVal(as_scval);
  }

  static fromScVal(scval_data: xdr.ScVal | string): ReserveConfig {
    if (typeof scval_data == 'string') {
      scval_data = xdr.ScVal.fromXDR(scval_data, 'base64');
    }

    const data_entry_map = scval_data.map();
    if (data_entry_map == undefined) {
      throw Error('ReserveConfig contract data value is not a map');
    }

    let index: number | undefined;
    let decimals: number | undefined;
    let c_factor: number | undefined;
    let l_factor: number | undefined;
    let util: number | undefined;
    let max_util: number | undefined;
    let r_base: number | undefined;
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
        case 'r_base':
          r_base = scValToNative(map_entry.val());
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
      r_base,
      r_one,
      r_two,
      r_three,
      reactivity
    );
  }
}

export class ReserveConfigV2 extends ReserveConfig {
  constructor(
    public index: number,
    public decimals: number,
    public c_factor: number,
    public l_factor: number,
    public util: number,
    public max_util: number,
    public r_base: number,
    public r_one: number,
    public r_two: number,
    public r_three: number,
    public reactivity: number,
    public collateral_cap: bigint,
    public enabled: boolean
  ) {
    super(
      index,
      decimals,
      c_factor,
      l_factor,
      util,
      max_util,
      r_base,
      r_one,
      r_two,
      r_three,
      reactivity
    );
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): ReserveConfigV2 {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const as_scval = ledger_entry_data.contractData().val();
    if (as_scval === undefined) {
      throw Error('ReserveConfig contract data value invalid');
    }
    return this.fromScVal(as_scval);
  }

  static fromScVal(scval_data: xdr.ScVal | string): ReserveConfigV2 {
    if (typeof scval_data == 'string') {
      scval_data = xdr.ScVal.fromXDR(scval_data, 'base64');
    }
    const data_entry_map = scval_data.map();
    if (data_entry_map == undefined) {
      throw Error('ReserveConfig contract data value is not a map');
    }

    let index: number | undefined;
    let decimals: number | undefined;
    let c_factor: number | undefined;
    let l_factor: number | undefined;
    let util: number | undefined;
    let max_util: number | undefined;
    let r_base: number | undefined;
    let r_one: number | undefined;
    let r_two: number | undefined;
    let r_three: number | undefined;
    let reactivity: number | undefined;
    let collateral_cap: bigint | undefined;
    let enabled: boolean | undefined;
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
        case 'r_base':
          r_base = scValToNative(map_entry.val());
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
        case 'collateral_cap':
          collateral_cap = scValToNative(map_entry.val());
          break;
        case 'enabled':
          enabled = scValToNative(map_entry.val());
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
      util == undefined ||
      collateral_cap == undefined ||
      enabled == undefined
    ) {
      throw Error('ReserveConfig scvMap value malformed');
    }

    return new ReserveConfigV2(
      index,
      decimals,
      c_factor,
      l_factor,
      util,
      max_util,
      r_base,
      r_one,
      r_two,
      r_three,
      reactivity,
      collateral_cap,
      enabled
    );
  }
}

export class ReserveData {
  constructor(
    public dRate: bigint,
    public bRate: bigint,
    public interestRateModifier: bigint,
    public dSupply: bigint,
    public bSupply: bigint,
    public backstopCredit: bigint,
    public lastTime: number
  ) {}

  static async load(network: Network, poolId: string, assetId: string): Promise<ReserveData> {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const ledger_key = this.ledgerKey(poolId, assetId);
    const result = await stellarRpc.getLedgerEntries(ledger_key);
    if (result.entries.length > 0) {
      return this.fromLedgerEntryData(result.entries[0].val);
    } else {
      throw Error(`Unable to find ReserveData with key: ${ledger_key.toXDR('base64')}`);
    }
  }

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

    const reserve_scval = ledger_entry_data.contractData().val();
    const reserveData = ReserveData.fromScVal(reserve_scval);

    return reserveData;
  }

  static fromScVal(sc_val: xdr.ScVal | string): ReserveData {
    if (typeof sc_val == 'string') {
      sc_val = xdr.ScVal.fromXDR(sc_val, 'base64');
    }

    const data_entry_map = sc_val.map();

    if (data_entry_map == undefined) {
      throw Error('ReserveData contract data value is not a map');
    }

    let d_rate: bigint | undefined;
    let b_rate: bigint | undefined;
    let ir_mod: bigint | undefined;
    let d_supply: bigint | undefined;
    let b_supply: bigint | undefined;
    let backstop_credit: bigint | undefined;
    let last_time: number | undefined;
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
        case 'd_supply':
          d_supply = scValToNative(map_entry.val());
          break;
        case 'b_supply':
          b_supply = scValToNative(map_entry.val());
          break;
        case 'backstop_credit':
          backstop_credit = scValToNative(map_entry.val());
          break;
        case 'last_time':
          last_time = Number(scValToNative(map_entry.val()));
          break;
        default:
          throw Error(`Invalid ReserveData key should not contain ${key}`);
      }
    }

    if (
      d_rate == undefined ||
      b_rate == undefined ||
      ir_mod == undefined ||
      d_supply == undefined ||
      b_supply == undefined ||
      backstop_credit == undefined ||
      last_time == undefined
    ) {
      throw Error('Error: ReserveData scvMap value malformed');
    }

    return new ReserveData(d_rate, b_rate, ir_mod, d_supply, b_supply, backstop_credit, last_time);
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

export class ReserveEmissions {
  constructor(
    public reserve: Reserve,
    public supplyEmissions: Emissions | undefined,
    public borrowEmissions: Emissions | undefined
  ) {}

  static async load(
    network: Network,
    reserve: Reserve,
    timestamp?: number
  ): Promise<ReserveEmissions> {
    switch (reserve.version) {
      case Version.V1: {
        const reserveV1 = reserve as ReserveV1;
        return new ReserveEmissions(reserve, reserveV1.supplyEmissions, reserveV1.borrowEmissions);
      }
      case Version.V2: {
        const stellarRpc = new rpc.Server(network.rpc, network.opts);

        const dTokenIndex = reserve.config.index * 2;
        const bTokenIndex = reserve.config.index * 2 + 1;
        const ledgerKeys: xdr.LedgerKey[] = [
          ReserveEmissionData.ledgerKey(reserve.poolId, bTokenIndex),
          ReserveEmissionData.ledgerKey(reserve.poolId, dTokenIndex),
        ];
        const reserveLedgerEntries = await stellarRpc.getLedgerEntries(...ledgerKeys);

        let emissionBorrowData: EmissionDataV2 | undefined;
        let emissionSupplyData: EmissionDataV2 | undefined;
        for (const entry of reserveLedgerEntries.entries) {
          const ledgerEntry = entry.val;
          const key = decodeEntryKey(ledgerEntry.contractData().key());
          switch (key) {
            case `EmisData`: {
              const token_type = getEmissionEntryTokenType(ledgerEntry);
              if (token_type == 0) {
                emissionBorrowData = EmissionDataV2.fromLedgerEntryData(ledgerEntry);
              } else if (token_type == 1) {
                emissionSupplyData = EmissionDataV2.fromLedgerEntryData(ledgerEntry);
              }
              break;
            }
            default:
              throw Error(`Invalid reserve key: should not contain ${key}`);
          }
        }
        let borrowEmissions: Emissions | undefined = undefined;
        if (emissionBorrowData) {
          borrowEmissions = new EmissionsV2(emissionBorrowData, reserveLedgerEntries.latestLedger);
          borrowEmissions.accrue(reserve.data.dSupply, reserve.config.decimals, timestamp);
        }

        let supplyEmissions: Emissions | undefined = undefined;
        if (emissionSupplyData) {
          supplyEmissions = new EmissionsV2(emissionSupplyData, reserveLedgerEntries.latestLedger);
          supplyEmissions.accrue(reserve.data.bSupply, reserve.config.decimals, timestamp);
        }

        return new ReserveEmissions(reserve, supplyEmissions, borrowEmissions);
      }
      default:
        throw new Error('Unsupported reserve version');
    }
  }

  /**
   * Get the BLND per year currently being emitted to each borrowed asset
   */
  public emissionsPerYearPerBorrowedAsset(): number {
    if (this.borrowEmissions === undefined) {
      return 0;
    }
    return this.borrowEmissions.emissionsPerYearPerToken(
      this.reserve.totalLiabilities(),
      this.reserve.config.decimals
    );
  }

  /**
   * Get the BLND per year currently being emitted to each supplied asset
   */
  public emissionsPerYearPerSuppliedAsset(): number {
    if (this.supplyEmissions === undefined) {
      return 0;
    }
    return this.supplyEmissions.emissionsPerYearPerToken(
      this.reserve.totalSupply(),
      this.reserve.config.decimals
    );
  }
}

/**
 * A object representing the reserve object on the contract
 */
export class ContractReserve {
  constructor(
    public asset: string,
    public config: ReserveConfigV2,
    public data: ReserveData,
    public scalar: i128
  ) {}

  static fromScVal(sc_val: xdr.ScVal | string): ContractReserve {
    if (typeof sc_val == 'string') {
      sc_val = xdr.ScVal.fromXDR(sc_val, 'base64');
    }
    const data_entry_map = sc_val.map();
    if (data_entry_map == undefined) {
      throw Error('Reserve contract data value is not a map');
    }
    let asset: string | undefined;
    let config: ReserveConfigV2 | undefined;
    let data: ReserveData | undefined;
    let scalar: i128 | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'asset':
          asset = Address.fromScVal(map_entry.val()).toString();
          break;
        case 'config':
          config = ReserveConfigV2.fromScVal(map_entry.val());
          break;
        case 'data':
          data = ReserveData.fromScVal(map_entry.val());
          break;
        case 'scalar':
          scalar = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid Reserve key: should not contain ${key}`);
      }
    }
    if (asset == undefined || config == undefined || data == undefined) {
      throw Error('Invalid Reserve: missing fields');
    }
    return new ContractReserve(asset, config, data, scalar);
  }
}

/**
 * Decode the reserve token type (0 = dToken, 1 = bToken) from a Reserve Emission LedgerEntryData
 */
export function getEmissionEntryTokenType(ledger_entry_data: xdr.LedgerEntryData | string): number {
  if (typeof ledger_entry_data == 'string') {
    ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
  }
  const ledgerEntryKey = ledger_entry_data.contractData()?.key()?.vec()?.at(1)?.u32();
  if (ledgerEntryKey == undefined) {
    throw new Error('Unable to parse emission entry token type');
  }
  return ledgerEntryKey % 2;
}
