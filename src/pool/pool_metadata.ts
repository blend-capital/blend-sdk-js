import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { ErrorTypes, Network, PoolConfig } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export class PoolMetadata {
  constructor(
    public wasmHash: string,
    public admin: string,
    public name: string,
    public backstop: string,
    public backstopRate: number,
    public maxPositions: number,
    public minCollateral: bigint,
    public oracle: string,
    public status: number,
    public reserveList: string[],
    public latestLedger: number
  ) {}

  static async load(network: Network, poolId: string) {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const contractInstanceKey = xdr.LedgerKey.contractData(
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
    let washHash: string | undefined;
    let admin: string | undefined;
    let name: string | undefined;
    let backstop: string | undefined;
    let poolConfig: PoolConfig | undefined;
    let reserveList: string[] | undefined;

    const poolConfigEntries = await stellarRpc.getLedgerEntries(
      contractInstanceKey,
      reserveListDataKey
    );
    for (const entry of poolConfigEntries.entries ?? []) {
      const ledgerData = entry.val.contractData();
      const key = decodeEntryKey(ledgerData.key());
      switch (key) {
        case 'ContractInstance': {
          const instance = ledgerData.val().instance();
          instance.storage()?.map((entry) => {
            const instanceKey = decodeEntryKey(entry.key());
            switch (instanceKey) {
              case 'Admin':
                admin = Address.fromScVal(entry.val()).toString();
                return;
              case 'Backstop':
                backstop = Address.fromScVal(entry.val()).toString();
                return;
              case 'BLNDTkn':
                return;
              case 'Config':
                poolConfig = PoolConfig.fromScVal(entry.val());
                return;
              case 'Name':
                name = entry.val().str().toString();
                return;
              case 'IsInit':
                // do nothing
                break;
              default:
                throw Error(
                  `${ErrorTypes.LedgerEntryParseError}: pool instance storage key: should not contain ${instanceKey}`
                );
            }
          });
          washHash = instance.executable()?.wasmHash()?.toString('hex');
          break;
        }
        case 'ResList':
          reserveList = scValToNative(ledgerData.val());
          break;
        default:
          throw Error(
            `${ErrorTypes.LedgerEntryParseError}: Invalid PoolConfig key: should not contain ${key}`
          );
      }
    }
    if (
      washHash == undefined ||
      admin == undefined ||
      name == undefined ||
      backstop == undefined ||
      poolConfig == undefined ||
      reserveList == undefined ||
      poolConfigEntries.entries.length == 0
    ) {
      throw Error(`${ErrorTypes.LedgerEntryParseError}: Unable to parse data for pool config`);
    }
    return new PoolMetadata(
      washHash,
      admin,
      name,
      backstop,
      poolConfig.backstopRate,
      poolConfig.maxPositions,
      poolConfig.minCollateral ?? 0n,
      poolConfig.oracle,
      poolConfig.status,
      reserveList,
      poolConfigEntries.latestLedger
    );
  }
}
