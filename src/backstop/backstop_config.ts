import { Address, xdr, Server, scValToNative } from 'soroban-client';
import { Network } from '../index.js';
import { LpTokenValue } from './index.js';

export class BackstopConfig {
  constructor(
    public blndTkn: string,
    public usdcTkn: string,
    public backstopTkn: string,
    public poolFactory: string,
    public rewardZone: string[],
    public lpValue: LpTokenValue
  ) {}

  static async load(network: Network, backstopId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const contractInstanceDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const lpValueDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('LPTknVal')]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const rewardZoneDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('RewardZone')]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    let blndTkn: string | undefined;
    let usdcTkn: string | undefined;
    let backstopTkn: string | undefined;
    let poolFactory: string | undefined;
    let lpValue: LpTokenValue | undefined;
    let rewardZone: string[] | undefined;
    const backstopConfigEntries =
      (
        await SorobanRpc.getLedgerEntries(
          contractInstanceDataKey,
          lpValueDataKey,
          rewardZoneDataKey
        )
      ).entries ?? [];
    for (const entry of backstopConfigEntries) {
      const ledgerData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64').contractData();
      let key: xdr.ScVal;
      switch (ledgerData.key().switch()) {
        case xdr.ScValType.scvVec():
          key = ledgerData.key().vec().at(0);
          break;
        case xdr.ScValType.scvLedgerKeyContractInstance():
          key = xdr.ScVal.scvSymbol('BackstopConfig');
      }
      console.log(key.sym().toString());

      switch (key.sym().toString()) {
        case 'LPTknVal': {
          const lpTknVector = ledgerData.val().vec();
          if (lpTknVector.at(0) != undefined && lpTknVector.at(0) != undefined) {
            lpValue = {
              blndPerShare: scValToNative(lpTknVector.at(0)),
              usdcPerShare: scValToNative(lpTknVector.at(1)),
            };
          } else {
            throw new Error('Error: LP token value malformed');
          }
          break;
        }
        case 'BackstopConfig':
          ledgerData
            .val()
            .instance()
            .storage()
            ?.map((entry) => {
              switch (entry.key().sym().toString()) {
                case 'BLNDTkn':
                  blndTkn = Address.fromScVal(entry.val()).toString();
                  break;
                case 'BckstpTkn':
                  backstopTkn = Address.fromScVal(entry.val()).toString();
                  break;
                case 'USDCTkn':
                  usdcTkn = Address.fromScVal(entry.val()).toString();
                  break;
                case 'PoolFact':
                  poolFactory = Address.fromScVal(entry.val()).toString();
                  break;
              }
            });
          break;
        case 'RewardZone':
          rewardZone = [];
          ledgerData
            .val()
            .vec()
            .map((address) => {
              rewardZone.push(Address.fromScVal(address).toString());
            });
      }
    }

    if (backstopConfigEntries.length == 0) {
      throw Error('unable to load backstop config');
    }
    if (
      blndTkn == undefined ||
      usdcTkn == undefined ||
      backstopTkn == undefined ||
      poolFactory == undefined ||
      lpValue == undefined
    ) {
      throw Error('unable to load backstop config');
    }
    return new BackstopConfig(blndTkn, usdcTkn, backstopTkn, poolFactory, rewardZone, lpValue);
  }
}
