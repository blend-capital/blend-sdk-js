import { UserEmissions } from '../emissions.js';
import { Backstop } from './backstop.js';
import { BackstopPool } from './backstop_pool.js';
import { UserBalance } from './backstop_user_types.js';

export class BackstopUserPoolEst {
  constructor(
    public blnd: number,
    public usdc: number,
    public totalSpotValue: number,
    public totalQueuedTokens: number,
    public emissions: number
  ) {}

  public static build(
    backstop: Backstop,
    pool: BackstopPool,
    user_balance: UserBalance,
    user_emissions: UserEmissions | undefined,
    timestamp: number
  ) {
    const shares_to_tokens = Number(pool.poolBalance.tokens) / Number(pool.poolBalance.shares);
    const tokens_float = (Number(user_balance.shares) / 1e7) * shares_to_tokens;
    const blnd = tokens_float * backstop.blndPerLpToken;
    const usdc = tokens_float * backstop.usdcPerLpToken;
    const totalSpotValue = tokens_float * backstop.lpTokenPrice;

    const totalQueuedTokens =
      (user_balance.q4w.reduce((total, q4w) => total + Number(q4w), 0) / 1e7) * shares_to_tokens;
    let emissions = 0;
    if (pool.emissions && user_emissions) {
      emissions = user_emissions.estimateAccrual(
        timestamp,
        pool.emissions,
        7,
        pool.poolBalance.shares - pool.poolBalance.q4w,
        user_balance.shares
      );
    }
    return new BackstopUserPoolEst(blnd, usdc, totalSpotValue, totalQueuedTokens, emissions);
  }
}
