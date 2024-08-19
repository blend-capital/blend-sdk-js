import { SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { EmissionConfig, EmissionData, Emissions } from '../emissions.js';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import {
  ReserveEmissionConfig,
  ReserveEmissionData,
  getEmissionEntryTokenType,
} from './reserve_types.js';

export class ReserveEmissions {
  constructor(public supply: Emissions | undefined, public borrow: Emissions | undefined) {}

  static async load(
    network: Network,
    poolId: string,
    index: number,
    bTokenSupply: bigint,
    dTokenSupply: bigint,
    decimals: number,
    timestamp?: number | undefined
  ): Promise<ReserveEmissions> {
    const sorobanRpc = new SorobanRpc.Server(network.rpc, network.opts);

    const dTokenIndex = index * 2;
    const bTokenIndex = index * 2 + 1;
    const ledgerKeys: xdr.LedgerKey[] = [
      ReserveEmissionConfig.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, bTokenIndex),
      ReserveEmissionConfig.ledgerKey(poolId, dTokenIndex),
      ReserveEmissionData.ledgerKey(poolId, dTokenIndex),
    ];
    const reserveLedgerEntries = await sorobanRpc.getLedgerEntries(...ledgerKeys);

    let emissionSupplyConfig: EmissionConfig | undefined;
    let emissionSupplyData: EmissionData | undefined;
    let emissionBorrowConfig: EmissionConfig | undefined;
    let emissionBorrowData: EmissionData | undefined;
    for (const entry of reserveLedgerEntries.entries) {
      const ledgerEntry = entry.val;
      const key = decodeEntryKey(ledgerEntry.contractData().key());
      switch (key) {
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
      borrowEmissions = new Emissions(
        emissionBorrowConfig,
        emissionBorrowData,
        reserveLedgerEntries.latestLedger
      );
      borrowEmissions.accrue(bTokenSupply, decimals, timestamp);
    }

    let supplyEmissions: Emissions | undefined = undefined;
    if (emissionSupplyConfig && emissionSupplyData) {
      supplyEmissions = new Emissions(
        emissionSupplyConfig,
        emissionSupplyData,
        reserveLedgerEntries.latestLedger
      );
      supplyEmissions.accrue(dTokenSupply, decimals, timestamp);
    }

    return new ReserveEmissions(supplyEmissions, borrowEmissions);
  }
}
