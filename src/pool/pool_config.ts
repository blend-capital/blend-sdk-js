import { Address, xdr, Server, scValToNative } from 'soroban-client';
import { Network } from '../index.js';

export class PoolConfig {
  constructor(
    public admin: string,
    public name: string,
    public blndTkn: string,
    public usdcTkn: string,
    public backstop: string,
    public backstopRate: number,
    public oracle: string,
    public status: number,
    public reserveList: string[]
  ) {}

  static async load(network: Network, poolId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const contractInstanceXDR = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const reserveListDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvSymbol('ResList'),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    let admin: string | undefined;
    let name: string | undefined;
    let blndTkn: string | undefined;
    let usdcTkn: string | undefined;
    let backstop: string | undefined;
    let backstopRate: number | undefined;
    let oracle: string | undefined;
    let status: number | undefined;
    let reserveList: string[] | undefined;

    const poolConfigEntries =
      (await SorobanRpc.getLedgerEntries(contractInstanceXDR, reserveListDataKey)).entries ?? [];

    for (const entry of poolConfigEntries) {
      const ledgerData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64').contractData();
      let key: xdr.ScVal;
      switch (ledgerData.key().switch()) {
        case xdr.ScValType.scvVec():
          key = ledgerData.key().vec().at(0);
          break;
        case xdr.ScValType.scvSymbol():
          key = ledgerData.key();
          break;
        case xdr.ScValType.scvLedgerKeyContractInstance():
          key = xdr.ScVal.scvSymbol('PoolInstance');
          break;
      }
      switch (key.sym().toString()) {
        case 'PoolInstance': {
          const instanceEntry = ledgerData
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
                          backstopRate = Number(config_entry.val().u64().toString());
                          return;
                        case 'oracle':
                          oracle = Address.fromScVal(config_entry.val()).toString();
                          return;
                        case 'status':
                          status = scValToNative(config_entry.val());
                          return;
                      }
                    });
                  if (backstopRate == undefined || oracle == undefined || status == undefined) {
                    throw new Error();
                  }
                  return;
                case 'Name':
                  name = entry.val().sym().toString();
                  return;
              }
            });
          if (instanceEntry == undefined) {
            throw Error('unable to load pool instance');
          }
          break;
        }
        case 'ResList':
          reserveList = scValToNative(ledgerData.val());
          break;
      }
    }

    return new PoolConfig(
      admin,
      name,
      blndTkn,
      usdcTkn,
      backstop,
      backstopRate,
      oracle,
      status,
      reserveList
    );
  }
}
