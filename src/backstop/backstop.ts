import { Account, SorobanRpc, TransactionBuilder, xdr } from 'stellar-sdk';
import {
  BackstopClient,
  BackstopUser,
  ContractResponse,
  Network,
  Resources,
  i128,
} from '../index.js';
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
    public blndPerLpToken: number,
    public usdcPerLpToken: number,
    public lpTokenPrice: number,
    public latestLedger: number,
    public timestamp: number
  ) {}

  /**
   * Load the backstop data from the ledger
   * @param network - The network information to load the backstop from
   * @param id - The contract address of the backstop
   * @param pools - The set of pools to load backstop pool data for
   * @param includeRewardZone - Whether to load the pools in the reward zone.
   * @param timestamp - The timestamp to project the pool data to
   * @returns - The backstop object
   */
  public static async load(
    network: Network,
    id: string,
    pools: string[],
    includeRewardZone: boolean,
    timestamp: number
  ): Promise<Backstop> {
    const config_promise = BackstopConfig.load(network, id);
    // @dev: Sim only to prevent submitting the transaction, use random public key
    let backstopClient = new BackstopClient(id);
    const op = backstopClient.updateTokenValue();
    let rpc = new SorobanRpc.Server(network.rpc, network.opts);
    let tx_builder = new TransactionBuilder(new Account('GABCD', '123'), { fee: '100' });
    tx_builder.addOperation(xdr.Operation.fromXDR(op, 'base64'));
    let tx = tx_builder.build();
    let lp_value_promise = rpc.simulateTransaction(tx);

    const [config, lp_value_sim] = await Promise.all([config_promise, lp_value_promise]);
    let lp_value_resp: ContractResponse<[i128, i128]> = ContractResponse.fromSimulationResponse(
      lp_value_sim,
      tx,
      network.passphrase,
      backstopClient.parsers['updateTokenValue']
    );
    if (lp_value_resp.result.isOk()) {
      const [blndPerShare, usdcPerShare] = lp_value_resp.result.unwrap();
      const blndPerShareFloat = Number(blndPerShare) / 1e7;
      const usdcPerShareFloat = Number(usdcPerShare) / 1e7;
      const blndToUsdcLpRate = usdcPerShareFloat / 0.2 / (blndPerShareFloat / 0.8);
      const lpTokenPrice = blndToUsdcLpRate * blndPerShareFloat + usdcPerShareFloat;

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
          blndPerShareFloat,
          usdcPerShareFloat,
          lpTokenPrice
        );
        poolData.set(pool, backstop_pool);
      }
      return new Backstop(
        id,
        config,
        poolData,
        blndPerShareFloat,
        usdcPerShareFloat,
        lpTokenPrice,
        config.latestLedger,
        timestamp
      );
    } else {
      throw new Error('Unable to load backstop tokens value');
    }
  }

  public async loadUser(network: Network, user: string): Promise<BackstopUser> {
    return BackstopUser.load(network, user, this);
  }
}
