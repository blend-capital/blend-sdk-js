import { Address, xdr, Server, scValToNative } from 'soroban-client';
import { Network } from '../index.js';

export class PoolConfig {
  constructor(
    public admin: string,
    public name: string,
    public blndTkn: string,
    public usdcTkn: string,
    public backstop: string,
    public bstop_rate: number,
    public oracle: string,
    public status: number
  ) {}

  static async load(network: Network, pool_id: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const contractInstanceXDR = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(pool_id).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    let admin: string | undefined;
    let name: string | undefined;
    let blndTkn: string | undefined;
    let usdcTkn: string | undefined;
    let backstop: string | undefined;
    let bstop_rate: number | undefined;
    let oracle: string | undefined;
    let status: number | undefined;

    const entries_results = (await SorobanRpc.getLedgerEntries(contractInstanceXDR)).entries ?? [];
    const instance_entry = xdr.LedgerEntryData.fromXDR(entries_results[0].xdr, 'base64')
      .contractData()
      .val()
      .instance()
      .storage()
      ?.map((entry) => {
        switch (entry.key().sym().toString()) {
          case 'Admin':
            admin = Address.fromScVal(entry.val()).toString();
            return;
          case 'BLNDTkn':
            blndTkn = Address.fromScVal(entry.val()).toString();
            return;
          case 'Backstop':
            backstop = Address.fromScVal(entry.val()).toString();
            return;
          case 'USDCTkn':
            usdcTkn = Address.fromScVal(entry.val()).toString();
            return;
          case 'PoolConfig':
            entry
              .val()
              .map()
              ?.map((config_entry) => {
                switch (config_entry.key().sym().toString()) {
                  case 'bstop_rate':
                    bstop_rate = Number(config_entry.val().u64().toString());
                    return;
                  case 'oracle':
                    oracle = Address.fromScVal(config_entry.val()).toString();
                    return;
                  case 'status':
                    status = scValToNative(config_entry.val());
                    return;
                }
              });
            if (bstop_rate == undefined || oracle == undefined || status == undefined) {
              throw new Error();
            }
            return;
          case 'Name':
            name = entry.val().sym().toString();
            return;
        }
      });
    if (instance_entry == undefined) {
      throw Error('unable to load pool instance');
    }
    return new PoolConfig(admin, name, blndTkn, usdcTkn, backstop, bstop_rate, oracle, status);
  }
}
