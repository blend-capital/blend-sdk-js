import { Address, SorobanRpc, scValToNative, xdr } from 'stellar-sdk';
import { Network, i128 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { EmissionConfig, EmissionData, Emissions } from '../emissions.js';

export class BackstopPoolData {
  constructor(
    public poolBalance: PoolBalance,
    public toGulpEmissions: bigint,
    public emissions: Emissions | undefined
  ) {}

  static async load(network: Network, backstopId: string, poolId: string) {
    const rpc = new SorobanRpc.Server(network.rpc, network.opts);
    const poolBalanceDataKey = PoolBalance.ledgerKey(backstopId, poolId);
    const poolEmisDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('PoolEmis'),
          Address.fromString(poolId).toScVal(),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const backstopPoolDataPromise = rpc.getLedgerEntries(poolBalanceDataKey, poolEmisDataKey);
    const backstopEmissionsPromise = Emissions.load(
      network,
      BackstopEmissionConfig.ledgerKey(backstopId, poolId),
      BackstopEmissionData.ledgerKey(backstopId, poolId)
    );
    const [backstopPoolDataEntries, poolEmissions] = await Promise.all([
      backstopPoolDataPromise,
      backstopEmissionsPromise,
    ]);

    console.log(backstopPoolDataEntries);
    let poolBalance: PoolBalance | undefined;
    let toGulpEmissions = BigInt(0);
    for (const entry of backstopPoolDataEntries.entries) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'PoolBalance': {
          poolBalance = PoolBalance.fromLedgerEntryData(ledgerData);
          break;
        }
        case 'PoolEmis':
          toGulpEmissions = scValToNative(ledgerData.contractData().val());
          break;
        default:
          throw new Error(`Invalid backstop pool key: should not contain ${key}`);
      }
    }
    if (poolBalance == undefined) {
      throw new Error('Error: Unable to load backstop pool data');
    }
    return new BackstopPoolData(poolBalance, toGulpEmissions, poolEmissions);
  }
}

export class PoolBalance {
  constructor(public shares: i128, public tokens: i128, public q4w: i128) {}

  static ledgerKey(backstopId: string, poolId: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('PoolBalance'),
          Address.fromString(poolId).toScVal(),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): PoolBalance {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('PoolBalance contract data value is not a map');
    }
    let shares: bigint | undefined;
    let tokens: bigint | undefined;
    let q4w: bigint | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'shares':
          shares = scValToNative(map_entry.val());
          break;
        case 'tokens':
          tokens = scValToNative(map_entry.val());
          break;
        case 'q4w':
          q4w = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid PoolBalance key: should not contain ${key}`);
      }
    }

    if (shares == undefined || tokens == undefined || q4w == undefined) {
      throw Error(`Malformed PoolBalance scvMap `);
    }
    return new PoolBalance(shares, tokens, q4w);
  }
}

export class BackstopEmissionConfig extends EmissionConfig {
  static ledgerKey(backstopId: string, poolId: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('BEmisCfg'),
          Address.fromString(poolId).toScVal(),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }
}

export class BackstopEmissionData extends EmissionData {
  static ledgerKey(backstopId: string, poolId: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('BEmisData'),
          Address.fromString(poolId).toScVal(),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }
}
