// import BigNumber from 'bignumber.js';
import * as converter from '../src/data_entry_converter';

test('convert contract data entry with Vec::Bytes to hex string array', () => {
  const to_convert =
    'AAAABqpZ67X1xfp+OuPHDkNzVB7sMssJOnF0+gqi769JNZWwAAAAEAAAAAEAAAABAAAADwAAAApSZXdhcmRab25lAAAAAAAQAAAAAQAAAAEAAAANAAAAIA+ib5OfcJ09RTRlFUe1Tp67UOJGDkDEA/19Hia0ZFJK';

  const result = converter.toHexStringArray(to_convert);
  expect(result).toEqual(['0fa26f939f709d3d4534651547b54e9ebb50e2460e40c403fd7d1e26b464524a']);
});
