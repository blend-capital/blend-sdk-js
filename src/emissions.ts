//! Base classes for emission data

import { rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Network, i128 } from './index.js';
import { decodeEntryKey } from './ledger_entry_helper.js';
import * as FixedMath from './math.js';

/********** Emission Source **********/

export abstract class Emissions {
  constructor(
    public expiration: number,
    public eps: i128,
    public index: i128,
    public lastTime: number,
    public latestLedger: number
  ) {}

  /**
   * The decimals of the index and eps values
   */
  abstract readonly epsDecimals: number;

  /**
   * Accrue emissions to the provided timestamp
   * @param supply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to
   * @param timestamp - The timestamp to accrue to. Defaults to the current time if not provided
   */
  public accrue(supply: i128, decimals: number, timestamp?: number) {
    if (timestamp == undefined) {
      timestamp = Math.floor(Date.now() / 1000);
    }

    if (
      this.lastTime >= this.expiration ||
      this.lastTime >= timestamp ||
      this.eps === BigInt(0) ||
      supply === BigInt(0)
    ) {
      return;
    }

    const ledgerTimestamp = timestamp > this.expiration ? this.expiration : timestamp;
    const additionalIndex = FixedMath.divFloor(
      BigInt(ledgerTimestamp - this.lastTime) * this.eps,
      supply,
      FixedMath.toFixed(1, decimals)
    );
    this.index += additionalIndex;
  }

  /**
   * Calculate the emissions per year per token as a float.
   * @param supply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to. Defaults to 7.
   * @returns The emissions per year per token as a float
   */
  public emissionsPerYearPerToken(supply: bigint, decimals?: number): number {
    if (this.expiration <= Math.floor(Date.now() / 1000)) {
      return 0;
    }
    const supplyFloat = FixedMath.toFloat(supply, decimals);
    if (supplyFloat === 0) {
      return 0;
    }
    const totalEmissions = FixedMath.toFloat(this.eps, this.epsDecimals) * 31536000;
    return totalEmissions / supplyFloat;
  }
}

export class EmissionsV1 extends Emissions {
  constructor(config: EmissionConfig, data: EmissionData, latestLedger: number) {
    super(config.expiration, config.eps, data.index, data.lastTime, latestLedger);
  }

  readonly epsDecimals: number = 7;

  /**
   * Fetch the emissions for a token.
   * @param network - The network to load the emissions from
   * @param configLedgerKey - The LedgerLey for the config
   * @param dataLedgerkey - The LedgerKey for the data
   * @param totalSupply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to
   * @param timestamp - The timestamp to accrue to. Defaults to the current time if not provided
   * @returns - The emissions if they exist, or undefined
   * @throws - If the emission data exists but is malformed
   */
  static async load(
    network: Network,
    configLedgerKey: xdr.LedgerKey,
    dataLedgerkey: xdr.LedgerKey,
    totalSupply: bigint,
    decimals: number,
    timestamp?: number | undefined
  ): Promise<Emissions | undefined> {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const entriesResponse = await stellarRpc.getLedgerEntries(configLedgerKey, dataLedgerkey);
    if (entriesResponse.entries.length == 2) {
      let emissionConfig: EmissionConfig | undefined = undefined;
      let emissionData: EmissionData | undefined = undefined;
      for (const entry of entriesResponse.entries) {
        const ledgerData = entry.val;
        const key = decodeEntryKey(ledgerData.contractData().key());
        switch (key) {
          case 'EmisConfig':
          case 'BEmisCfg':
            emissionConfig = EmissionConfig.fromLedgerEntryData(ledgerData);
            break;
          case 'EmisData':
          case 'BEmisData':
            emissionData = EmissionData.fromLedgerEntryData(ledgerData);
            break;
          default:
            throw Error(`Invalid emission key: should not contain ${key}`);
        }
      }
      if (emissionData == undefined || emissionConfig == undefined) {
        throw new Error(`Unable to load emissions`);
      }
      const emissions = new EmissionsV1(emissionConfig, emissionData, entriesResponse.latestLedger);
      emissions.accrue(totalSupply, decimals, timestamp);
      return emissions;
    }
    return undefined;
  }
}

/**
 * Base class for emission data
 *
 * @property expiration - The timestamp the emissions expire
 * @property eps - The emissions per second
 * @property index - The last emission index
 * @property lastTime - The last time the emissions were updated
 */
export class EmissionsV2 extends Emissions {
  constructor(public data: EmissionDataV2, public latestLedger: number) {
    super(data.expiration, data.eps, data.index, data.lastTime, latestLedger);
  }

  readonly epsDecimals: number = 14;

  /**
   * Fetch the emissions for a token.
   * @param network - The network to load the emissions from
   * @param configLedgerKey - The LedgerLey for the config
   * @param dataLedgerkey - The LedgerKey for the data
   * @param totalSupply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to
   * @param timestamp - The timestamp to accrue to. Defaults to the current time if not provided
   * @returns - The emissions if they exist, or undefined
   * @throws - If the emission data exists but is malformed
   */
  static async load(
    network: Network,
    dataLedgerkey: xdr.LedgerKey,
    totalSupply: bigint,
    decimals: number,
    timestamp?: number | undefined
  ): Promise<EmissionsV2 | undefined> {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const entriesResponse = await stellarRpc.getLedgerEntries(dataLedgerkey);
    if (entriesResponse.entries.length == 1) {
      let emissionData: EmissionDataV2 | undefined = undefined;
      for (const entry of entriesResponse.entries) {
        const ledgerData = entry.val;
        const key = decodeEntryKey(ledgerData.contractData().key());
        switch (key) {
          case 'EmisData':
          case 'BEmisData':
            emissionData = EmissionDataV2.fromLedgerEntryData(ledgerData);
            break;
          default:
            throw Error(`Invalid emission key: should not contain ${key}`);
        }
      }
      if (emissionData == undefined) {
        throw new Error(`Unable to load emissions`);
      }
      const emissions = new EmissionsV2(emissionData, entriesResponse.latestLedger);

      emissions.accrue(totalSupply, decimals, timestamp);
      return emissions;
    }
    return undefined;
  }
}

/**
 * The emission configuration
 *
 * @property eps - The emission per second
 * @property expiration - The expiration time of the emission
 */
export class EmissionConfig {
  constructor(public eps: bigint, public expiration: number) {}

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): EmissionConfig {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }
    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('EmissionConfig contract data value is not a map');
    }
    let expiration: number | undefined;
    let eps: bigint | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'expiration':
          expiration = Number(scValToNative(map_entry.val()));
          break;
        case 'eps':
          eps = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`EmissionConfig invalid key: should not contain ${key}`);
      }
    }
    if (eps == undefined || expiration == undefined) {
      throw Error('EmissionConfig scvMap value malformed');
    }
    return new EmissionConfig(BigInt(eps), expiration);
  }
}

export class EmissionData {
  constructor(public index: i128, public lastTime: number) {}

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): EmissionData {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('EmissionData contract data value is not a map');
    }

    let index: bigint | undefined;
    let last_time: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'last_time':
          last_time = Number(scValToNative(map_entry.val()));
          break;
        default:
          throw new Error(`EmissionData invalid key: should not contain ${key}`);
      }
    }

    if (index == undefined || last_time == undefined) {
      throw new Error(`ReserveEmissionData scvMap value malformed`);
    }

    return new EmissionData(index, last_time);
  }
}

export class EmissionDataV2 extends EmissionData {
  constructor(
    public expiration: number,
    public eps: bigint,
    public index: bigint,
    public lastTime: number
  ) {
    super(index, lastTime);
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): EmissionDataV2 {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('EmissionData contract data value is not a map');
    }

    let expiration: number | undefined;
    let eps: bigint | undefined;
    let index: bigint | undefined;
    let last_time: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'expiration':
          expiration = Number(scValToNative(map_entry.val()));
          break;
        case 'eps':
          eps = scValToNative(map_entry.val());
          break;
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'last_time':
          last_time = Number(scValToNative(map_entry.val()));
          break;
        default:
          throw new Error(`EmissionData invalid key: should not contain ${key}`);
      }
    }

    if (
      index == undefined ||
      last_time == undefined ||
      eps == undefined ||
      expiration == undefined
    ) {
      throw new Error(`ReserveEmissionData scvMap value malformed`);
    }

    return new EmissionDataV2(expiration, eps, index, last_time);
  }
}

/**
 * Emission data for a user. Assumes the emitted token is tracked in 7 decimals.
 *
 * @property index - The last emission index the user accrued to
 * @property accrued - The accrued emissions the user has
 */
export class UserEmissions {
  constructor(public index: bigint, public accrued: bigint) {}

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): UserEmissions {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const scval = ledger_entry_data.contractData().val();

    const userEmissions = UserEmissions.fromScVal(scval);

    return userEmissions;
  }

  static fromScVal(sc_val: xdr.ScVal | string): UserEmissions | undefined {
    if (typeof sc_val == 'string') {
      sc_val = xdr.ScVal.fromXDR(sc_val, 'base64');
    }

    const data_entry_map = sc_val.map();
    if (data_entry_map == undefined) {
      throw Error('UserEmissions contract data value is not a map');
    }

    let accrued: bigint | undefined;
    let index: bigint | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'accrued':
          accrued = scValToNative(map_entry.val());
          break;
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`UserEmissions invalid key: should not contain ${key}`);
      }
    }

    if (accrued == undefined || index == undefined) {
      throw Error('scvMap value malformed');
    }

    return new UserEmissions(index, accrued);
  }

  /**
   * Estimate the accrued emission to a given timestamp
   * @param emissions - The emissions data for a token
   * @param balance - The balance of the user of the token being emitted to (fixed point)
   * @returns The estimated accrued emissions in fixed point
   */
  estimateAccrual(emissions: Emissions, decimals: number, balance: bigint): number {
    const additional_index = emissions.index - this.index;
    const toAccrue = FixedMath.mulFloor(
      balance,
      additional_index,
      FixedMath.toFixed(1, emissions.epsDecimals)
    );
    return FixedMath.toFloat(toAccrue + this.accrued, decimals);
  }
}
