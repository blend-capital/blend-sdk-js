import { Address, Server, xdr, scValToNative } from 'soroban-client';
import { Network, i128 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export class UserEmissions {
  constructor(public emissions: Map<number, UserEmissionData>) {}

  static async load(network: Network, poolId: string, userId: string, reserveIndexs: number[]) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const emissions: Map<number, UserEmissionData> = new Map();
    const emissionDataKeys: xdr.LedgerKey[] = [];
    reserveIndexs.map((index) => {
      emissionDataKeys.push(UserEmissionData.getContractDataKey(poolId, userId, index * 2));
      emissionDataKeys.push(UserEmissionData.getContractDataKey(poolId, userId, index * 2 + 1));
    });
    const emissionDataLedgerEntries = await SorobanRpc.getLedgerEntries(...emissionDataKeys);
    for (const emissionDataEntry of emissionDataLedgerEntries.entries) {
      let reserveIndex: number | undefined;
      xdr.LedgerEntryData.fromXDR(emissionDataEntry.xdr, 'base64')
        .contractData()
        .key()
        .vec()
        .map((vecEntry) => {
          switch (vecEntry.switch()) {
            case xdr.ScValType.scvMap():
              vecEntry.map().map((mapEntry) => {
                const key = decodeEntryKey(mapEntry.key());
                if (key == 'reserve_id') {
                  reserveIndex = mapEntry.val().u32();
                }
              });
          }
        });

      const emissionData = UserEmissionData.fromContractDataXDR(emissionDataEntry.xdr);
      if (emissionData == undefined || reserveIndex == undefined) {
        throw Error('Malformed UserEmissionData scVal');
      }
      emissions.set(reserveIndex, emissionData);
    }

    return new UserEmissions(emissions);
  }
}

export class UserEmissionData {
  constructor(public index: i128, public accrued: i128) {}

  static getContractDataKey(poolId: string, userId: string, reserveTokenIndex: number) {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('UserEmis'),
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('reserve_id'),
          val: xdr.ScVal.scvU32(reserveTokenIndex),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('user'),
          val: Address.fromString(userId).toScVal(),
        }),
      ]),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromContractDataXDR(xdr_string: string): UserEmissionData {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('UserEmissionData contract data value is not a map');
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
          throw Error(`Invalid UserEmissionData key: should not contain ${key}`);
      }
    }

    if (accrued == undefined || index == undefined) {
      throw Error('scvMap value malformed');
    }

    return new UserEmissionData(index, accrued);
  }
}
