import { Address, Server, scValToNative, xdr } from 'soroban-client';
import { Network, i128 } from '../index.js';
import { Q4W } from './index.js';

export class BackstopUserData {
  constructor(public userBalance: UserBalance, public userEmissions: UserEmissionData) {}

  static async load(network: Network, backstopId: string, poolId: string, userId: string) {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const userBalanceDataKey = UserBalance.contractDataKey(backstopId, poolId, userId);
    const userEmissionsDataKey = UserEmissionData.contractDataKey(backstopId, poolId, userId);
    const backstopUserDataEntries =
      (await SorobanRpc.getLedgerEntries(userBalanceDataKey, userEmissionsDataKey)).entries ?? [];

    let userBalance: UserBalance | undefined;
    let userEmissions: UserEmissionData | undefined;
    for (const entry of backstopUserDataEntries) {
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
        case 'UserBalance': {
          userBalance = UserBalance.fromContractDataXDR(entry.xdr);
          break;
        }
        case 'UEmisData':
          userEmissions = UserEmissionData.fromContractDataXDR(entry.xdr);
          break;
        default:
          throw new Error('invalid scMap entry on backstop user data');
      }
    }
    return new BackstopUserData(userBalance, userEmissions);
  }
}

export class UserBalance {
  constructor(public shares: i128, public q4w: Q4W[]) {}

  static contractDataKey(backstopId: string, poolId: string, userId: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('UserBalance'),
          xdr.ScVal.scvMap([
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('pool'),
              val: Address.fromString(poolId).toScVal(),
            }),
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('user'),
              val: Address.fromString(userId).toScVal(),
            }),
          ]),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromContractDataXDR(xdr_string: string): UserBalance {
    const ledgerData = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
    let shares: bigint | undefined;
    let q4w: Q4W[] | undefined;
    for (const map_entry of ledgerData.val().map() ?? []) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'shares':
          shares = scValToNative(map_entry.val());
          break;
        case 'q4w':
          q4w = map_entry
            .val()
            .vec()
            ?.map((entry) => {
              const q4w_array = entry.map();
              let amount: bigint | undefined;
              let exp: number | undefined;
              for (const q4w of q4w_array ?? []) {
                switch (q4w.key().sym().toString()) {
                  case 'amount':
                    amount = scValToNative(q4w.val());
                    break;
                  case 'exp':
                    exp = scValToNative(q4w.val());
                    break;
                  default:
                    throw Error(
                      `q4w scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`
                    );
                }
              }
              if (!amount || !exp) {
                throw Error(`q4w scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
              }
              return { amount, exp };
            });
          break;
        default:
          throw Error(
            `backstop user balance scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`
          );
      }
    }
    if (!shares || !q4w) {
      throw Error('backstop user balance scvMap value malformed');
    }
    return new UserBalance(shares, q4w);
  }
}

export class UserEmissionData {
  constructor(public accrued: i128, public index: i128) {}

  static contractDataKey(backstopId: string, poolId: string, userId: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(backstopId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('UEmisData'),
          xdr.ScVal.scvMap([
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('pool'),
              val: Address.fromString(poolId).toScVal(),
            }),
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('user'),
              val: Address.fromString(userId).toScVal(),
            }),
          ]),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static fromContractDataXDR(xdr_string: string): UserEmissionData {
    const ledgerData = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
    let index: i128 | undefined;
    let accrued: i128 | undefined;

    for (const map_entry of ledgerData.val().map() ?? []) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'index':
          index = scValToNative(map_entry.val());
          break;
        case 'accrued':
          accrued = scValToNative(map_entry.val());
          break;
        default:
          throw Error(
            `user emission data scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`
          );
      }
    }
    if (index == undefined || accrued == undefined) {
      throw Error(`user emission data scvMap value malformed`);
    }

    return new UserEmissionData(accrued, index);
  }
}
