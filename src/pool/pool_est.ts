import { Reserve } from './reserve.js';

/**
 * Pool data projected to a specific timestamp.
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
    public totalBorrow: number,
    /**
     * The average APR accrued by all borrowed tokens
     */
    public avgBorrowApr: number
  ) {}

  static build(reserves: Map<string, Reserve>): PoolEstimate {
    let totalSupply = 0;
    let totalBorrow = 0;
    let totalBorrowApr = 0;

    reserves.forEach((reserve) => {
      totalSupply += reserve.estimates.supplied * reserve.oraclePrice;
      const borrow_base = reserve.estimates.borrowed * reserve.oraclePrice;
      totalBorrow += borrow_base;
      totalBorrowApr += borrow_base * reserve.estimates.apr;
    });
    const avgBorrowApr = totalBorrow != 0 ? totalBorrowApr / totalBorrow : 0;

    return new PoolEstimate(totalSupply, totalBorrow, avgBorrowApr);
  }
}
