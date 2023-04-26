import { PoolConfig } from '../../src/pool/pool_config';

test('convert xdr to PoolConfig', () => {
  const to_convert =
    'AAAABg+ib5OfcJ09RTRlFUe1Tp67UOJGDkDEA/19Hia0ZFJKAAAAEAAAAAEAAAABAAAADwAAAApQb29sQ29uZmlnAAAAAAARAAAAAQAAAAMAAAAPAAAACmJzdG9wX3JhdGUAAAAAAAUAAAAAATEtAAAAAA8AAAAGb3JhY2xlAAAAAAANAAAAIL/7hqhwGzRkKgXOFaecdliD/mCVwQTiKHlZL63JePeVAAAADwAAAAZzdGF0dXMAAAAAAAMAAAAA';

  const result = PoolConfig.fromContractDataXDR(to_convert);
  expect(result).toEqual(
    new PoolConfig(20000000, 'bffb86a8701b34642a05ce15a79c765883fe6095c104e22879592fadc978f795', 0)
  );
});
