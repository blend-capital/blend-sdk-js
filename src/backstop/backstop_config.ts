import { Address, rpc, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export class BackstopConfig {
  constructor(
    public emitter: string,
    public blndTkn: string,
    public usdcTkn: string,
    public backstopTkn: string,
    public poolFactory: string,
    public rewardZone: string[],
    public latestLedger: number
  ) {}

  static async load(network: Network, backstopId: string) {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const contractInstanceDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const rewardZoneDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvSymbol('RZ'),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    let emitter: string | undefined;
    let blndTkn: string | undefined;
    let usdcTkn: string | undefined;
    let backstopTkn: string | undefined;
    let poolFactory: string | undefined;
    const rewardZone: string[] = [];
    const backstopConfigEntries = await stellarRpc.getLedgerEntries(
      contractInstanceDataKey,
      rewardZoneDataKey
    );
    for (const entry of backstopConfigEntries.entries) {
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
                case 'BLNDTkn':
                  blndTkn = Address.fromScVal(entry.val()).toString();
                  break;
                case 'BToken':
                  backstopTkn = Address.fromScVal(entry.val()).toString();
                  break;
                case 'USDCTkn':
                  usdcTkn = Address.fromScVal(entry.val()).toString();
                  break;
                case 'PoolFact':
                  poolFactory = Address.fromScVal(entry.val()).toString();
                  break;
                case 'Emitter':
                  emitter = Address.fromScVal(entry.val()).toString();
                  break;
                case 'IsInit':
                  // do nothing
                  break;
                default:
                  throw Error(
                    `Invalid backstop instance storage key: should not contain ${instanceKey}`
                  );
              }
            });
          break;
        case 'RZ':
          ledgerData
            .val()
            .vec()
            .map((address) => {
              rewardZone.push(Address.fromScVal(address).toString());
            });
          break;
        default:
          throw Error(`Invalid backstop config key: should not contain ${key}`);
      }
    }

    if (
      emitter == undefined ||
      blndTkn == undefined ||
      usdcTkn == undefined ||
      backstopTkn == undefined ||
      poolFactory == undefined
    ) {
      throw Error('Unable to load backstop config undefined values');
    }
    return new BackstopConfig(
      emitter,
      blndTkn,
      usdcTkn,
      backstopTkn,
      poolFactory,
      rewardZone,
      backstopConfigEntries.latestLedger
    );
  }
}
