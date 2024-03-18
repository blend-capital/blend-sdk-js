import { ReserveEst } from '../../src';
import { ReserveConfig, ReserveData } from '../../src/pool/reserve_types';

test('reserve estimate data', () => {
  const config = new ReserveConfig(
    0, // index
    7, // decimals
    7500000, // c_factor
    7500000, // l_factor
    7500000, // util
    9500000, // max_util
    100000, // r_base
    500000, // r_one
    5000000, // r_two
    1_5000000, // r_three
    20 // reactivity
  );
  const data = new ReserveData(
    BigInt(1_345_678_123), // d_rate
    BigInt(1_123_456_789), // b_rate
    BigInt(1e9), // ir_mod
    BigInt(65_0000000), // d_supply
    BigInt(99_0000000), // b_supply
    BigInt(0), // backstop_credit
    BigInt(0) // last_time
  );

  const estimates = ReserveEst.build(config, data, BigInt(1e7), 2000000, 123456 * 5);

  expect(estimates).toEqual({
    dRate: 1.3496577947140704,
    bRate: 1.1255471216174917,
    supplied: 111.42916504013168,
    borrowed: 87.72775665641458,
    available: 1,
    apy: 0.151088168686867,
    supplyApy: 0,
    util: 0.7864352674747468,
    timestamp: 617280,
  });
});

test('reserve estimate data no supplied or borrowed', () => {
  const config = new ReserveConfig(
    0, // index
    7, // decimals
    7500000, // c_factor
    7500000, // l_factor
    7500000, // util
    9500000, // max_util
    100000, // r_base
    500000, // r_one
    5000000, // r_two
    1_5000000, // r_three
    20 // reactivity
  );
  const data = new ReserveData(
    BigInt(1_345_678_123), // d_rate
    BigInt(1_123_456_789), // b_rate
    BigInt(1e9), // ir_mod
    BigInt(0), // d_supply
    BigInt(1e7), // b_supply
    BigInt(0), // backstop_credit
    BigInt(0) // last_time
  );

  let estimates = ReserveEst.build(config, data, BigInt(1e7), 1000000, 123456 * 5);

  expect(estimates).toEqual({
    dRate: 1.345678123,
    bRate: 1.123456789,
    supplied: 1.123456789,
    borrowed: 0,
    available: 1,
    apy: 0.01,
    supplyApy: 0,
    util: 0,
    timestamp: 617280,
  });

  data.dSupply = BigInt(0);
  estimates = ReserveEst.build(config, data, BigInt(1e7), 1000000, 123456 * 5);

  expect(estimates).toEqual({
    dRate: 1.345678123,
    bRate: 1.123456789,
    supplied: 1.123456789,
    borrowed: 0,
    available: 1,
    apy: 0.01,
    supplyApy: 0,
    util: 0,
    timestamp: 617280,
  });
});
