import { SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { EmissionEstimates } from './emission_est.js';
import { Pool } from './pool.js';
import { PoolUserEmissionData, UserPositions } from './pool_user_types.js';
import { PositionEstimates } from './user_position_est.js';
export class PoolUser {
  constructor(
    public user: string,
    public positions: UserPositions,
    public emissions: Map<number, PoolUserEmissionData>,
    public positionEstimates: PositionEstimates,
    public emissionEstimates: EmissionEstimates,
    public latestLedger: number
  ) {}

  public static async load(network: Network, pool: Pool, user: string): Promise<PoolUser> {
    const ledgerKeys: xdr.LedgerKey[] = [UserPositions.ledgerKey(pool.id, user)];
    for (const reserve of pool.reserves.values()) {
      if (reserve.borrowEmissions) {
        ledgerKeys.push(PoolUserEmissionData.ledgerKey(pool.id, user, reserve.config.index * 2));
      }
      if (reserve.supplyEmissions) {
        ledgerKeys.push(
          PoolUserEmissionData.ledgerKey(pool.id, user, reserve.config.index * 2 + 1)
        );
      }
    }
    const sorobanRpc = new SorobanRpc.Server(network.rpc, network.opts);
    const ledgerEntries = await sorobanRpc.getLedgerEntries(...ledgerKeys);

    let positions: UserPositions = new UserPositions(new Map(), new Map(), new Map());
    const emissions: Map<number, PoolUserEmissionData> = new Map();
    for (const entry of ledgerEntries.entries) {
      const ledgerEntry = entry.val;
      const key = decodeEntryKey(ledgerEntry.contractData().key());
      switch (key) {
        case 'Positions':
          positions = UserPositions.fromLedgerEntryData(ledgerEntry);
          break;
        case `UserEmis`: {
          const reserve_emis_id =
            PoolUserEmissionData.getEmissionIndexFromLedgerEntryData(ledgerEntry);
          const reserve_data = PoolUserEmissionData.fromLedgerEntryData(ledgerEntry);
          emissions.set(reserve_emis_id, reserve_data);
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    const pool_user_est = PositionEstimates.build(pool, positions);
    const emission_est = EmissionEstimates.build(pool, positions, emissions, pool.timestamp);
    return new PoolUser(
      user,
      positions,
      emissions,
      pool_user_est,
      emission_est,
      ledgerEntries.latestLedger
    );
  }
}
