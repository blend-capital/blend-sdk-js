import { BackstopToken } from '../index.js';
import { toFloat } from '../math.js';
import { PoolBalance } from './backstop_pool.js';

export class BackstopPoolEst {
  constructor(
    public blnd: number,
    public usdc: number,
    public totalSpotValue: number,
    public q4wPercentage: number
  ) {}

  public static build(backstopToken: BackstopToken, poolBalance: PoolBalance) {
    const tokens_float = toFloat(poolBalance.tokens, 7);
    const blnd = tokens_float * backstopToken.blndPerLpToken;
    const usdc = tokens_float * backstopToken.usdcPerLpToken;
    const totalSpotValue = tokens_float * backstopToken.lpTokenPrice;
    const q4w_percentage = Number(poolBalance.q4w) / Number(poolBalance.shares);
    return new BackstopPoolEst(blnd, usdc, totalSpotValue, q4w_percentage);
  }
}
