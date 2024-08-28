import { Network, PoolConfig } from '../index.js';
import { PoolOracle } from './pool_oracle.js';
import { PoolUser } from './pool_user.js';
import { Reserve } from './reserve.js';

/**
 * Manage ledger data for a Blend pool
 */
export class Pool {
  constructor(
    private network: Network,
    public id: string,
    public config: PoolConfig,
    public reserves: Map<string, Reserve>,
    public timestamp: number
  ) {}

  /**
   * Load a pool from the ledger
   * @param network - The network information to load the pool from
   * @param id - The contract address of the pool
   * @returns - The pool object
   */
  public static async load(network: Network, id: string): Promise<Pool> {
    const pool_config = await PoolConfig.load(network, id);
    const timestamp = Math.floor(Date.now() / 1000);

    const reserveList = await Promise.all(
      pool_config.reserveList.map((asset, index) =>
        Reserve.load(network, id, BigInt(pool_config.backstopRate), asset, index, timestamp)
      )
    );
    const reserves = new Map<string, Reserve>();
    for (const reserve of reserveList) {
      reserves.set(reserve.assetId, reserve);
    }

    return new Pool(network, id, pool_config, reserves, timestamp);
  }

  /**
   * Load the oracle for the pool
   * @returns The oracle for the pool
   */
  public async loadOracle(): Promise<PoolOracle> {
    return PoolOracle.load(this.network, this.config.oracle, this.config.reserveList);
  }

  /**
   * Load the user from the pool
   * @param userId - The address of the user to load
   * @returns The pool user
   */
  public async loadUser(userId: string): Promise<PoolUser> {
    return PoolUser.load(this.network, this, userId);
  }
}
