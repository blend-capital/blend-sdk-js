import { SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { BackstopUserEmissions, UserBalance } from './backstop_user_types.js';

export class BackstopPoolUser {
  constructor(
    public userId: string,
    public poolId: string,
    public balance: UserBalance,
    public emissions: BackstopUserEmissions | undefined
  ) {}

  /**
   * Load the backstop pool user data from the ledger
   * @param network - The network information
   * @param backstopId - The contract address of the backstop
   * @param poolId - The contract address of the pool
   * @param userId - The address of the user
   * @param timestamp - The timestamp manage withdrawals for (in seconds since epoch), defaults to now
   * @returns
   */
  static async load(
    network: Network,
    backstopId: string,
    poolId: string,
    userId: string,
    timestamp?: number | undefined
  ): Promise<BackstopPoolUser> {
    if (timestamp === undefined) {
      timestamp = Date.now() / 1000;
    }
    const rpc = new SorobanRpc.Server(network.rpc, network.opts);
    const ledgerKeys: xdr.LedgerKey[] = [];
    ledgerKeys.push(UserBalance.ledgerKey(backstopId, poolId, userId));
    ledgerKeys.push(BackstopUserEmissions.ledgerKey(backstopId, poolId, userId));
    const ledgerEntries = await rpc.getLedgerEntries(...ledgerKeys);

    let balances: UserBalance = new UserBalance(BigInt(0), [], BigInt(0), BigInt(0));
    let emissions: BackstopUserEmissions | undefined;
    for (const entry of ledgerEntries.entries) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'UserBalance': {
          balances = UserBalance.fromLedgerEntryData(ledgerData, timestamp);
          break;
        }
        case 'UEmisData': {
          emissions = BackstopUserEmissions.fromLedgerEntryData(ledgerData);
          break;
        }
        default:
          throw new Error(`Invalid BackstopPoolUser key: should not contain ${key}`);
      }
    }

    return new BackstopPoolUser(userId, poolId, balances, emissions);
  }
}
