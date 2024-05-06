import { Pool } from './pool.js';
import { UserPositions } from './pool_user_types.js';

export class PositionEstimates {
  constructor(
    public liabilities: Map<string, number>,
    public collateral: Map<string, number>,
    public supply: Map<string, number>,

    public totalBorrowed: number,
    public totalSupplied: number,
    public totalEffectiveLiabilities: number,
    public totalEffectiveCollateral: number,

    public borrowCap: number,
    public borrowLimit: number,

    public netApy: number,
    public supplyApy: number,
    public borrowApy: number
  ) {}

  public static build(pool: Pool, positions: UserPositions): PositionEstimates {
    const reserve_list = pool.config.reserveList;

    const liabilities = new Map<string, number>();
    const collateral = new Map<string, number>();
    const supply = new Map<string, number>();
    let totalBorrowed = 0;
    let totalSupplied = 0;
    let totalEffectiveLiabilities = 0;
    let totalEffectiveCollateral = 0;
    let supplyApy = 0;
    let borrowApy = 0;

    // translate ledger liabilities to floating point values
    for (const [key, value] of positions.liabilities) {
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
    }

    // translate ledger collateral to floating point values
    for (const [key, value] of positions.collateral) {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve) {
        const asset_collateral = reserve.toAssetFromBToken(value);
        const asset_e_collateral = reserve.toEffectiveAssetFromBToken(value);
        const base_collateral = asset_collateral * reserve.oraclePrice;
        const base_e_collateral = asset_e_collateral * reserve.oraclePrice;
        totalSupplied += base_collateral;
        totalEffectiveCollateral += base_e_collateral;
        supplyApy += base_collateral * reserve.estimates.supplyApy;
        collateral.set(reserve.assetId, asset_collateral);
      } else {
        throw new Error(`Unable to find reserve for collateral balance: ${key}`);
      }
    }

    // translate ledger supply to floating point values
    for (const [key, value] of positions.supply) {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve) {
        const asset_supply = reserve.toAssetFromBToken(value);
        const base_supply = asset_supply * reserve.oraclePrice;
        totalSupplied += base_supply;
        supplyApy += base_supply * reserve.estimates.supplyApy;
        supply.set(reserve.assetId, asset_supply);
      } else {
        throw new Error(`Unable to find reserve for supply balance: ${key}`);
      }
    }

    const borrowCap = totalEffectiveCollateral - totalEffectiveLiabilities;
    const borrowLimit =
      totalEffectiveCollateral == 0 ? 0 : totalEffectiveLiabilities / totalEffectiveCollateral;
    const netApy =
      totalBorrowed + totalSupplied == 0
        ? 0
        : (supplyApy - borrowApy) / (totalBorrowed + totalSupplied);
    supplyApy = totalSupplied == 0 ? 0 : supplyApy / totalSupplied;
    borrowApy = totalBorrowed == 0 ? 0 : borrowApy / totalBorrowed;

    return new PositionEstimates(
      liabilities,
      collateral,
      supply,
      totalBorrowed,
      totalSupplied,
      totalEffectiveLiabilities,
      totalEffectiveCollateral,
      borrowCap,
      borrowLimit,
      netApy,
      supplyApy,
      borrowApy
    );
  }
}
