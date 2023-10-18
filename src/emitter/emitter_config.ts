import { Address, xdr, Server } from 'soroban-client';
import { Network } from '../index.js';

export class EmitterConfig {
  constructor(public blndTkn: string, public backstop: string) {}

  static async load(network: Network, emitterId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const contractInstanceXDR = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(emitterId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    let blndTkn: string | undefined;
    let backstop: string | undefined;
    const entries_results = (await SorobanRpc.getLedgerEntries(contractInstanceXDR)).entries ?? [];
    const instance_entry = xdr.LedgerEntryData.fromXDR(entries_results[0].xdr, 'base64')
      .contractData()
      .val()
      .instance()
      .storage()
      ?.map((entry) => {
        const key = entry.key().vec().at(0);
        switch (key.sym().toString()) {
          case 'BlendId':
            blndTkn = Address.fromScVal(entry.val()).toString();
            return;
          case 'Backstop':
            backstop = Address.fromScVal(entry.val()).toString();
            return;
          default:
            throw Error('invalid emitter config entry key');
        }
      });
    if (instance_entry == undefined) {
      throw Error('Unable to load emitter config');
    }
    if (blndTkn == undefined || backstop == undefined) {
      throw Error('Unable to load emitter config');
    }
    return new EmitterConfig(blndTkn, backstop);
  }
}
