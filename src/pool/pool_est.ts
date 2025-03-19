import { toFloat } from '../math.js';
import { PoolOracle } from './pool_oracle.js';
import { Reserve } from './reserve.js';

/**
 * Aggregate floating point data for a pool. These numbers are not guaranteed to be exact, but
 * are suitable for display purposes.
 */
export class PoolEstimate {
  constructor(
    /**
     * The total value of all tokens supplied to the pool in the pool's oracle denomination
     */
    public totalSupply: number,
    /**
     * The total value of all tokens borrowed from the pool in the pool's oracle denomination
     */
    public totalBorrowed: number,
    /**
     * The average APY accrued by all borrowed tokens
     */
    public avgBorrowApy: number
  ) {}

  static build(reserves: Map<string, Reserve>, poolOracle: PoolOracle): PoolEstimate {
    let totalSupply = 0;
    let totalBorrowed = 0;
    let totalInterestInYear = 0;

    for (const reserve of reserves.values()) {
      const oraclePrice = poolOracle.getPriceFloat(reserve.assetId);
      if (oraclePrice !== undefined) {
        totalSupply += toFloat(reserve.totalSupply(), reserve.config.decimals) * oraclePrice;
        const reserveLiabilitiesBase =
          toFloat(reserve.totalLiabilities(), reserve.config.decimals) * oraclePrice;
        totalBorrowed += reserveLiabilitiesBase;
        totalInterestInYear += reserveLiabilitiesBase * reserve.estBorrowApy;
      }
    }
    const avgBorrowApy = totalBorrowed != 0 ? totalInterestInYear / totalBorrowed : 0;

    return new PoolEstimate(totalSupply, totalBorrowed, avgBorrowApy);
  }
}
