import { Address, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export class EmitterConfig {
  constructor(public blndTkn: string, public backstop: string) {}

  static async load(network: Network, emitterId: string) {
    const rpc = new SorobanRpc.Server(network.rpc, network.opts);
    const contractInstanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(emitterId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    let blndTkn: string | undefined;
    let backstop: string | undefined;
    const emitterConfigEntries = (await rpc.getLedgerEntries(contractInstanceKey)).entries ?? [];
    for (const entry of emitterConfigEntries) {
      const ledgerData = entry.val.contractData();
      const key = decodeEntryKey(ledgerData.key());
      switch (key) {
        case 'ContractInstance':
          ledgerData
            .val()
            .instance()
            .storage()
            ?.map((entry) => {
              const instanceKey = decodeEntryKey(entry.key());
              switch (instanceKey) {
                case 'BlendId':
                  blndTkn = Address.fromScVal(entry.val()).toString();
                  return;
                case 'Backstop':
                  backstop = Address.fromScVal(entry.val()).toString();
                  return;
                case 'IsInit':
                  // do nothing
                  break;
                default:
                  throw Error(
                    `invalid emitter instance storage key: should not contain ${instanceKey}`
                  );
              }
            });
          break;
        default:
          throw Error(`Invalid emitter config key: should not contain ${key}`);
      }
    }
    if (emitterConfigEntries.length == 0 || blndTkn == undefined || backstop == undefined) {
      throw Error('Unable to load emitter config');
    }
    return new EmitterConfig(blndTkn, backstop);
  }
}
