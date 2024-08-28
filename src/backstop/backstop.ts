import { BackstopToken, Network } from '../index.js';
import { BackstopConfig } from './backstop_config.js';

/**
 * Manage ledger data for the Blend backstop contract
 */
export class Backstop {
  constructor(
    public id: string,
    public config: BackstopConfig,
    public backstopToken: BackstopToken,
    public latestLedger: number,
    public timestamp: number
  ) {}

  /**
   * Load the backstop data from the ledger
   * @param network - The network information to load the backstop from
   * @param id - The contract address of the backstop
   * @returns - The backstop object
   */
  public static async load(network: Network, id: string): Promise<Backstop> {
    const timestamp = Math.floor(Date.now() / 1000);
    const config = await BackstopConfig.load(network, id);
    const backstop_token = await BackstopToken.load(
      network,
      config.backstopTkn,
      config.blndTkn,
      config.usdcTkn
    );
    return new Backstop(id, config, backstop_token, config.latestLedger, timestamp);
  }
}
