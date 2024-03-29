import { Pool } from './pool.js';
import { PoolUserEmissionData, UserPositions } from './pool_user_types.js';
export class EmissionEstimates {
  /**
   * Emissions for a reserve where the value is [dTokenEmissions, bTokenEmissions]
   */
  constructor(
    public emissions: Map<string, [number, number]>,
    public totalEmissions: number,
    public timestamp: number
  ) {}

  public static build(
    pool: Pool,
    positions: UserPositions,
    emissions: Map<number, PoolUserEmissionData>,
    timestamp: number
  ): EmissionEstimates {
    // accrue emission values
    // TODO: Refactor such that we catch emissions that are not created yet (user position created before emissions)
    const reserve_list = pool.config.reserveList;
    const accrued_emissions = new Map<string, [number, number]>();
    let totalEmissions = 0;
    emissions.forEach((value, key) => {
      const reserve = pool.reserves.get(reserve_list[Math.floor(key / 2)]);
      if (reserve) {
        if (key % 2 == 0 && reserve.borrowEmissions) {
          // dToken emission
          const dTokenAccrual = value.estimateAccrual(
            timestamp,
            reserve.borrowEmissions,
            reserve.config.decimals,
            reserve.data.dSupply,
            positions.liabilities.get(reserve.config.index) ?? 0n
          );
          totalEmissions += dTokenAccrual;
          const cur_value = accrued_emissions.get(reserve.assetId);
          accrued_emissions.set(reserve.assetId, [dTokenAccrual, cur_value ? cur_value[1] : 0]);
        } else if (reserve.supplyEmissions) {
          // bToken emission
          const bTokenAccrual = value.estimateAccrual(
            timestamp,
            reserve.supplyEmissions,
            reserve.config.decimals,
            reserve.data.bSupply,
            (positions.collateral.get(reserve.config.index) ?? 0n) +
              (positions.supply.get(reserve.config.index) ?? 0n)
          );
          totalEmissions += bTokenAccrual;
          const cur_value = accrued_emissions.get(reserve.assetId);
          accrued_emissions.set(reserve.assetId, [cur_value ? cur_value[0] : 0, bTokenAccrual]);
        }
      } else {
        throw new Error(`Unable to find reserve for emissions: ${Math.floor(key / 2)}`);
      }
    });
    return new EmissionEstimates(accrued_emissions, totalEmissions, timestamp);
  }
}
