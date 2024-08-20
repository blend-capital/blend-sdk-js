import { Network } from '../index.js';
import { toFloat } from '../math.js';
import { getOracleDecimals, getOraclePrice, PriceData } from '../oracle.js';

export class PoolOracle {
  constructor(
    public oracleId: string,
    public prices: Map<string, PriceData>,
    public decimals: number,
    public latestLedger: number
  ) {}

  public static async load(
    network: Network,
    oracleId: string,
    assets: string[]
  ): Promise<PoolOracle> {
    const decimalPromise = getOracleDecimals(network, oracleId);
    const pricesPromise = assets.map((asset) => getOraclePrice(network, oracleId, asset));
    const [decimalsResult, pricesResult] = await Promise.all([
      decimalPromise,
      Promise.all(pricesPromise),
    ]);

    if (pricesResult.length !== assets.length) {
      throw Error('Failed to load all prices');
    }

    const prices = new Map<string, PriceData>();
    for (let i = 0; i < assets.length; i++) {
      prices.set(assets[i], pricesResult[i]);
    }

    return new PoolOracle(oracleId, prices, decimalsResult.decimals, decimalsResult.latestLedger);
  }

  /**
   * Get the price of an asset as a fixed point number with the oracle's decimals
   * @param assetId - The asset to get the price of
   * @returns The price as a fixed point number, or undefined if no price is available
   */
  public getPrice(assetId: string): bigint | undefined {
    return this.prices.get(assetId)?.price;
  }

  /**
   * Get the price of an asset as a floating point number
   * @param assetId - The asset to get the price of
   * @returns The price as a floating point number, or undefined if no price is available
   */
  public getPriceFloat(assetId: string): number | undefined {
    const price = this.getPrice(assetId);
    if (price) {
      return toFloat(price, this.decimals);
    } else {
      return undefined;
    }
  }
}
