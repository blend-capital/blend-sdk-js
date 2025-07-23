import { PoolOracle, PoolV2, Positions, PositionsEstimate } from '../../src/index.js';
import { toFixed } from '../../src/math.js';
import { ReserveV2 } from '../../src/pool/reserve.js';

describe('user position estimation', () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const reserve_0 = new ReserveV2(
    'pool_id',
    'asset_0',
    {
      index: 0,
      c_factor: 9500000,
      l_factor: 9000000,
      decimals: 7,
    } as any,
    {
      dRate: BigInt(1_400_000_000_000), // d_rate
      bRate: BigInt(1_250_000_000_000), // b_rate
      lastTime: timestamp,
    } as any,
    undefined, // borrow emissions
    undefined, // supply emissions
    0.08, // borrow APR
    0.09, // estBorrowApy
    0.05, // supply APR
    0.06, // estSupplyApy
    0 // latestLedger
  );

  const reserve_1 = new ReserveV2(
    'pool_id',
    'asset_1',
    {
      index: 1,
      c_factor: 0,
      l_factor: 5000000,
      decimals: 7,
    } as any,
    {
      dRate: BigInt(1_200_000_000_000), // d_rate
      bRate: BigInt(1_100_000_000_000), // b_rate
      lastTime: timestamp,
    } as any,
    undefined, // borrow emissions
    undefined, // supply emissions
    0.02, // borrow APR
    0.03, // estBorrowApy
    0.01, // supply APR
    0.02, // estSupplyApy
    0 // latestLedger
  );

  const reserve_2 = new ReserveV2(
    'pool_id',
    'asset_2',
    {
      index: 2,
      c_factor: 9000000,
      l_factor: 8500000,
      decimals: 7,
    } as any,
    {
      dRate: BigInt(1_150_000_000_000), // d_rate
      bRate: BigInt(1_050_000_000_000), // b_rate
      lastTime: timestamp,
    } as any,
    undefined, // borrow emissions
    undefined, // supply emissions
    0.12, // borrow APR
    0.15, // estBorrowApy
    0.09, // supply APR
    0.11, // estSupplyApy
    0 // latestLedger
  );

  const pool_oracle = new PoolOracle(
    'oracle_id',
    new Map([
      ['asset_0', { price: toFixed(1, 7), timestamp }],
      ['asset_1', { price: toFixed(0.3, 7), timestamp }],
      ['asset_2', { price: toFixed(200, 7), timestamp }],
    ]),
    7,
    0
  );

  const pool = new PoolV2(
    {} as any,
    'pool_id',
    {} as any,
    new Map([
      ['asset_0', reserve_0],
      ['asset_1', reserve_1],
      ['asset_2', reserve_2],
    ]),
    timestamp
  );

  it('calculates positions estimate correctly', () => {
    const user_positions = new Positions(
      // liabilities
      new Map([[2, toFixed(10, 7)]]),
      // collateral
      new Map([[0, toFixed(4_000, 7)]]),
      // supply
      new Map([[1, toFixed(10_000, 7)]])
    );

    const estimate = PositionsEstimate.build(pool, pool_oracle, user_positions);

    expect(estimate.totalBorrowed).toBeCloseTo(10 * 200 * 1.15);
    expect(estimate.totalSupplied).toBeCloseTo(4000 * 1 * 1.25 + 10_000 * 0.3 * 1.1);
    expect(estimate.totalEffectiveLiabilities).toBeCloseTo((10 * 200 * 1.15) / 0.85);
    expect(estimate.totalEffectiveCollateral).toBeCloseTo(4000 * 1 * 1.25 * 0.95);
    expect(estimate.borrowCap).toBeCloseTo(
      estimate.totalEffectiveCollateral - estimate.totalEffectiveLiabilities
    );
    expect(estimate.borrowLimit).toBeCloseTo(
      estimate.totalEffectiveLiabilities / estimate.totalEffectiveCollateral
    );
    expect(estimate.netApy).toBeCloseTo(
      (estimate.supplyApy - estimate.borrowApy) / estimate.totalSupplied
    );
    expect(estimate.supplyApy).toBeCloseTo(
      (4000 * 1 * 1.25 * 0.06 + 10_000 * 0.3 * 1.1 * 0.02) / estimate.totalSupplied
    );
    expect(estimate.borrowApy).toBeCloseTo((10 * 200 * 1.15 * 0.15) / estimate.totalBorrowed);
  });

  it('calculates positions estimate correctly for bad debt user', () => {
    const user_positions = new Positions(
      // liabilities
      new Map([[2, toFixed(10, 7)]]),
      // collateral
      new Map(),
      // supply
      new Map()
    );

    const estimate = PositionsEstimate.build(pool, pool_oracle, user_positions);

    expect(estimate.totalBorrowed).toBeCloseTo(10 * 200 * 1.15);
    expect(estimate.totalSupplied).toBeCloseTo(0);
    expect(estimate.totalEffectiveLiabilities).toBeCloseTo((10 * 200 * 1.15) / 0.85);
    expect(estimate.totalEffectiveCollateral).toBeCloseTo(0);
    expect(estimate.borrowCap).toBeCloseTo(
      estimate.totalEffectiveCollateral - estimate.totalEffectiveLiabilities
    );
    expect(estimate.borrowLimit).toBeCloseTo(0);
    expect(estimate.netApy).toBeCloseTo(0);
    expect(estimate.supplyApy).toBeCloseTo(0);
    expect(estimate.borrowApy).toBeCloseTo((10 * 200 * 1.15 * 0.15) / estimate.totalBorrowed);
  });
});
