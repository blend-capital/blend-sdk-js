import { Address, SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { UserEmissions } from '../emissions.js';
import { Network, i128 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { Q4W } from './index.js';

export class BackstopUserData {
  constructor(
    public userBalance: UserBalance,
    public userEmissions: BackstopUserEmissionData | undefined
  ) {}

  static async load(network: Network, backstopId: string, poolId: string, userId: string) {
    const rpc = new SorobanRpc.Server(network.rpc, network.opts);
    const userBalanceDataKey = UserBalance.ledgerKey(backstopId, poolId, userId);
    const userEmissionsDataKey = BackstopUserEmissionData.ledgerKey(backstopId, poolId, userId);
    const backstopUserData = await rpc.getLedgerEntries(userBalanceDataKey, userEmissionsDataKey);
    let userBalance = new UserBalance(BigInt(0), []);
    let userEmissions: BackstopUserEmissionData | undefined;
    for (const entry of backstopUserData.entries ?? []) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'UserBalance': {
          userBalance = UserBalance.fromLedgerEntryData(ledgerData);
          break;
        }
        case 'UEmisData':
          userEmissions = BackstopUserEmissionData.fromLedgerEntryData(ledgerData);
          break;
        default:
          throw new Error(`Invalid BackstopUserData key: should not contain ${key}`);
      }
    }
    return new BackstopUserData(userBalance, userEmissions);
  }
}

export class UserBalance {
  constructor(public shares: i128, public q4w: Q4W[]) {}

  static ledgerKey(backstopId: string, poolId: string, userId: string): xdr.LedgerKey {
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

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): UserBalance {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('UserBalance contract data value is not a map');
    }

    let shares: bigint | undefined;
    let q4w: Q4W[] = [];
    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
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
              let exp: bigint | undefined;
              for (const q4w of q4w_array ?? []) {
                const q4wKey = q4w.key().sym().toString();
                switch (q4wKey) {
                  case 'amount':
                    amount = scValToNative(q4w.val());
                    break;
                  case 'exp':
                    exp = scValToNative(q4w.val());
                    break;
                  default:
                    throw Error(`Invalid Q4W key: should not contain ${q4wKey}`);
                }
              }
              if (amount == undefined || exp == undefined) {
                throw Error(`Malformed Q4W scvMap`);
              }
              return { amount, exp };
            });
          break;
        default:
          throw Error(`Invalid backstop UserBalance key: should not contain ${key}`);
      }
    }
    if (shares == undefined) {
      throw Error("Invalid UserBalance: should contain 'shares'");
    }
    return new UserBalance(shares, q4w);
  }
}

export class BackstopUserEmissionData extends UserEmissions {
  static ledgerKey(backstopId: string, poolId: string, userId: string): xdr.LedgerKey {
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
}

export function getPoolFromBackstopLedgerData(
  ledger_entry_data: xdr.LedgerEntryData | string
): string {
  if (typeof ledger_entry_data == 'string') {
    ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
  }

  const pool_address = ledger_entry_data
    ?.contractData()
    ?.key()
    ?.vec()
    ?.at(1)
    ?.map()
    ?.at(0)
    ?.val()
    ?.address();
  if (pool_address == undefined) {
    throw new Error("Invalid userEmissionData: should contain 'reserve_id'");
  }
  return Address.fromScAddress(pool_address).toString();
}
