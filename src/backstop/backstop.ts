import { BackstopToken, BackstopUser, Network } from '../index.js';
import { BackstopConfig } from './backstop_config.js';
import { BackstopPool } from './backstop_pool.js';

/**
 * Manage ledger data for the Blend backstop contract
 */
export class Backstop {
  constructor(
    public id: string,
    public config: BackstopConfig,
    public pools: Map<string, BackstopPool>,
    public backstopToken: BackstopToken,
    public latestLedger: number,
    public timestamp: number
  ) {}

  /**
   * Load the backstop data from the ledger
   * @param network - The network information to load the backstop from
   * @param id - The contract address of the backstop
   * @param pools - The set of pools to load backstop pool data for
   * @param includeRewardZone - Whether to load the pools in the reward zone.
   * @returns - The backstop object
   */
  public static async load(
    network: Network,
    id: string,
    pools: string[],
    includeRewardZone: boolean
  ): Promise<Backstop> {
    const timestamp = Math.floor(Date.now() / 1000);
    const config = await BackstopConfig.load(network, id);
    const backstop_token = await BackstopToken.load(
      network,
      config.backstopTkn,
      config.blndTkn,
      config.usdcTkn
    );

    const poolData: Map<string, BackstopPool> = new Map();
    let poolList = pools;
    if (includeRewardZone) {
      // convert to Set to ensure uniqueness
      poolList = [...new Set(config.rewardZone.concat(pools))];
    }
    for (const pool of poolList) {
      const backstop_pool = await BackstopPool.load(
        network,
        id,
        pool,
        backstop_token.blndPerLpToken,
        backstop_token.usdcPerLpToken,
        backstop_token.lpTokenPrice,
        timestamp
      );
      poolData.set(pool, backstop_pool);
    }
    return new Backstop(id, config, poolData, backstop_token, config.latestLedger, timestamp);
  }

  public async loadUser(network: Network, user: string): Promise<BackstopUser> {
    return BackstopUser.load(network, user, this);
  }
}
