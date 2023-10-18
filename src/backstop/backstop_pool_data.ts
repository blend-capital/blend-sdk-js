import { Address, Server, scValToNative, xdr } from 'soroban-client';
import { Network, i128, u64 } from '../index.js';
export class BackstopPoolData {
  constructor(
    public poolBalance: PoolBalance,
    public poolEps: bigint,
    public emissionConfig: BackstopEmissionConfig | undefined,
    public emissionData: BackstopEmissionData | undefined
  ) {}

  static async load(network: Network, backstopId: string, poolId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const poolBalanceDataKey = PoolBalance.contractDataKey(backstopId, poolId);
    const poolEpsDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('PoolEPS'),
          Address.fromString(poolId).toScVal(),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const emissionConfigDataKey = BackstopEmissionConfig.contractDataKey(backstopId, poolId);
    const emissionDataDataKey = BackstopEmissionData.contractDataKey(backstopId, poolId);
    const backstopPoolDataEntries =
      (
        await SorobanRpc.getLedgerEntries(
          poolBalanceDataKey,
          poolEpsDataKey,
          emissionConfigDataKey,
          emissionDataDataKey
        )
      ).entries ?? [];

    let poolBalance: PoolBalance | undefined;
    let poolEps: i128 | undefined;
    let emissionConfig: BackstopEmissionConfig | undefined;
    let emissionData: BackstopEmissionData | undefined;

    for (const entry of backstopPoolDataEntries) {
      const ledgerData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64').contractData();
      let key: xdr.ScVal;
      switch (ledgerData.key().switch()) {
        case xdr.ScValType.scvVec():
          key = ledgerData.key().vec()?.at(0) ?? xdr.ScVal.scvSymbol('Void');
          break;
        default:
          key = xdr.ScVal.scvSymbol('Void');
      }
      switch (key.sym().toString()) {
        case 'PoolBalance': {
          poolBalance = PoolBalance.fromContractDataXDR(entry.xdr);
          break;
        }
        case 'PoolEPS':
          poolEps = scValToNative(ledgerData.val());
          break;
        case 'BEmisCfg': {
          emissionConfig = BackstopEmissionConfig.fromContractDataXDR(entry.xdr);
          break;
        }
        case 'BEmisData': {
          emissionData = BackstopEmissionData.fromContractDataXDR(entry.xdr);
          break;
        }
        default:
          throw new Error('Error: invalid scMap entry on backstop pool data');
      }
    }
    if (poolBalance == undefined || poolEps == undefined) {
      throw new Error('Error: Unable to load backstop pool data');
    }
    return new BackstopPoolData(poolBalance, poolEps, emissionConfig, emissionData);
  }
}

export class PoolBalance {
  constructor(public shares: i128, public tokens: i128, public q4w: i128) {}

  static contractDataKey(backstopId: string, poolId: string): xdr.LedgerKey {
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

  static fromContractDataXDR(xdr_string: string) {
    const ledgerData = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
    let shares: bigint | undefined;
    let tokens: bigint | undefined;
    let q4w: bigint | undefined;

    for (const map_entry of ledgerData.val().map() ?? []) {
      switch (map_entry?.key()?.sym()?.toString()) {
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
          throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
      }
    }

    if (shares == undefined || tokens == undefined || q4w == undefined) {
      throw Error(`scvMap value malformed`);
    }
    return new PoolBalance(shares, tokens, q4w);
  }
}

export class BackstopEmissionConfig {
  constructor(public expiration: u64, public eps: u64) {}

  static contractDataKey(backstopId: string, poolId: string): xdr.LedgerKey {
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

  static fromContractDataXDR(xdr_string: string) {
    const ledgerData = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
    let expiration: u64 | undefined;
    let eps: u64 | undefined;

    for (const map_entry of ledgerData.val().map() ?? []) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'expiration':
          expiration = scValToNative(map_entry.val());
          break;
        case 'eps':
          eps = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
      }
    }

    if (expiration == undefined || eps == undefined) {
      throw Error(`scvMap value malformed`);
    }
    return new BackstopEmissionConfig(expiration, eps);
  }
}

export class BackstopEmissionData {
  constructor(public index: u64, public lastTime: u64) {}

  static contractDataKey(backstopId: string, poolId: string): xdr.LedgerKey {
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

  static fromContractDataXDR(xdr_string: string) {
    const ledgerData = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
    let index: i128 | undefined;
    let lastTime: u64 | undefined;

    for (const map_entry of ledgerData.val().map() ?? []) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'last_time':
          lastTime = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
      }
    }

    if (index == undefined || lastTime == undefined) {
      throw Error(`scvMap value malformed`);
    }
    return new BackstopEmissionData(index, lastTime);
  }
}
