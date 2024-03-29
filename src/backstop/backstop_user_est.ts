import { UserEmissions } from '../emissions.js';
import { Backstop } from './backstop.js';
import { BackstopPool } from './backstop_pool.js';
import { UserBalance } from './backstop_user_types.js';

export type Q4WEst = {
  amount: number;
  exp: number;
};

export class BackstopUserPoolEst {
  /// The estimated LP tokens the user has deposited
  public tokens: number;
  /// The estimated BLND tokens of the user's deposited LP tokens
  public blnd: number;
  /// The estimated USDC tokens of the user's deposited LP tokens
  public usdc: number;
  /// The estimated spot value of the user's deposited LP tokens
  public totalSpotValue: number;
  /// The estimated number of unlocked LP tokens that have been queued
  public totalUnlockedQ4W: number;
  /// The array of queued withdrawals in (token amounts)
  public q4w: Q4WEst[];
  /// The estimated total LP tokens queued for withdrawal
  public totalQ4W: number;
  /// The estimated emissions of the user
  public emissions: number;

  constructor(
    tokens: number,
    blnd: number,
    usdc: number,
    totalSpotValue: number,
    q4w: Q4WEst[],
    totalUnlockedQ4W: number,
    totalQ4W: number,
    emissions: number
  ) {
    this.tokens = tokens;
    this.blnd = blnd;
    this.usdc = usdc;
    this.totalSpotValue = totalSpotValue;
    this.totalUnlockedQ4W = totalUnlockedQ4W;
    this.q4w = q4w;
    this.totalQ4W = totalQ4W;
    this.emissions = emissions;
  }

  public static build(
    backstop: Backstop,
    pool: BackstopPool,
    user_balance: UserBalance,
    user_emissions: UserEmissions | undefined,
    timestamp: number
  ) {
    const shares_to_tokens = Number(pool.poolBalance.tokens) / Number(pool.poolBalance.shares);
    const tokens = (Number(user_balance.shares) / 1e7) * shares_to_tokens;
    const blnd = tokens * backstop.blndPerLpToken;
    const usdc = tokens * backstop.usdcPerLpToken;
    const totalSpotValue = tokens * backstop.lpTokenPrice;

    const totalUnlockedQ4W = (Number(user_balance.unlockedQ4W) / 1e7) * shares_to_tokens;

    let totalQ4W = 0;
    const q4w: Q4WEst[] = user_balance.q4w.map((q4w) => {
      const amount = (Number(q4w.amount) / 1e7) * shares_to_tokens;
      totalQ4W += amount;
      return { amount, exp: Number(q4w.exp) };
    });

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
    return new BackstopUserPoolEst(
      tokens,
      blnd,
      usdc,
      totalSpotValue,
      q4w,
      totalUnlockedQ4W,
      totalQ4W,
      emissions
    );
  }
}
