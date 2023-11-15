import { Address, Server, xdr } from 'soroban-client';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { UserEmissions } from '../emissions.js';

export class PoolUserEmissions {
  constructor(public emissions: Map<number, PoolUserEmissionData>) {}

  static async load(network: Network, poolId: string, userId: string, reserveIndexs: number[]) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const emissions: Map<number, PoolUserEmissionData> = new Map();
    const emissionDataKeys: xdr.LedgerKey[] = [];
    reserveIndexs.map((index) => {
      emissionDataKeys.push(PoolUserEmissionData.ledgerKey(poolId, userId, index * 2));
      emissionDataKeys.push(PoolUserEmissionData.ledgerKey(poolId, userId, index * 2 + 1));
    });
    const emissionDataLedgerEntries = await SorobanRpc.getLedgerEntries(...emissionDataKeys);
    for (const emissionDataEntry of emissionDataLedgerEntries.entries) {
      let reserveIndex: number | undefined;
      const ledgerEntry = emissionDataEntry.val;
      ledgerEntry
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

      if (reserveIndex == undefined) {
        throw new Error("Invalid userEmissionData: should contain 'reserve_id'");
      }
      const emissionData = PoolUserEmissionData.fromLedgerEntryData(ledgerEntry);
      emissions.set(reserveIndex, emissionData);
    }

    return new PoolUserEmissions(emissions);
  }
}

export class PoolUserEmissionData extends UserEmissions {
  static ledgerKey(poolId: string, userId: string, reserveTokenIndex: number): xdr.LedgerKey {
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
}
