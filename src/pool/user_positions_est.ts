import { Pool } from './pool.js';
import { PoolOracle } from './pool_oracle.js';
import { Positions } from './user_types.js';

export class PositionsEstimate {
  constructor(
    /**
     * The total value of all tokens borrowed from the pool in the pool's oracle denomination
     */
    public totalBorrowed: number,
    /**
     * The total value of all tokens supplied to the pool in the pool's oracle denomination
     */
    public totalSupplied: number,
    /**
     * The total liabilities of the user in the pool's oracle denomination
     */
    public totalEffectiveLiabilities: number,
    /**
     * The total collateral of the user in the pool's oracle denomination
     */
    public totalEffectiveCollateral: number,
    /**
     * The maximum amount of liabilities the user can take on
     */
    public borrowCap: number,
    /**
     * The ratio of liabilities to collateral
     */
    public borrowLimit: number,
    /**
     * The net APR of the user's position
     */
    public netApr: number,
    /**
     * The average APR accrued by all supplied tokens
     */
    public supplyApr: number,
    /**
     * The average APR accrued by all borrowed tokens
     */
    public borrowApr: number
  ) {}

  public static build(pool: Pool, poolOracle: PoolOracle, positions: Positions): PositionsEstimate {
    const reserve_list = Array.from(pool.reserves.keys());

    const liabilities = new Map<string, number>();
    const collateral = new Map<string, number>();
    const supply = new Map<string, number>();
    let totalBorrowed = 0;
    let totalSupplied = 0;
    let totalEffectiveLiabilities = 0;
    let totalEffectiveCollateral = 0;
    let supplyApr = 0;
    let borrowApr = 0;

    // translate ledger liabilities to floating point values
    for (const [key, value] of positions.liabilities) {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve === undefined) {
        throw new Error(`Unable to find reserve for liability balance: ${key}`);
      }
      const oraclePrice = poolOracle.getPriceFloat(reserve.assetId);
      if (oraclePrice === undefined) {
        throw new Error(
          `Unable to find price for liability balance: ${key}, price: ${oraclePrice}`
        );
      }
      const asset_liability = reserve.toAssetFromDTokenFloat(value);
      const asset_e_liability = reserve.toEffectiveAssetFromDTokenFloat(value);
      const base_liability = asset_liability * oraclePrice;
      const base_e_liability = asset_e_liability * oraclePrice;
      totalBorrowed += base_liability;
      totalEffectiveLiabilities += base_e_liability;
      borrowApr += base_liability * reserve.borrowApr;
      liabilities.set(reserve.assetId, asset_liability);
    }

    // translate ledger collateral to floating point values
    for (const [key, value] of positions.collateral) {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve === undefined) {
        throw new Error(`Unable to find reserve for collateral balance: ${key}`);
      }
      const oraclePrice = poolOracle.getPriceFloat(reserve.assetId);
      if (oraclePrice === undefined) {
        throw new Error(
          `Unable to find price for collateral balance: ${key}, price: ${oraclePrice}`
        );
      }
      const asset_collateral = reserve.toAssetFromBTokenFloat(value);
      const asset_e_collateral = reserve.toEffectiveAssetFromBTokenFloat(value);
      const base_collateral = asset_collateral * oraclePrice;
      const base_e_collateral = asset_e_collateral * oraclePrice;
      totalSupplied += base_collateral;
      totalEffectiveCollateral += base_e_collateral;
      supplyApr += base_collateral * reserve.supplyApr;
      collateral.set(reserve.assetId, asset_collateral);
    }

    // translate ledger supply to floating point values
    for (const [key, value] of positions.supply) {
      const reserve = pool.reserves.get(reserve_list[key]);
      if (reserve === undefined) {
        throw new Error(`Unable to find reserve for supply balance: ${key}`);
      }
      const oraclePrice = poolOracle.getPriceFloat(reserve.assetId);
      if (oraclePrice === undefined) {
        throw new Error(`Unable to find price for supply balance: ${key}, price: ${oraclePrice}`);
      }
      const asset_supply = reserve.toAssetFromBTokenFloat(value);
      const base_supply = asset_supply * oraclePrice;
      totalSupplied += base_supply;
      supplyApr += base_supply * reserve.supplyApr;
      supply.set(reserve.assetId, asset_supply);
    }

    const borrowCap = totalEffectiveCollateral - totalEffectiveLiabilities;
    const borrowLimit =
      totalEffectiveCollateral == 0 ? 0 : totalEffectiveLiabilities / totalEffectiveCollateral;
    const netApr =
      totalBorrowed + totalSupplied == 0
        ? 0
        : (supplyApr - borrowApr) / (totalBorrowed + totalSupplied);
    supplyApr = totalSupplied == 0 ? 0 : supplyApr / totalSupplied;
    borrowApr = totalBorrowed == 0 ? 0 : borrowApr / totalBorrowed;

    return new PositionsEstimate(
      totalBorrowed,
      totalSupplied,
      totalEffectiveLiabilities,
      totalEffectiveCollateral,
      borrowCap,
      borrowLimit,
      netApr,
      supplyApr,
      borrowApr
    );
  }
}
