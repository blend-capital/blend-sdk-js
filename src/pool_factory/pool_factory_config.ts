import { Address, rpc, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export class PoolFactoryConfig {
  constructor(public blndTkn: string, public backstop: string, public poolHash: string) {}

  static async load(network: Network, poolFactoryId: string) {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const contractInstanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolFactoryId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    let blndTkn: string | undefined;
    let backstop: string | undefined;
    let poolHash: string | undefined;

    const poolFactoryConfigEntries =
      (await stellarRpc.getLedgerEntries(contractInstanceKey)).entries ?? [];
    for (const entry of poolFactoryConfigEntries) {
      const ledgerData = entry.val.contractData();
      const key = decodeEntryKey(ledgerData.key());
      switch (key) {
        case 'ContractInstance': {
          ledgerData
            .val()
            .instance()
            .storage()
            ?.map((entry) => {
              const instanceKey = decodeEntryKey(entry.key());
              switch (instanceKey) {
                case 'PoolMeta':
                  entry
                    .val()
                    .map()
                    .map((mapEntry) => {
                      const poolMetaKey = mapEntry.key().sym().toString();
                      switch (poolMetaKey) {
                        case 'backstop':
                          backstop = Address.fromScVal(mapEntry.val()).toString();
                          break;
                        case 'blnd_id':
                          blndTkn = Address.fromScVal(mapEntry.val()).toString();
                          break;
                        case 'pool_hash':
                          poolHash = mapEntry.val().bytes().toString('hex');
                          break;
                        case 'IsInit':
                          // do nothing
                          break;
                        default:
                          throw Error(`Invalid PoolMeta key: should not contain ${poolMetaKey}`);
                      }
                    });
                  break;
                default:
                  throw Error(
                    `Invalid pool factory instance key: should not contain ${instanceKey}`
                  );
              }
            });
          break;
        }
        default:
          throw Error(`Invalid pool factory config key: should not contain ${key}`);
      }
    }

    if (
      blndTkn == undefined ||
      backstop == undefined ||
      poolHash == undefined ||
      poolFactoryConfigEntries.length == 0
    ) {
      throw Error('Unable to load pool factory config');
    }
    return new PoolFactoryConfig(blndTkn, backstop, poolHash);
  }
}
