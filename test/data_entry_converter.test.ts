// import BigNumber from 'bignumber.js';
import * as converter from '../src/data_entry_converter';

test('convert to string array -> contract data entry with Vec::Bytes', () => {
  const to_convert =
    'AAAABqpZ67X1xfp+OuPHDkNzVB7sMssJOnF0+gqi769JNZWwAAAAEAAAAAEAAAABAAAADwAAAApSZXdhcmRab25lAAAAAAAQAAAAAQAAAAEAAAANAAAAIA+ib5OfcJ09RTRlFUe1Tp67UOJGDkDEA/19Hia0ZFJK';

  const result = converter.toStringArray(to_convert, 'hex');
  expect(result).toEqual(['0fa26f939f709d3d4534651547b54e9ebb50e2460e40c403fd7d1e26b464524a']);
});

test('convert to string -> contract data entry with address', () => {
  const to_convert =
    'AAAABrIF667wlhs63gqtpAhhteqs5f4Tulqa7alskmhqIbkMAAAAEAAAAAEAAAABAAAADwAAAAVBZG1pbgAAAAAAABMAAAAAAAAAAB45MJGWErDrec1AbyPC0qOP+FUdvrJBrlzBNe75HsP4';

  const result = converter.toString(to_convert);
  expect(result).toEqual('GAPDSMERSYJLB23ZZVAG6I6C2KRY76CVDW7LEQNOLTATL3XZD3B7RRYZ');
});

test('convert to string -> contract data entry with symbol', () => {
  const to_convert =
    'AAAABrIF667wlhs63gqtpAhhteqs5f4Tulqa7alskmhqIbkMAAAAEAAAAAEAAAABAAAADwAAAAROYW1lAAAADwAAAAhtb2NrUG9vbA==';

  const result = converter.toString(to_convert, 'utf-8');
  expect(result).toEqual('mockPool');
});

test('convert to number -> contract data entry with u64', () => {
  const to_convert =
    'AAAABpgZaAkf/HOfaD5Zs3OmCNQbq0ByBvKxRqDXx+U5KmmiAAAAEAAAAAEAAAACAAAADwAAAAZQcmljZXMAAAAAAA0AAAAgFPyI3Hkqm0aTHohxaN+sQULdc1cWVtAxJqeME2R666AAAAAFAAAALpDt0AA=';

  const result = converter.toNumber(to_convert);
  expect(result).toEqual(20_000_0000000);
});

test('convert to bigint -> SAC token balance', () => {
  const to_convert =
    'AAAABuhxNpmeTt/8jwCz4Vg4ksnbSVILv8XhkjxQ/RtGcchCAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABMAAAABsgXrrvCWGzreCq2kCGG16qzl/hO6WprtqWySaGohuQwAAAARAAAAAQAAAAMAAAAPAAAABmFtb3VudAAAAAAACgAAAASoF8gAAAAAAAAAAAAAAAAPAAAACmF1dGhvcml6ZWQAAAAAAAAAAAABAAAADwAAAAhjbGF3YmFjawAAAAAAAAAA';

  const result = converter.toTokenBalance(to_convert);
  expect(result).toEqual(BigInt(20000000000));
});

test('convert to bigint -> soroban token balance', () => {
  const to_convert =
    'AAAABjHavT4huyeA7h4jsWESoJ4nSs9aT2yyQwjqYObynFFKAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABMAAAABsgXrrvCWGzreCq2kCGG16qzl/hO6WprtqWySaGohuQwAAAAKAAAAA34R1gAAAAAAAAAAAA==';

  const result = converter.toTokenBalance(to_convert);
  expect(result).toEqual(BigInt(15000000000));
});
