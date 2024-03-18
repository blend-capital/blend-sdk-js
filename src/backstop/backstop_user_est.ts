import { UserEmissions } from '../emissions.js';
import { Backstop } from './backstop.js';
import { BackstopPool } from './backstop_pool.js';
import { UserBalance } from './backstop_user_types.js';

export type Q4WEst = {
  amount: number;
  exp: number;
};

export class BackstopUserPoolEst {
  /// The estimated LP tokens of the user
  public tokens: number;
  /// The estimated BLND tokens of the user's LP tokens
  public blnd: number;
  /// The estimated USDC tokens of the user's LP tokens
  public usdc: number;
  /// The estimated spot value of the user's LP tokens
  public totalSpotValue: number;
  /// The estimated number of unlocked tokens that have been queued
  public totalUnlockedQ4W: number;
  /// The array of queued Q4W tokens
  public q4w: Q4WEst[];
  /// The estimated total Q4W tokens
  public totalQ4W: number;
  /// The estimated emissions of the user
  public emissions: number;

  constructor(
    blnd: number,
    usdc: number,
    totalSpotValue: number,
    q4w: Q4WEst[],
    totalUnlockedQ4W: number,
    totalQ4W: number,
    emissions: number
  ) {
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
    const tokens_float = (Number(user_balance.shares) / 1e7) * shares_to_tokens;
    const blnd = tokens_float * backstop.blndPerLpToken;
    const usdc = tokens_float * backstop.usdcPerLpToken;
    const totalSpotValue = tokens_float * backstop.lpTokenPrice;

    const totalUnlockedQ4W = user_balance.unlockedQ4W.reduce((acc, q4w) => {
      return acc + (Number(q4w.amount) / 1e7) * shares_to_tokens;
    }, 0);

    let totalQ4W = 0;
    const q4w: Q4WEst[] = user_balance.q4w.map((q4w) => {
      let amount = (Number(q4w.amount) / 1e7) * shares_to_tokens;
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
