import {
  Account,
  Address,
  Contract,
  Server,
  SorobanRpc,
  TransactionBuilder,
  scValToNative,
  xdr,
} from 'soroban-client';
import { Network, i128, u32, u64 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export type EstReserveData = {
  bRate: number;
  dRate: number;
  totalSupply: number;
  totalLiabilities: number;
  currentApy: number;
  currentUtil: number;
};

// TODO: add emission config and data
export class Reserve {
  constructor(
    public assetId: string,
    public symbol: string,
    public poolTokens: bigint,
    public config: ReserveConfig,
    public data: ReserveData,
    public emissionConfig: ReserveEmissionConfig | undefined,
    public emissionData: ReserveEmissionData | undefined
  ) {}
  static async load(network: Network, poolId: string, assetId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const reserveConfigKey = ReserveConfig.contractDataKey(poolId, assetId);
    const reserveDataKey = ReserveData.contractDataKey(poolId, assetId);
    const tokenConfigKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(assetId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const reserveLedgerEntries = await SorobanRpc.getLedgerEntries(
      tokenConfigKey,
      reserveConfigKey,
      reserveDataKey
    );

    let reserveConfig: ReserveConfig;
    let reserveData: ReserveData;
    let tokenConfig: TokenConfig;
    let emissionConfig: ReserveEmissionConfig | undefined;
    let emissionData: ReserveEmissionData | undefined;

    for (const entry of reserveLedgerEntries.entries) {
      const ledgerData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64').contractData();
      const key = decodeEntryKey(ledgerData.key());
      switch (key) {
        case 'ResConfig':
          reserveConfig = ReserveConfig.fromContractDataXDR(entry.xdr);
          break;
        case 'ResData':
          reserveData = ReserveData.fromContractDataXDR(entry.xdr);
          break;
        // @dev this case is for the TokenConfig
        case 'ContractInstance':
          tokenConfig = loadTokenConfig(entry.xdr);
          break;
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }
    const poolTokens = await getTokenBalance(
      SorobanRpc,
      network.passphrase,
      assetId,
      Address.fromString(poolId)
    );
    const supplyEmissionConfigKey = ReserveEmissionConfig.contractDataKey(
      poolId,
      reserveConfig.index * 2 + 1
    );

    const supplyEmissionDataKey = ReserveEmissionData.contractDataKey(
      poolId,
      reserveConfig.index * 2 + 1
    );
    const borrowEmissionConfigKey = ReserveEmissionConfig.contractDataKey(
      poolId,
      reserveConfig.index * 2
    );

    const borrowEmissionDataKey = ReserveEmissionData.contractDataKey(
      poolId,
      reserveConfig.index * 2
    );
    const emissionLedgerEntries = await SorobanRpc.getLedgerEntries(
      supplyEmissionConfigKey,
      supplyEmissionDataKey,
      borrowEmissionConfigKey,
      borrowEmissionDataKey
    );
    for (const entry of emissionLedgerEntries.entries) {
      const ledgerData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64').contractData();
      const key = decodeEntryKey(ledgerData.key());
      switch (key) {
        case 'EmisConfig':
          emissionConfig = ReserveEmissionConfig.fromContractDataXDR(entry.xdr);
          break;
        case 'EmisData':
          emissionData = ReserveEmissionData.fromContractDataXDR(entry.xdr);
          break;
        default:
          throw Error(`Invalid reserve emission key: should not contain ${key}`);
      }
    }

    if (
      assetId == undefined ||
      tokenConfig == undefined ||
      poolTokens == undefined ||
      reserveConfig == undefined ||
      reserveData == undefined
    ) {
      throw Error('Unable to load reserve');
    }
    return new Reserve(
      assetId,
      tokenConfig.symbol,
      poolTokens,
      reserveConfig,
      reserveData,
      emissionConfig,
      emissionData
    );
  }

  /**
   * Estimate the reserve data at a given block
   *
   * Translated from: https://github.com/blend-capital/blend-contracts/blob/main/lending-pool/src/reserve.rs#L113
   *
   * @param backstop_take_rate - The block number to accrue to, or undefined to remain at the Reserve's last block
   * @param timestamp - The timestamp to accrue to, or undefined to remain at the Reserve's last block
   * @returns The estimated b_rate, d_rate, and cur_apy (as decimal)
   */
  public estimateData(backstop_take_rate: number, timestamp: number | undefined): EstReserveData {
    const base_rate = 0.01; // base rate
    const scaler = 10 ** this.config.decimals;
    let d_rate = Number(this.data.dRate) / 1e9;
    let total_liabilities = (Number(this.data.dSupply) / scaler) * d_rate;
    let b_rate =
      this.data.bSupply == BigInt(0)
        ? 1
        : (total_liabilities + Number(this.poolTokens) / scaler) /
          (Number(this.data.bSupply) / scaler);
    let total_supply = (Number(this.data.bSupply) / scaler) * b_rate;

    if (total_supply != 0) {
      let cur_apy: number;
      const cur_ir_mod = Number(this.data.interestRateModifier) / 1e9;
      const cur_util = total_liabilities / total_supply;
      const target_util = this.config.util / 1e7;
      if (cur_util <= target_util) {
        cur_apy = (cur_util / target_util) * (this.config.r_one / 1e7) + base_rate;
        cur_apy *= cur_ir_mod;
      } else if (target_util < cur_util && cur_util <= 0.95) {
        cur_apy =
          ((cur_util - target_util) / (0.95 - target_util)) * (this.config.r_two / 1e7) +
          this.config.r_one / 1e7 +
          base_rate;
        cur_apy *= cur_ir_mod;
      } else {
        cur_apy =
          ((cur_util - 0.95) / 0.05) * (this.config.r_three / 1e7) +
          cur_ir_mod * (this.config.r_two / 1e7 + this.config.r_one / 1e7 + base_rate);
      }
      const accrual =
        ((timestamp != undefined ? timestamp - Number(this.data.lastTime) : 0) / 31536000) *
          cur_apy +
        1;
      if (backstop_take_rate > 0) {
        const b_accrual = (accrual - 1) * cur_util;
        total_supply *= b_accrual * backstop_take_rate + 1;
        b_rate *= b_accrual * (1 - backstop_take_rate) + 1;
      } else {
        const b_accrual = (accrual - 1) * cur_util;
        total_supply *= b_accrual + 1;
        b_rate *= b_accrual + 1;
      }
      total_liabilities *= accrual;
      d_rate *= accrual;
      return {
        bRate: b_rate,
        dRate: d_rate,
        totalSupply: total_supply,
        totalLiabilities: total_liabilities,
        currentApy: cur_apy,
        currentUtil: cur_util,
      };
    } else {
      // total supply is zero, can't perform estimation
      return {
        bRate: b_rate,
        dRate: d_rate,
        totalSupply: total_supply,
        totalLiabilities: total_liabilities,
        currentApy: base_rate,
        currentUtil: 0,
      };
    }
  }
}

/********** LedgerDataEntry Helpers **********/
export class ReserveConfig {
  constructor(
    public index: number,
    public decimals: number,
    public c_factor: number,
    public l_factor: number,
    public util: number,
    public max_util: number,
    public r_one: number,
    public r_two: number,
    public r_three: number,
    public reactivity: number
  ) {}

  static contractDataKey(poolId: string, assetId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('ResConfig'),
      Address.fromString(assetId).toScVal(),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromContractDataXDR(xdr_string: string): ReserveConfig {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('ReserveConfig contract data value is not a map');
    }

    let index: number | undefined;
    let decimals: number | undefined;
    let c_factor: number | undefined;
    let l_factor: number | undefined;
    let util: number | undefined;
    let max_util: number | undefined;
    let r_one: number | undefined;
    let r_two: number | undefined;
    let r_three: number | undefined;
    let reactivity: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'decimals':
          decimals = scValToNative(map_entry.val());
          break;
        case 'c_factor':
          c_factor = scValToNative(map_entry.val());
          break;
        case 'l_factor':
          l_factor = scValToNative(map_entry.val());
          break;
        case 'util':
          util = scValToNative(map_entry.val());
          break;
        case 'max_util':
          max_util = scValToNative(map_entry.val());
          break;
        case 'r_one':
          r_one = scValToNative(map_entry.val());
          break;
        case 'r_two':
          r_two = scValToNative(map_entry.val());
          break;
        case 'r_three':
          r_three = scValToNative(map_entry.val());
          break;
        case 'reactivity':
          reactivity = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid ReserveConfig key should not contain ${key}`);
      }
    }

    if (
      index == undefined ||
      c_factor == undefined ||
      decimals == undefined ||
      index == undefined ||
      l_factor == undefined ||
      max_util == undefined ||
      r_one == undefined ||
      r_three == undefined ||
      r_two == undefined ||
      reactivity == undefined ||
      util == undefined
    ) {
      throw Error('ReserveConfig scvMap value malformed');
    }
    return new ReserveConfig(
      index,
      decimals,
      c_factor,
      l_factor,
      util,
      max_util,
      r_one,
      r_two,
      r_three,
      reactivity
    );
  }
}

export class ReserveData {
  constructor(
    public dRate: bigint,
    public bRate: bigint,
    public interestRateModifier: bigint,
    public bSupply: bigint,
    public dSupply: bigint,
    public backstopCredit: bigint,
    public lastTime: bigint
  ) {}
  static contractDataKey(poolId: string, assetId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('ResData'),
      Address.fromString(assetId).toScVal(),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }
  static fromContractDataXDR(xdr_string: string): ReserveData {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('ReserveData contract data value is not a map');
    }

    let d_rate: bigint | undefined;
    let b_rate: bigint | undefined;
    let ir_mod: bigint | undefined;
    let b_supply: bigint | undefined;
    let d_supply: bigint | undefined;
    let backstop_credit: bigint | undefined;
    let last_time: bigint | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'd_rate':
          d_rate = scValToNative(map_entry.val());
          break;
        case 'b_rate':
          b_rate = scValToNative(map_entry.val());
          break;
        case 'ir_mod':
          ir_mod = scValToNative(map_entry.val());
          break;
        case 'b_supply':
          b_supply = scValToNative(map_entry.val());
          break;
        case 'd_supply':
          d_supply = scValToNative(map_entry.val());
          break;
        case 'backstop_credit':
          backstop_credit = scValToNative(map_entry.val());
          break;
        case 'last_time':
          last_time = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid ReserveData key should not contain ${key}`);
      }
    }

    if (
      d_rate == undefined ||
      b_rate == undefined ||
      ir_mod == undefined ||
      b_supply == undefined ||
      d_supply == undefined ||
      backstop_credit == undefined ||
      last_time == undefined
    ) {
      throw Error('Error: ReserveData scvMap value malformed');
    }

    return new ReserveData(d_rate, b_rate, ir_mod, b_supply, d_supply, backstop_credit, last_time);
  }
}

export class ReserveEmissionConfig {
  constructor(public eps: u64, public expiration: u64) {}

  static contractDataKey(poolId: string, reserveIndex: u32) {
    const res: xdr.ScVal[] = [xdr.ScVal.scvSymbol('EmisConfig'), xdr.ScVal.scvU32(reserveIndex)];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromContractDataXDR(xdr_string: string): ReserveEmissionConfig | undefined {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('ReserveEmissionConfig contract data value is not a map');
    }
    let expiration: number | undefined;
    let eps: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());

      switch (key) {
        case 'expiration':
          expiration = scValToNative(map_entry.val());
          break;
        case 'eps':
          eps = scValToNative(map_entry.val());
          break;
        default:
          throw Error(`Invalid ReserveData key: should not contain ${key}`);
      }
    }
    if (eps == undefined || expiration == undefined) {
      throw Error('ReserveEmissionConfig scvMap value malformed');
    }
    return new ReserveEmissionConfig(BigInt(eps), BigInt(expiration));
  }
}

/**
 * The emission data for the reserve b or d token
 */
export class ReserveEmissionData {
  constructor(public index: i128, public lastTime: u64) {}

  static contractDataKey(poolId: string, reserveIndex: u32) {
    const res: xdr.ScVal[] = [xdr.ScVal.scvSymbol('EmisData'), xdr.ScVal.scvU32(reserveIndex)];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromContractDataXDR(xdr_string: string): ReserveEmissionData | undefined {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('ReserveEmissionData contract data value is not a map');
    }

    let index: bigint | undefined;
    let last_time: number | undefined;
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'last_time':
          last_time = scValToNative(map_entry.val());
          break;
        default:
          throw new Error(`Invalid ReserveEmissionData key: should not contain ${key}`);
      }
    }

    if (index == undefined || last_time == undefined) {
      throw new Error(`ReserveEmissionData scvMap value malformed`);
    }

    return {
      index,
      lastTime: BigInt(last_time),
    };
  }
}

interface TokenConfig {
  name: string;
  symbol: string;
  decimal: number;
}

export function loadTokenConfig(xdr_string: string): TokenConfig {
  let name: string | undefined;
  let symbol: string | undefined;
  let decimal: number | undefined;

  xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .val()
    .instance()
    .storage()
    ?.map((entry) => {
      const key = decodeEntryKey(entry.key());
      switch (key) {
        case 'METADATA':
          entry
            .val()
            .map()
            ?.map((meta_entry) => {
              const metadataKey = decodeEntryKey(meta_entry.key());
              switch (metadataKey) {
                case 'name':
                  name = scValToNative(meta_entry.val());
                  return;
                case 'symbol':
                  symbol = scValToNative(meta_entry.val());
                  return;
                case 'decimal':
                  decimal = scValToNative(meta_entry.val());
                  return;
                default:
                  throw new Error(`Invalid token metadata key: should not contain ${metadataKey}`);
              }
            });
          break;
        default:
          break;
      }
    });
  if (name == undefined || symbol == undefined || decimal == undefined) {
    throw Error('Token config malformed');
  }
  return { name, symbol, decimal };
}

async function getTokenBalance(
  stellar_rpc: Server,
  network_passphrase: string,
  token_id: string,
  address: Address
): Promise<bigint> {
  // account does not get validated during simulateTx
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: network_passphrase,
  });
  tx_builder.addOperation(new Contract(token_id).call('balance', address.toScVal()));
  const result: SorobanRpc.SimulateTransactionResponse = await stellar_rpc.simulateTransaction(
    tx_builder.build()
  );
  const scval_result = result;
  if (scval_result == undefined) {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
  if (SorobanRpc.isSimulationSuccess(result)) {
    const val = scValToNative(result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
}
