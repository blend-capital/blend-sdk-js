import { Network, PoolConfig, Reserve } from '../index.js';
import { getOracleDecimals } from '../oracle.js';
import { PoolEstimate } from './pool_est.js';
import { PoolUser } from './pool_user.js';

/**
 * Manage ledger data for a Blend pool
 */
export class Pool {
  constructor(
    public id: string,
    public config: PoolConfig,
    public reserves: Map<string, Reserve>,
    public estimates: PoolEstimate,
    public latestLedger: number,
    public timestamp: number
  ) {}

  /**
   * Load a pool from the ledger
   * @param network - The network information to load the pool from
   * @param id - The contract address of the pool
   * @param timestamp - The timestamp to project the pool data to
   * @returns - The pool object
   */
  public static async load(network: Network, id: string, timestamp: number): Promise<Pool> {
    const pool_config = await PoolConfig.load(network, id);
    const oracle_decimals = await getOracleDecimals(network, pool_config.oracle);

    // load all reserves in pool
    const reserves = new Map<string, Reserve>();
    for (let i = 0; i < pool_config.reserveList.length; i++) {
      const asset = pool_config.reserveList[i];
      const reserve = await Reserve.load(
        network,
        id,
        pool_config.oracle,
        oracle_decimals,
        pool_config.backstopRate,
        asset,
        i,
        timestamp
      );
      reserves.set(asset, reserve);
    }

    const pool_est = PoolEstimate.build(reserves);
    return new Pool(id, pool_config, reserves, pool_est, pool_config.latestLedger, timestamp);
  }

  /**
   * Project the Pool data to a specific timestamp.
   *
   * This function is an estimate and is not guaranteed to be accurate to how the contract
   * will actually calculate these values at the given timestamp.
   */
  public estimate() {
    for (const reserve of this.reserves.values()) {
      reserve.estimate(this.config.backstopRate, this.timestamp);
    }
    this.estimates = PoolEstimate.build(this.reserves);
  }

  public async loadUser(network: Network, user: string): Promise<PoolUser> {
    return PoolUser.load(network, this, user);
  }
}
