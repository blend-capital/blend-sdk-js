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
    const r_base = reserveConfig.r_base / 1e7;
    const r_one = reserveConfig.r_one / 1e7;
    const r_two = reserveConfig.r_two / 1e7;
    const r_three = reserveConfig.r_three / 1e7;
    const scalar = 10 ** reserveConfig.decimals;
    const backstop_take_rate_decimal = backstopTakeRate / 1e7;

    let d_rate = Number(reserveData.dRate) / 1e9;
    const d_supply = Number(reserveData.dSupply) / scalar;
    let borrowed = d_supply * d_rate;
    let b_rate = Number(reserveData.bRate) / 1e9;
    const b_supply = Number(reserveData.bSupply) / scalar;
    let supplied = b_supply * b_rate;
    let cur_util = 0;
    let cur_apy = r_base;
    let cur_supply_apy = 0;

    if (supplied != 0 && borrowed != 0) {
      const cur_ir_mod = Number(reserveData.interestRateModifier) / 1e9;
      cur_util = borrowed / supplied;
      const target_util = reserveConfig.util / 1e7;
      if (cur_util <= target_util) {
        cur_apy = (cur_util / target_util) * r_one + r_base;
        cur_apy *= cur_ir_mod;
      } else if (target_util < cur_util && cur_util <= 0.95) {
        cur_apy = ((cur_util - target_util) / (0.95 - target_util)) * r_two + r_one + r_base;
        cur_apy *= cur_ir_mod;
      } else {
        cur_apy = ((cur_util - 0.95) / 0.05) * r_three + cur_ir_mod * (r_one + r_two + r_base);
      }
      cur_supply_apy = cur_apy * (1 - backstop_take_rate_decimal) * cur_util;
      const accrual =
        ((timestamp != undefined ? timestamp - Number(reserveData.lastTime) : 0) / 31536000) *
          cur_apy +
        1;

      d_rate *= accrual;
      const new_borrowed = d_supply * d_rate;
      const accrued_interest = new_borrowed - borrowed;
      if (accrued_interest > 0) {
        let new_backstop_credit = 0;
        if (backstop_take_rate_decimal > 0) {
          new_backstop_credit = accrued_interest * backstop_take_rate_decimal;
        }
        supplied += accrued_interest - new_backstop_credit;
        b_rate = supplied / b_supply;
      }
      borrowed = new_borrowed;
    }

    return new ReserveEst(
      d_rate,
      b_rate,
      supplied,
      borrowed,
      Number(poolBalance) / scalar,
      cur_apy,
      cur_supply_apy,
      cur_util,
      timestamp
    );
  }
}
