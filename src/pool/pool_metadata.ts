import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Network, PoolConfig } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export interface PoolMetadata {
  admin: string;
  name: string;
  backstop: string;
  backstopRate: number;
  maxPositions: number;
  oracle: string;
  status: number;
  latestLedger: number;
}

export class PoolMetadataV1 implements PoolMetadata {
  constructor(
    public admin: string,
    public name: string,
    public backstop: string,
    public backstopRate: number,
    public maxPositions: number,
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
          ledgerData
            .val()
            .instance()
            .storage()
            ?.map((entry) => {
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
                    `Invalid pool instance storage key: should not contain ${instanceKey}`
                  );
              }
            });
          break;
        }
        case 'ResList':
          reserveList = scValToNative(ledgerData.val());
          break;
        default:
          throw Error(`Invalid PoolConfig key: should not contain ${key}`);
      }
    }
    if (
      admin == undefined ||
      name == undefined ||
      backstop == undefined ||
      poolConfig == undefined ||
      reserveList == undefined ||
      poolConfigEntries.entries.length == 0
    ) {
      throw Error('Unable to load pool config');
    }
    return new PoolMetadataV1(
      admin,
      name,
      backstop,
      poolConfig.backstopRate,
      poolConfig.maxPositions,
      poolConfig.oracle,
      poolConfig.status,
      reserveList,
      poolConfigEntries.latestLedger
    );
  }
}

export class PoolMetadataV2 implements PoolMetadata {
  constructor(
    public admin: string,
    public name: string,
    public backstop: string,
    public backstopRate: number,
    public maxPositions: number,
    public oracle: string,
    public status: number,
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

    let admin: string | undefined;
    let name: string | undefined;
    let backstop: string | undefined;
    let poolConfig: PoolConfig | undefined;

    const poolConfigEntries = await stellarRpc.getLedgerEntries(contractInstanceKey);
    for (const entry of poolConfigEntries.entries ?? []) {
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
                    `Invalid pool instance storage key: should not contain ${instanceKey}`
                  );
              }
            });
          break;
        }

        default:
          throw Error(`Invalid PoolConfig key: should not contain ${key}`);
      }
    }
    if (
      admin == undefined ||
      name == undefined ||
      backstop == undefined ||
      poolConfig == undefined ||
      poolConfigEntries.entries.length == 0
    ) {
      throw Error('Unable to load pool config');
    }
    return new PoolMetadataV2(
      admin,
      name,
      backstop,
      poolConfig.backstopRate,
      poolConfig.maxPositions,
      poolConfig.oracle,
      poolConfig.status,
      poolConfigEntries.latestLedger
    );
  }
}
