//! Base classes for emission data

import { SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Network, i128 } from './index.js';
import { decodeEntryKey } from './ledger_entry_helper.js';
import * as FixedMath from './math.js';

/********** Emission Source **********/

/**
 * Emission data for a token. Assumes the emitted token is tracked in 7 decimals.
 *
 * @property config - The EmissionConfig
 * @property data - The EmissionData
 */
export class Emissions {
  constructor(
    public config: EmissionConfig,
    public data: EmissionData,
    public latestLedger: number
  ) {}

  /**
   * Fetch the emissions for a token.
   * @param newtork - The network to load the emissions from
   * @param configLedgerKey - The LedgerLey for the config
   * @param dataLedgerkey - The LedgerKey for the data
   * @param totalSupply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to
   * @param timestamp - The timestamp to accrue to. Defaults to the current time if not provided
   * @returns - The emissions if they exist, or undefined
   * @throws - If the emission data exists but is malformed
   */
  static async load(
    newtork: Network,
    configLedgerKey: xdr.LedgerKey,
    dataLedgerkey: xdr.LedgerKey,
    totalSupply: bigint,
    decimals: number,
    timestamp?: number | undefined
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
      const emissions = new Emissions(emissionConfig, emissionData, entriesResponse.latestLedger);
      emissions.accrue(totalSupply, decimals, timestamp);
      return emissions;
    }
    return undefined;
  }

  /**
   * Accrue emissions to the provided timestamp
   * @param supply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to
   * @param timestamp - The timestamp to accrue to. Defaults to the current time if not provided
   */
  public accrue(supply: bigint, decimals: number, timestamp?: number) {
    if (timestamp == undefined) {
      timestamp = Math.floor(Date.now() / 1000);
    }

    if (
      this.data.lastTime >= this.config.expiration ||
      this.data.lastTime >= timestamp ||
      this.config.eps === BigInt(0) ||
      supply === BigInt(0)
    ) {
      return;
    }

    const ledgerTimestamp = timestamp > this.config.expiration ? this.config.expiration : timestamp;
    const additionalIndex = FixedMath.divFloor(
      BigInt(ledgerTimestamp - this.data.lastTime) * this.config.eps,
      supply,
      FixedMath.toFixed(1, decimals)
    );
    this.data.index += additionalIndex;
  }

  /**
   * Calculate the emissions per year per token as a float.
   * @param supply - The total supply of the token being emitted to
   * @param decimals - The decimals of the token being emitted to. Defaults to 7.
   * @returns The emissions per year per token as a float
   */
  public emissionsPerYearPerToken(supply: bigint, decimals?: number): number {
    const supplyFloat = FixedMath.toFloat(supply, decimals);
    const totalEmissions = FixedMath.toFloat(this.config.eps, 7) * 31536000;
    return totalEmissions / supplyFloat;
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
   * @param emissions - The emissions data for a token
   * @param balance - The balance of the user of the token being emitted to (fixed point)
   * @returns The estimated accrued emissions in fixed point
   */
  estimateAccrual(emissions: Emissions, decimals: number, balance: bigint): number {
    const additional_index = emissions.data.index - this.index;
    const toAccrue = FixedMath.mulFloor(balance, additional_index, FixedMath.SCALAR_7);
    return FixedMath.toFloat(toAccrue + this.accrued, decimals);
  }
}
