import { Network, PoolConfig } from '../index.js';
import { PoolOracle } from './pool_oracle.js';
import { Reserve } from './reserve.js';
import { ReserveEmissions } from './reserve_emissions.js';

/**
 * Manage ledger data for a Blend pool
 */
export class Pool {
  constructor(
    public id: string,
    public config: PoolConfig,
    public reserves: Map<string, Reserve>,
    public latestLedger: number,
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
      pool_config.reserveList.map((asset) =>
        Reserve.load(network, id, BigInt(pool_config.backstopRate), asset, timestamp)
      )
    );
    const reserves = new Map<string, Reserve>();
    for (const reserve of reserveList) {
      reserves.set(reserve.assetId, reserve);
    }

    return new Pool(id, pool_config, reserves, pool_config.latestLedger, timestamp);
  }

  /**
   * Load emission data for the pool
   * @param network - The network information to load the data from
   * @returns A map of assetId to emission data
   */
  public async loadEmissions(network: Network): Promise<Map<string, ReserveEmissions>> {
    const reserveEmissions = new Map<string, ReserveEmissions>();
    await Promise.all(
      Array.from(this.reserves.values()).map((reserve) => {
        reserve.loadEmissions(network).then((emissions) => {
          if (emissions) {
            // assetIds are unique, so no risk of overwriting
            reserveEmissions.set(reserve.assetId, emissions);
          }
        });
      })
    );
    return reserveEmissions;
  }

  /**
   * Load the oracle for the pool
   * @param network - The network information to load the oracle from
   * @returns The oracle for the pool
   */
  public async loadOracle(network: Network): Promise<PoolOracle> {
    return PoolOracle.load(network, this.config.oracle, this.config.reserveList);
  }
}
