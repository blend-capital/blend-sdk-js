import { ReserveConfig, ReserveData } from './reserve_types.js';

/**
 * Manages projecting the ledger Reserve data to the present.
 *
 * This data is an approximate and may not match the contract's calculations exactly due to underlying
 * math limitations.
 */
export class ReserveEst {
  constructor(
    /**
     * The DToken conversion rate at the given timestamp
     */
    public dRate: number,
    /**
     * The BToken conversion rate at the given timestamp
     */
    public bRate: number,
    /**
     * The number of tokens being supplied
     */
    public supplied: number,
    /**
     * The number of tokens being borrowed
     */
    public borrowed: number,
    /**
     * The number of tokens the pool holds
     */
    public available: number,
    /**
     * The current borrow APY
     */
    public apy: number,
    /**
     * The current supply APY
     */
    public supplyApy: number,
    /**
     * The utilization of the reserve
     */
    public util: number,
    // /**
    //  * The emission index for the borrow token (if applicable)
    //  */
    // public borrowEmissionIndex: number | undefined,
    // /**
    //  * The emission index for the supply token (if applicable)
    //  */
    // public supplyEmissionIndex: number | undefined,
    /**
     * The timestamp that this data was projected to
     */
    public timestamp: number
  ) {}

  /**
   * Estimate the reserve data to a specific timestamp
   * @param reserveConfig - The reserve configuration
   * @param reserveData - The reserve data
   * @param poolBalance - The pool balance
   * @param backstopTakeRate - The backstop take rate (as an integer scaled to 9 decimals)
   * @param timestamp - The timestamp to project to
   * @returns The reserve estimate
   */
  public static build(
    reserveConfig: ReserveConfig,
    reserveData: ReserveData,
    poolBalance: bigint,
    backstopTakeRate: number,
    timestamp: number
  ): ReserveEst {
    // accrue interest and calculate est apy
    const base_rate = 0.01; // base rate
    const scaler = 10 ** reserveConfig.decimals;
    const backstop_take_rate_decimal = backstopTakeRate / 1e9;
    let d_rate = Number(reserveData.dRate) / 1e9;
    let borrowed = (Number(reserveData.dSupply) / scaler) * d_rate;
    let b_rate =
      reserveData.bSupply == BigInt(0)
        ? 1
        : (borrowed + Number(poolBalance) / scaler) / (Number(reserveData.bSupply) / scaler);
    let supplied = (Number(reserveData.bSupply) / scaler) * b_rate;
    let cur_util = 0;
    let cur_apy = base_rate;

    if (supplied != 0) {
      const cur_ir_mod = Number(reserveData.interestRateModifier) / 1e9;
      cur_util = borrowed / supplied;
      const target_util = reserveConfig.util / 1e7;
      if (cur_util <= target_util) {
        cur_apy = (cur_util / target_util) * (reserveConfig.r_one / 1e7) + base_rate;
        cur_apy *= cur_ir_mod;
      } else if (target_util < cur_util && cur_util <= 0.95) {
        cur_apy =
          ((cur_util - target_util) / (0.95 - target_util)) * (reserveConfig.r_two / 1e7) +
          reserveConfig.r_one / 1e7 +
          base_rate;
        cur_apy *= cur_ir_mod;
      } else {
        cur_apy =
          ((cur_util - 0.95) / 0.05) * (reserveConfig.r_three / 1e7) +
          cur_ir_mod * (reserveConfig.r_two / 1e7 + reserveConfig.r_one / 1e7 + base_rate);
      }
      const accrual =
        ((timestamp != undefined ? timestamp - Number(reserveData.lastTime) : 0) / 31536000) *
          cur_apy +
        1;
      if (backstop_take_rate_decimal > 0) {
        const b_accrual = (accrual - 1) * cur_util;
        supplied *= b_accrual * backstop_take_rate_decimal + 1;
        b_rate *= b_accrual * (1 - backstop_take_rate_decimal) + 1;
      } else {
        const b_accrual = (accrual - 1) * cur_util;
        supplied *= b_accrual + 1;
        b_rate *= b_accrual + 1;
      }
      borrowed *= accrual;
      d_rate *= accrual;
    }
    const supply_apy = cur_apy * cur_util * (1 - backstop_take_rate_decimal);

    return new ReserveEst(
      d_rate,
      b_rate,
      supplied,
      borrowed,
      Number(poolBalance) / scaler,
      cur_apy,
      supply_apy,
      cur_util,
      timestamp
    );
  }
}
