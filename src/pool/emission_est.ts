import { Pool } from './pool.js';
import { PoolUserEmissionData, UserPositions } from './pool_user_types.js';
export class EmissionEstimates {
  /**
   * Emissions for a reserve where the value is [dTokenEmissions, bTokenEmissions]
   */
  constructor(
    public emissions: Map<string, [number, number]>,
    public tokenIdsToClaim: number[],
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
    const accrued_emissions = new Map<string, [number, number]>();
    const tokenIdsToClaim: number[] = [];
    let totalEmissions = 0;
    for (const reserve of pool.reserves.values()) {
      // handle dToken emissions
      const d_token_id = reserve.config.index * 2;
      const d_token_data = emissions.get(d_token_id);
      const d_token_position = positions.liabilities.get(reserve.config.index);
      if (reserve.borrowEmissions && (d_token_data || d_token_position)) {
        let dTokenAccrual = 0;
        if (d_token_data) {
          dTokenAccrual = d_token_data.estimateAccrual(
            timestamp,
            reserve.borrowEmissions,
            reserve.config.decimals,
            reserve.data.dSupply,
            d_token_position ?? BigInt(0)
          );
        } else if (d_token_position) {
          // emissions began after user position was created, accrue all emissions
          const temp_d_token_data = new PoolUserEmissionData(BigInt(0), BigInt(0));
          dTokenAccrual = temp_d_token_data.estimateAccrual(
            timestamp,
            reserve.borrowEmissions,
            reserve.config.decimals,
            reserve.data.dSupply,
            d_token_position
          );
        }
        if (dTokenAccrual > 0) {
          tokenIdsToClaim.push(d_token_id);
          totalEmissions += dTokenAccrual;
          const cur_value = accrued_emissions.get(reserve.assetId);
          accrued_emissions.set(reserve.assetId, [dTokenAccrual, cur_value ? cur_value[1] : 0]);
        }
      }

      // handle bToken emissions
      const b_token_index = reserve.config.index * 2 + 1;
      const b_token_data = emissions.get(b_token_index);
      const b_token_position =
        (positions.collateral.get(reserve.config.index) ?? BigInt(0)) +
        (positions.supply.get(reserve.config.index) ?? BigInt(0));
      if (reserve.supplyEmissions && (b_token_data || b_token_position > BigInt(0))) {
        let bTokenAccrual = 0;
        if (b_token_data) {
          bTokenAccrual = b_token_data.estimateAccrual(
            timestamp,
            reserve.supplyEmissions,
            reserve.config.decimals,
            reserve.data.bSupply,
            b_token_position
          );
        } else if (b_token_position > BigInt(0)) {
          // emissions began after user position was created, accrue all emissions
          const temp_b_token_data = new PoolUserEmissionData(BigInt(0), BigInt(0));
          bTokenAccrual = temp_b_token_data.estimateAccrual(
            timestamp,
            reserve.supplyEmissions,
            reserve.config.decimals,
            reserve.data.bSupply,
            b_token_position
          );
        }
        if (bTokenAccrual > 0) {
          tokenIdsToClaim.push(b_token_index);
          totalEmissions += bTokenAccrual;
          const cur_value = accrued_emissions.get(reserve.assetId);
          accrued_emissions.set(reserve.assetId, [cur_value ? cur_value[0] : 0, bTokenAccrual]);
        }
      }
    }
    return new EmissionEstimates(accrued_emissions, tokenIdsToClaim, totalEmissions, timestamp);
  }
}
