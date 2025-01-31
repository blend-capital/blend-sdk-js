import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import {
  EmissionConfig,
  EmissionData,
  EmissionDataV2,
  Emissions,
  EmissionsV1,
  EmissionsV2,
} from '../emissions.js';
import { FixedMath, Network, i128 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export abstract class BackstopPool {
  constructor(
    public poolBalance: PoolBalance,
    public emissions: Emissions | undefined,
    public latestLedger: number
  ) {}

  /**
   * Fetch the emission per year per non-Q4W backstop token
   * @returns The emission per year per backstop token as a float
   */
  public emissionPerYearPerBackstopToken(): number {
    if (this.emissions == undefined) {
      return 0;
    }
    const tokensNotInQ4w = this.sharesToBackstopTokens(
      this.poolBalance.shares - this.poolBalance.q4w
    );
    return this.emissions.emissionsPerYearPerToken(tokensNotInQ4w, 7);
  }

  /**
   * Convert backstop tokens to shares
   * @param backstopTokens - The number of backstop tokens to convert
   * @returns - The number of shares as a fixed point number
   */
  public backstopTokensToShares(backstopTokens: bigint | number): bigint {
    if (typeof backstopTokens === 'number') {
      backstopTokens = FixedMath.toFixed(backstopTokens, 7);
    }

    if (this.poolBalance.shares === BigInt(0)) {
      return backstopTokens;
    }
    return FixedMath.mulFloor(backstopTokens, this.poolBalance.shares, this.poolBalance.tokens);
  }

  /**
   * Convert shares to backstop tokens
   * @param shares - The number of shares to convert
   * @returns - The number of backstop tokens as a fixed point number
   */
  public sharesToBackstopTokens(shares: bigint): bigint {
    if (this.poolBalance.shares === BigInt(0)) {
      return shares;
    }
    return FixedMath.mulFloor(shares, this.poolBalance.tokens, this.poolBalance.shares);
  }

  /**
   * Convert shares to backstop tokens
   * @param shares - The number of shares to convert
   * @returns - The number of backstop tokens as a floating point number
   */
  public sharesToBackstopTokensFloat(shares: bigint): number {
    return FixedMath.toFloat(this.sharesToBackstopTokens(shares), 7);
  }
}
export class BackstopPoolV1 extends BackstopPool {
  constructor(
    public poolBalance: PoolBalance,
    public toGulpEmissions: bigint,
    public emissions: EmissionsV1 | undefined,
    public latestLedger: number
  ) {
    super(poolBalance, emissions, latestLedger);
  }
  static async load(
    network: Network,
    backstopId: string,
    poolId: string,
    timestamp?: number | undefined
  ) {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
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
    const backstopPoolDataEntries = await stellarRpc.getLedgerEntries(
      poolBalanceDataKey,
      poolEmisDataKey,
      BackstopEmissionConfig.ledgerKey(backstopId, poolId),
      BackstopEmissionData.ledgerKey(backstopId, poolId)
    );

    let emission_config: EmissionConfig | undefined;
    let emission_data: EmissionData | undefined;
    let poolBalance = new PoolBalance(BigInt(0), BigInt(0), BigInt(0));
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
        case 'BEmisCfg':
          emission_config = EmissionConfig.fromLedgerEntryData(ledgerData);
          break;
        case 'BEmisData':
          emission_data = EmissionData.fromLedgerEntryData(ledgerData);
          break;
        default:
          throw new Error(`Invalid backstop pool key: should not contain ${key}`);
      }
    }

    let emissions: Emissions | undefined;
    if (emission_config != undefined && emission_data != undefined) {
      emissions = new EmissionsV1(
        emission_config,
        emission_data,
        backstopPoolDataEntries.latestLedger
      );
      emissions.accrue(poolBalance.shares - poolBalance.q4w, 7, timestamp);
    }

    return new BackstopPoolV1(
      poolBalance,
      toGulpEmissions,
      emissions,
      backstopPoolDataEntries.latestLedger
    );
  }
}

export class BackstopPoolV2 extends BackstopPool {
  constructor(
    public poolBalance: PoolBalance,
    public emissions: EmissionsV1 | undefined,
    latestLedger: number
  ) {
    super(poolBalance, emissions, latestLedger);
  }

  static async load(
    network: Network,
    backstopId: string,
    poolId: string,
    timestamp?: number | undefined
  ) {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
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
    const backstopPoolDataEntries = await stellarRpc.getLedgerEntries(
      poolBalanceDataKey,
      poolEmisDataKey,
      BackstopEmissionData.ledgerKey(backstopId, poolId)
    );

    let emission_data: EmissionDataV2 | undefined;
    let poolBalance = new PoolBalance(BigInt(0), BigInt(0), BigInt(0));
    for (const entry of backstopPoolDataEntries.entries) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'PoolBalance': {
          poolBalance = PoolBalance.fromLedgerEntryData(ledgerData);
          break;
        }
        case 'BEmisData':
          emission_data = EmissionDataV2.fromLedgerEntryData(ledgerData);
          break;
        default:
          throw new Error(`Invalid backstop pool key: should not contain ${key}`);
      }
    }

    let emissions: Emissions | undefined;
    if (emission_data != undefined) {
      emissions = new EmissionsV2(emission_data, backstopPoolDataEntries.latestLedger);
      emissions.accrue(poolBalance.shares - poolBalance.q4w, 7, timestamp);
    }
    return new BackstopPoolV2(poolBalance, emissions, backstopPoolDataEntries.latestLedger);
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
