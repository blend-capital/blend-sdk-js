//! Base classes for emission data

import { SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Network, i128, u64 } from './index.js';
import { decodeEntryKey } from './ledger_entry_helper.js';

/********** Emission Source **********/

/**
 * Emission data for a token. Assumes the emitted token is tracked in 7 decimals.
 *
 * @property config - The EmissionConfig
 * @property data - The EmissionData
 */
export class Emissions {
  constructor(public config: EmissionConfig, public data: EmissionData) {}

  /**
   * Fetch the emissions for a token.
   * @param newtork - The network to load the emissions from
   * @param configLedgerKey - The LedgerLey for the config
   * @param dataLedgerkey - The LedgerKey for the data
   * @returns - The emissions if they exist, or undefined
   * @throws - If the emission data exists but is malformed
   */
  static async load(
    newtork: Network,
    configLedgerKey: xdr.LedgerKey,
    dataLedgerkey: xdr.LedgerKey
  ): Promise<Emissions | undefined> {
    const sorobanRpc = new SorobanRpc.Server(newtork.rpc, newtork.opts);
    const entriesResponse = await sorobanRpc.getLedgerEntries(configLedgerKey, dataLedgerkey);
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
      return new Emissions(emissionConfig, emissionData);
    }
    return undefined;
  }

  /**
   * Estimate the emission index to a given timestamp
   *
   * @param timestamp - The timestamp to extrapolate to
   * @param supply - The total supply of the token being emitted to
   * @returns The estimated emission index
   */
  public estimateIndex(timestamp: number, supply: bigint, decimals: number): number {
    const time_diff =
      timestamp > this.config.expiration
        ? Number(this.config.expiration) - Number(this.data.lastTime)
        : timestamp - Number(this.data.lastTime);
    if (time_diff < 0) {
      return Number(this.data.index);
    }

    const scaled_supply = Number(supply) / 10 ** decimals;
    const additional_index = (time_diff * Number(this.config.eps)) / scaled_supply;
    return Number(this.data.index) + additional_index;
  }
}

/**
 * The emission configuration
 *
 * @property eps - The emission per second
 * @property expiration - The expiration time of the emission
 */
export class EmissionConfig {
  constructor(public eps: bigint, public expiration: bigint) {}

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): EmissionConfig {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }
    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('EmissionConfig contract data value is not a map');
    }
    let expiration: number | undefined;
    let eps: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'expiration':
          expiration = scValToNative(map_entry.val());
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
    return new EmissionConfig(BigInt(eps), BigInt(expiration));
  }
}

export class EmissionData {
  constructor(public index: i128, public lastTime: u64) {}

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
          last_time = scValToNative(map_entry.val());
          break;
        default:
          throw new Error(`EmissionData invalid key: should not contain ${key}`);
      }
    }

    if (index == undefined || last_time == undefined) {
      throw new Error(`ReserveEmissionData scvMap value malformed`);
    }

    return new EmissionData(index, BigInt(last_time));
  }
}

/**
 * Emission data for a user. Assumes the emitted token is tracked in 7 decimals.
 *
 * @property index - The last emission index the user accrued to
 * @property accrued - The accrued emissions the user has
 */
export class UserEmissions {
  constructor(public index: i128, public accrued: i128) {}

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): UserEmissions {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
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
   * @param timestamp - The timestamp to extrapolate to
   * @param emissions - The emissions data for a token
   * @param decimals - The decimals of the token being emitted to
   * @param supply - The total supply of the token being emitted to (as integer)
   * @param balance - The balance of the user of the token being emitted to (in integer)
   * @returns The estimated accrued emissions as a float
   */
  estimateAccrual(
    timestamp: number,
    emissions: Emissions,
    decimals: number,
    supply: bigint,
    balance: bigint
  ): number {
    const emission_index = emissions.estimateIndex(timestamp, supply, decimals);
    const additional_index = emission_index - Number(this.index);
    // emissions are a Stellar Asset with 7 decimals
    return ((additional_index * Number(balance)) / 10 ** decimals + Number(this.accrued)) / 1e7;
  }
}
