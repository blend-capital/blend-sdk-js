import { Reserve, ReserveConfig, ReserveData } from '../../src/pool/reserve';

test('convert xdr to ReserveConfig', () => {
  const to_convert =
    'AAAABg+ib5OfcJ09RTRlFUe1Tp67UOJGDkDEA/19Hia0ZFJKAAAAEAAAAAEAAAACAAAADwAAAAlSZXNDb25maWcAAAAAAAANAAAAINlO29LleEBeVl3JwLbQCMR4cfJzbeM4o/rpW1/6VdABAAAAEQAAAAEAAAAMAAAADwAAAAdiX3Rva2VuAAAAAA0AAAAgJm33K+od2O355jXiEjHEuvo8RCoW12+IdUKAcE7AJy0AAAAPAAAACGNfZmFjdG9yAAAAAwCJVEAAAAAPAAAAB2RfdG9rZW4AAAAADQAAACDtgMjs14/B+5HI7/q/UtAC8RQEabZKtE/k8JVkcnCt6QAAAA8AAAAIZGVjaW1hbHMAAAADAAAABwAAAA8AAAAFaW5kZXgAAAAAAAADAAAAAQAAAA8AAAAIbF9mYWN0b3IAAAADAJD1YAAAAA8AAAAIbWF4X3V0aWwAAAADAJD1YAAAAA8AAAAFcl9vbmUAAAAAAAADAAehIAAAAA8AAAAHcl90aHJlZQAAAAADAOThwAAAAA8AAAAFcl90d28AAAAAAAADAExLQAAAAA8AAAAKcmVhY3Rpdml0eQAAAAAAAwAAJxAAAAAPAAAABHV0aWwAAAADAIGzIA==';

  const result = ReserveConfig.fromContractDataXDR(to_convert);
  expect(result).toEqual(
    new ReserveConfig(
      1,
      '266df72bea1dd8edf9e635e21231c4bafa3c442a16d76f88754280704ec0272d',
      'ed80c8ecd78fc1fb91c8effabf52d002f1140469b64ab44fe4f095647270ade9',
      7,
      9000000,
      9500000,
      8500000,
      9500000,
      500000,
      5000000,
      15000000,
      10000
    )
  );
});

test('convert xdr to ReserveData', () => {
  const to_convert =
    'AAAABg+ib5OfcJ09RTRlFUe1Tp67UOJGDkDEA/19Hia0ZFJKAAAAEAAAAAEAAAACAAAADwAAAAdSZXNEYXRhAAAAAA0AAAAg2U7b0uV4QF5WXcnAttAIxHhx8nNt4zij+ulbX/pV0AEAAAARAAAAAQAAAAUAAAAPAAAACGJfc3VwcGx5AAAACgAAABdIdugAAAAAAAAAAAAAAAAPAAAABmRfcmF0ZQAAAAAACgAAAAA7msoEAAAAAAAAAAAAAAAPAAAACGRfc3VwcGx5AAAACgAAAAukO3M5AAAAAAAAAAAAAAAPAAAABmlyX21vZAAAAAAACgAAAAA7moeYAAAAAAAAAAAAAAAPAAAACmxhc3RfYmxvY2sAAAAAAAMAAACM';

  const result = ReserveData.fromContractDataXDR(to_convert);
  expect(result).toEqual(
    new ReserveData(
      BigInt(1000000004),
      BigInt(999983000),
      BigInt(100000000000),
      BigInt(49999999801),
      140
    )
  );
});

test('reserve estimate data', () => {
  const config = new ReserveConfig(
    1,
    '266df72bea1dd8edf9e635e21231c4bafa3c442a16d76f88754280704ec0272d',
    'ed80c8ecd78fc1fb91c8effabf52d002f1140469b64ab44fe4f095647270ade9',
    7,
    7500000,
    7500000,
    7500000,
    9500000,
    500000,
    5000000,
    15000000,
    10000
  );
  const data = new ReserveData(BigInt(1e9), BigInt(1e9), BigInt(99e7), BigInt(65e7), 0);

  const reserve = new Reserve(
    'd94edbd2e578405e565dc9c0b6d008c47871f2736de338a3fae95b5ffa55d001',
    'TEAPOT',
    BigInt(34e7),
    config,
    data
  );

  const result = reserve.estimateData(0.2, 100);
  expect(result).toEqual({
    b_rate: 1.0000004477957973,
    d_rate: 1.0000008525343063,
    total_supply: 99.00001108294597,
    total_liabilities: 65.0000554147299,
    cur_apy: 0.053771043771043775,
    cur_util: 0.6565656565656566,
  });
});
