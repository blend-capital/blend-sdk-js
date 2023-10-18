import { Address, xdr, Server } from 'soroban-client';
import { Network } from '../index.js';

export class PoolFactoryConfig {
  constructor(
    public blndTkn: string,
    public usdcTkn: string,
    public backstop: string,
    public poolHash: string
  ) {}

  static async load(network: Network, poolFactoryId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const contractInstanceXDR = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolFactoryId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    let blndTkn: string | undefined;
    let usdcTkn: string | undefined;
    let backstop: string | undefined;
    let poolHash: string | undefined;

    const entries_results = (await SorobanRpc.getLedgerEntries(contractInstanceXDR)).entries ?? [];
    const instance_entry = xdr.LedgerEntryData.fromXDR(entries_results[0].xdr, 'base64')
      .contractData()
      .val()
      .instance()
      .storage()
      ?.map((entry) => {
        switch (entry.key().sym().toString()) {
          case 'PoolMeta':
            entry
              .val()
              .map()
              .map((mapEntry) => {
                switch (mapEntry.key().sym().toString()) {
                  case 'backstop':
                    backstop = Address.fromScVal(mapEntry.val()).toString();
                    break;
                  case 'blnd_id':
                    blndTkn = Address.fromScVal(mapEntry.val()).toString();
                    break;
                  case 'pool_hash':
                    poolHash = mapEntry.val().bytes().toString('hex');
                    break;
                  case 'usdc_id':
                    usdcTkn = Address.fromScVal(mapEntry.val()).toString();
                }
              });
            break;
          default:
            break;
        }
      });
    if (instance_entry == undefined) {
      throw Error('unable to load pool instance');
    }
    return new PoolFactoryConfig(blndTkn, usdcTkn, backstop, poolHash);
  }
}
