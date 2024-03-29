import { Address, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { UserEmissions } from '../emissions.js';
import { Backstop, Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { getTokenBalance } from '../token.js';
import { BackstopUserPoolEst } from './backstop_user_est.js';
import {
  BackstopUserEmissionData,
  UserBalance,
  getPoolFromBackstopLedgerData,
} from './backstop_user_types.js';

export class BackstopUser {
  constructor(
    public user: string,
    public tokens: bigint,
    public balances: Map<string, UserBalance>,
    public emissions: Map<string, UserEmissions>,
    public estimates: Map<string, BackstopUserPoolEst>
  ) {}

  static async load(network: Network, user: string, backstop: Backstop): Promise<BackstopUser> {
    const rpc = new SorobanRpc.Server(network.rpc, network.opts);
    const ledgerKeys: xdr.LedgerKey[] = [];
    for (const pool of backstop.config.rewardZone) {
      ledgerKeys.push(UserBalance.ledgerKey(backstop.id, pool, user));
      ledgerKeys.push(BackstopUserEmissionData.ledgerKey(backstop.id, pool, user));
    }
    const ledgerEntriesPromise = rpc.getLedgerEntries(...ledgerKeys);
    const backstopTokenBalancePromise = getTokenBalance(
      network,
      backstop.config.backstopTkn,
      new Address(user)
    );
    const [ledgerEntries, backstopTokenBalace] = await Promise.all([
      ledgerEntriesPromise,
      backstopTokenBalancePromise,
    ]);

    const balances: Map<string, UserBalance> = new Map();
    const emissions: Map<string, UserEmissions> = new Map();
    for (const entry of ledgerEntries.entries) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'UserBalance': {
          const pool = getPoolFromBackstopLedgerData(ledgerData);
          const balance = UserBalance.fromLedgerEntryData(ledgerData);
          balances.set(pool, balance);
          break;
        }
        case 'UEmisData': {
          const pool = getPoolFromBackstopLedgerData(ledgerData);
          const emission = BackstopUserEmissionData.fromLedgerEntryData(ledgerData);
          emissions.set(pool, emission);
          break;
        }
        default:
          throw new Error(`Invalid BackstopUser key: should not contain ${key}`);
      }
    }

    const estimates = new Map<string, BackstopUserPoolEst>();
    for (const [pool, pool_data] of backstop.pools.entries()) {
      const user_pool_balance = balances.get(pool) ?? new UserBalance(BigInt(0), []);
      const user_pool_emissions = emissions.get(pool);
      const pool_est = BackstopUserPoolEst.build(
        backstop,
        pool_data,
        user_pool_balance,
        user_pool_emissions,
        backstop.timestamp
      );
      estimates.set(pool, pool_est);
    }

    return new BackstopUser(user, backstopTokenBalace, balances, emissions, estimates);
  }
}
