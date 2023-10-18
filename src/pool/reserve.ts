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
import { scvalToBigInt, scvalToNumber } from '../scval_converter.js';
import { Network, i128, u32, u64 } from '../index.js';

export type EstReserveData = {
  b_rate: number;
  d_rate: number;
  total_supply: number;
  total_liabilities: number;
  cur_apy: number;
  cur_util: number;
};

// TODO: add emission config and data
export class Reserve {
  constructor(
    public AssetId: string,
    public symbol: string,
    public poolTokens: bigint,
    public config: ReserveConfig,
    public data: ReserveData,
    public emissionConfig: ReserveEmissionConfig | undefined,
    public emissionData: ReserveEmissionData | undefined
  ) {}
  static async load(network: Network, poolId: string, AssetId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const reserveConfigKey = ReserveConfig.contractDataKey(poolId, AssetId);
    const reserveDataKey = ReserveData.contractDataKey(poolId, AssetId);
    const tokenConfigKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(AssetId).toScAddress(),
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
      let key: xdr.ScVal;
      switch (ledgerData.key().switch()) {
        case xdr.ScValType.scvVec():
          key = ledgerData.key().vec().at(0);
          break;
        case xdr.ScValType.scvLedgerKeyContractInstance():
          key = xdr.ScVal.scvSymbol('TokenConfig');
      }
      switch (key.sym().toString()) {
        case 'ResConfig':
          reserveConfig = ReserveConfig.fromContractDataXDR(entry.xdr);
          break;
        case 'ResData':
          reserveData = ReserveData.fromContractDataXDR(entry.xdr);
          break;
        case 'TokenConfig':
          tokenConfig = loadTokenConfig(entry.xdr);
      }
    }
    const poolTokens = await getTokenBalance(
      SorobanRpc,
      network.passphrase,
      AssetId,
      Address.fromString(poolId)
    );
    const supplyEmissionConfigXDR = ReserveEmissionConfig.contractDataKey(
      poolId,
      reserveConfig.index * 2 + 1
    );

    const supplyEmissionDataXDR = ReserveEmissionData.contractDataKey(
      poolId,
      reserveConfig.index * 2 + 1
    );
    const borrowEmissionConfigXDR = ReserveEmissionConfig.contractDataKey(
      poolId,
      reserveConfig.index * 2
    );

    const borrowEmissionDataXDR = ReserveEmissionData.contractDataKey(
      poolId,
      reserveConfig.index * 2
    );
    const emissionLedgerEntries = await SorobanRpc.getLedgerEntries(
      supplyEmissionConfigXDR,
      supplyEmissionDataXDR,
      borrowEmissionConfigXDR,
      borrowEmissionDataXDR
    );
    for (const entry of emissionLedgerEntries.entries) {
      const entryKey = xdr.LedgerKey.fromXDR(entry.key, 'base64').contractData().key().vec().at(0);
      switch (entryKey.sym().toString()) {
        case 'EmisConfig':
          emissionConfig = ReserveEmissionConfig.fromContractDataXDR(entry.xdr);
          break;
        case 'EmisData':
          emissionData = ReserveEmissionData.fromContractDataXDR(entry.xdr);
          break;
      }
    }
    return new Reserve(
      AssetId,
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
    let d_rate = Number(this.data.d_rate) / 1e9;
    let total_liabilities = (Number(this.data.d_supply) / scaler) * d_rate;
    let b_rate =
      this.data.b_supply == BigInt(0)
        ? 1
        : (total_liabilities + Number(this.poolTokens) / scaler) /
          (Number(this.data.b_supply) / scaler);
    let total_supply = (Number(this.data.b_supply) / scaler) * b_rate;

    if (total_supply != 0) {
      let cur_apy: number;
      const cur_ir_mod = Number(this.data.ir_mod) / 1e9;
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
        ((timestamp != undefined ? timestamp - this.data.last_time : 0) / 31536000) * cur_apy + 1;
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
        b_rate,
        d_rate,
        total_supply,
        total_liabilities,
        cur_apy,
        cur_util,
      };
    } else {
      // total supply is zero, can't perform estimation
      return { b_rate, d_rate, total_supply, total_liabilities, cur_apy: base_rate, cur_util: 0 };
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
      throw Error('Error: ReserveConfig contract data value is not a map');
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
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'index':
          index = scvalToNumber(map_entry.val());
          break;
        case 'decimals':
          decimals = scvalToNumber(map_entry.val());
          break;
        case 'c_factor':
          c_factor = scvalToNumber(map_entry.val());
          break;
        case 'l_factor':
          l_factor = scvalToNumber(map_entry.val());
          break;
        case 'util':
          util = scvalToNumber(map_entry.val());
          break;
        case 'max_util':
          max_util = scvalToNumber(map_entry.val());
          break;
        case 'r_one':
          r_one = scvalToNumber(map_entry.val());
          break;
        case 'r_two':
          r_two = scvalToNumber(map_entry.val());
          break;
        case 'r_three':
          r_three = scvalToNumber(map_entry.val());
          break;
        case 'reactivity':
          reactivity = scvalToNumber(map_entry.val());
          break;
        default:
          throw Error('Error: ReserveConfig scvMap value malformed');
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
      throw Error('Error: ReserveConfig scvMap value malformed');
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
    public d_rate: bigint,
    public b_rate: bigint,
    public ir_mod: bigint,
    public b_supply: bigint,
    public d_supply: bigint,
    public backstop_credit: bigint,
    public last_time: number
  ) {}
  static contractDataKey(poolId: string, AssetId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('ResData'),
      Address.fromString(AssetId).toScVal(),
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
      throw Error('Error: ReserveData contract data value is not a map');
    }

    let d_rate: bigint | undefined;
    let b_rate: bigint | undefined;
    let ir_mod: bigint | undefined;
    let b_supply: bigint | undefined;
    let d_supply: bigint | undefined;
    let backstop_credit: bigint | undefined;
    let last_time: number | undefined;
    for (const map_entry of data_entry_map) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'd_rate':
          d_rate = scvalToBigInt(map_entry.val());
          break;
        case 'b_rate':
          b_rate = scvalToBigInt(map_entry.val());
          break;
        case 'ir_mod':
          ir_mod = scvalToBigInt(map_entry.val());
          break;
        case 'b_supply':
          b_supply = scvalToBigInt(map_entry.val());
          break;
        case 'd_supply':
          d_supply = scvalToBigInt(map_entry.val());
          break;
        case 'backstop_credit':
          backstop_credit = scvalToBigInt(map_entry.val());
          break;
        case 'last_time':
          last_time = scvalToNumber(map_entry.val());
          break;
        default:
          throw Error(
            `Error: ReserveData scvMap value malformed: should not contain ${map_entry
              ?.key()
              ?.sym()
              ?.toString()}`
          );
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
      return undefined;
    }
    let expiration: number | undefined;
    let eps: number | undefined;
    for (const map_entry of data_entry_map) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'expiration':
          expiration = scValToNative(map_entry.val());
          break;
        case 'eps':
          eps = scValToNative(map_entry.val());
          break;
        default:
          throw Error(
            `Error: ReserveData scvMap value malformed: should not contain ${map_entry
              ?.key()
              ?.sym()
              ?.toString()}`
          );
      }
    }
    if (eps == undefined || expiration == undefined) {
      throw Error('Error: ReserveEmissionConfig scvMap value malformed');
    }
    return new ReserveEmissionConfig(BigInt(eps), BigInt(expiration));
  }
}

/**
 * The emission data for the reserve b or d token
 */
export class ReserveEmissionData {
  constructor(public index: i128, public last_time: u64) {}

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
      return undefined;
    }

    let index: bigint | undefined;
    let last_time: number | undefined;
    for (const map_entry of data_entry_map) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'index':
          index = scvalToBigInt(map_entry.val());
          break;
        case 'last_time':
          last_time = scvalToNumber(map_entry.val());
          break;
        default:
          throw new Error(
            `Error: ReserveEmissionData scvMap value malformed: should not contain ${map_entry
              ?.key()
              ?.sym()
              ?.toString()}`
          );
      }
    }

    if (index == undefined || last_time == undefined) {
      throw new Error(`Error: ReserveEmissionData scvMap value malformed`);
    }

    return {
      index,
      last_time: BigInt(last_time),
    };
  }
}

// Token things (Not sure where to put)

interface TokenConfig {
  name: string;
  symbol: string;
  decimal: number;
}

export function loadTokenConfig(xdr_string: string): TokenConfig {
  try {
    let name: string | undefined;
    let symbol: string | undefined;
    let decimal: number | undefined;

    xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .instance()
      .storage()
      ?.map((entry) => {
        switch (entry.key().switch()) {
          case xdr.ScValType.scvSymbol():
            switch (entry.key().sym().toString()) {
              case 'METADATA':
                entry
                  .val()
                  .map()
                  ?.map((meta_entry) => {
                    switch (meta_entry.key().sym().toString()) {
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
                        throw new Error(
                          `Error: Token scvMap value malformed: should not contain ${meta_entry
                            ?.key()
                            ?.sym()
                            ?.toString()}`
                        );
                    }
                  });
            }
            break;

          default:
            break;
        }
      });
    if (name == undefined || symbol == undefined || decimal == undefined) {
      throw Error('Error: token config malformed');
    }
    return { name, symbol, decimal };
  } catch (e) {
    console.error(e);
    return { name: 'NULL', symbol: 'NULL', decimal: -1 };
  }
}

async function getTokenBalance(
  stellar_rpc: Server,
  network_passphrase: string,
  token_id: string,
  address: Address
): Promise<bigint> {
  try {
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
      console.error('unable to fetch balance for token: ', token_id);
      return BigInt(0);
    }
    if (SorobanRpc.isSimulationSuccess(result)) {
      const val = scvalToBigInt(result.result.retval);
      return val;
    } else {
      console.error('unable to fetch balance for token: ', token_id);
      return BigInt(0);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error(e, 'unable to fetch balance for token: ', token_id);
    return BigInt(0);
  }
}
