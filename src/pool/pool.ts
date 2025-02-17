import { Network, PoolContractV2, Version } from '../index.js';
import { simulateAndParse } from '../simulation_helper.js';
import { PoolOracle } from './pool_oracle.js';
import { PoolUser } from './pool_user.js';
import { PoolMetadata } from './pool_metadata.js';
import { Reserve, ReserveV1, ReserveV2 } from './reserve.js';

/**
 * Manage ledger data for a Blend pool
 */
export abstract class Pool {
  constructor(
    private network: Network,
    public id: string,
    public metadata: PoolMetadata,
    public reserves: Map<string, Reserve>,
    public timestamp: number
  ) {}

  public abstract version: Version;

  /**
   * Load the oracle for the pool
   * @returns The oracle for the pool
   */
  public async loadOracle(): Promise<PoolOracle> {
    return PoolOracle.load(this.network, this.metadata.oracle, Array.from(this.reserves.keys()));
  }

  /**
   * Load the user from the pool
   * @param userId - The address of the user to load
   * @returns The pool user
   */
  public async loadUser(userId: string): Promise<PoolUser> {
    return PoolUser.load(this.network, this.id, this, userId);
  }
}

export class PoolV1 extends Pool {
  version: Version = Version.V1;

  /**
   * Load a pool from the ledger
   * @param network - The network information to load the pool from
   * @param id - The contract address of the pool
   * @returns - The pool object
   */
  public static async load(network: Network, id: string): Promise<PoolV1> {
    const poolMetadata = await PoolMetadata.load(network, id);
    return await PoolV1.loadWithMetadata(network, id, poolMetadata);
  }

  /**
   * Load a pool from the ledger with metadata
   * @param network - The network information to load the pool from
   * @param id - The contract address of the pool
   * @param metadata - The metadata for the pool
   * @returns - The pool object
   */
  public static async loadWithMetadata(
    network: Network,
    id: string,
    metadata: PoolMetadata
  ): Promise<PoolV1> {
    const timestamp = Math.floor(Date.now() / 1000);

    const reserveList = await Promise.all(
      metadata.reserveList.map((asset, index) =>
        ReserveV1.load(network, id, BigInt(metadata.backstopRate), asset, index, timestamp)
      )
    );
    const reserves = new Map<string, Reserve>();
    for (const reserve of reserveList) {
      reserves.set(reserve.assetId, reserve);
    }

    return new PoolV1(network, id, metadata, reserves, timestamp);
  }
}

export class PoolV2 extends Pool {
  version: Version = Version.V2;

  /**
   * Load a pool from the ledger
   * @param network - The network information to load the pool from
   * @param id - The contract address of the pool
   * @returns - The pool object
   */
  public static async load(network: Network, id: string): Promise<PoolV2> {
    const poolMetadata = await PoolMetadata.load(network, id);
    return await PoolV2.loadWithMetadata(network, id, poolMetadata);
  }

  /**
   * Load a pool from the ledger with metadata
   * @param network - The network information to load the pool from
   * @param id - The contract address of the pool
   * @param metadata - The metadata for the pool
   * @returns - The pool object
   */
  public static async loadWithMetadata(
    network: Network,
    id: string,
    metadata: PoolMetadata
  ): Promise<PoolV2> {
    const timestamp = Math.floor(Date.now() / 1000);

    const poolContract = new PoolContractV2(id);
    const { result: market, latestLedger } = await simulateAndParse(
      network,
      poolContract.getMarket(),
      PoolContractV2.parsers.getMarket
    );
    const reserves = new Map<string, ReserveV2>();

    market.reserves.map((contractReserve) => {
      const reserve = new ReserveV2(
        id,
        contractReserve.asset,
        contractReserve.config,
        contractReserve.data,
        0,
        0,
        latestLedger
      );
      reserve.setAPR();
      reserves.set(reserve.assetId, reserve);
    });

    return new PoolV2(network, id, metadata, reserves, timestamp);
  }
}
