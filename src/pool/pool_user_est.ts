import { Pool } from './pool.js';
import { PoolUserEmissionData, UserPositions } from './pool_user_types.js';

export class PoolUserEst {
  constructor(
    public liabilities: Map<string, number>,
    public collateral: Map<string, number>,
    public supply: Map<string, number>,
    /**
     * Emissions for a reserve where the value is [dTokenEmissions, bTokenEmissions]
     */
    public emissions: Map<string, [number, number]>,
    public totalEmissions: number,
    public totalBorrowed: number,
    public totalSupplied: number,
    public totalEffectiveLiabilities: number,
    public totalEffectiveCollateral: number,
    public supplyApy: number,
    public borrowApy: number,
    public netApy: number,
    public timestamp: number
  ) {}

  public static build(
    pool: Pool,
    positions: UserPositions,
    emissions: Map<number, PoolUserEmissionData>,
    timestamp: number
  ): PoolUserEst {
    const reserve_list = pool.config.reserveList;

    const liabilities = new Map<string, number>();
    const collateral = new Map<string, number>();
    const supply = new Map<string, number>();
    const accrued_emissions = new Map<string, [number, number]>();
    let totalEmissions = 0;
    let totalBorrowed = 0;
    let totalSupplied = 0;
    let totalEffectiveLiabilities = 0;
    let totalEffectiveCollateral = 0;
    let supplyApy = 0;
    let borrowApy = 0;

    // translate ledger liabilities to floating point values
    positions.liabilities.forEach((value, key) => {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve) {
        const asset_liability = reserve.toAssetFromDToken(value);
        const asset_e_liability = reserve.toEffectiveAssetFromDToken(value);
        const base_liability = asset_liability * reserve.oraclePrice;
        const base_e_liability = asset_e_liability * reserve.oraclePrice;
        totalBorrowed += base_liability;
        totalEffectiveLiabilities += base_e_liability;
        borrowApy += base_liability * reserve.estimates.apy;
        liabilities.set(reserve.assetId, asset_liability);
      } else {
        throw new Error(`Unable to find reserve for liability balance: ${key}`);
      }
    });

    // translate ledger collateral to floating point values
    positions.collateral.forEach((value, key) => {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve) {
        const asset_collateral = reserve.toAssetFromBToken(value);
        const asset_e_collateral = reserve.toEffectiveAssetFromBToken(value);
        const base_collateral = asset_collateral * reserve.oraclePrice;
        const base_e_collateral = asset_e_collateral * reserve.oraclePrice;
        totalSupplied += base_collateral;
        totalEffectiveCollateral += base_e_collateral;
        supplyApy += base_collateral * reserve.estimates.apy * reserve.estimates.util;
        collateral.set(reserve.assetId, asset_collateral);
      } else {
        throw new Error(`Unable to find reserve for collateral balance: ${key}`);
      }
    });

    // translate ledger supply to floating point values
    positions.supply.forEach((value, key) => {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve) {
        const asset_supply = reserve.toAssetFromDToken(value);
        const base_supply = asset_supply * reserve.oraclePrice;
        totalSupplied += base_supply;
        supplyApy += base_supply * reserve.estimates.apy;
        supply.set(reserve.assetId, asset_supply);
      } else {
        throw new Error(`Unable to find reserve for supply balance: ${key}`);
      }
    });

    // accrue emission values
    // TODO: Refactor such that we catch emissions that are not created yet (user position created before emissions)
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
            positions.liabilities.get(reserve.config.index) ?? BigInt(0)
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
            (positions.collateral.get(reserve.config.index) ?? BigInt(0)) +
              (positions.supply.get(reserve.config.index) ?? BigInt(0))
          );
          totalEmissions += bTokenAccrual;
          const cur_value = accrued_emissions.get(reserve.assetId);
          accrued_emissions.set(reserve.assetId, [cur_value ? cur_value[0] : 0, bTokenAccrual]);
        }
      } else {
        throw new Error(`Unable to find reserve for emissions: ${Math.floor(key / 2)}`);
      }
    });

    const netApy = (supplyApy - borrowApy) / (totalBorrowed + totalSupplied);
    supplyApy /= totalSupplied;
    borrowApy /= totalBorrowed;

    return new PoolUserEst(
      liabilities,
      collateral,
      supply,
      accrued_emissions,
      totalEmissions,
      totalBorrowed,
      totalSupplied,
      totalEffectiveLiabilities,
      totalEffectiveCollateral,
      supplyApy,
      borrowApy,
      netApy,
      timestamp
    );
  }
}
