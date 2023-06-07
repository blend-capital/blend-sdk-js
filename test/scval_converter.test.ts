// import BigNumber from 'bignumber.js';
import { xdr } from 'stellar-base';
import * as converter from '../src/scval_converter';

test('convert bigint to i128 ScVal', () => {
  const max = BigInt('170141183460469231731687303715884105727');
  const min = BigInt('-170141183460469231731687303715884105728');
  const zero = BigInt('0');
  const normal = BigInt('123');
  const negative = BigInt('-123');
  const large = BigInt('10000000000000');
  let result = converter.bigintToI128(max);
  expect(result.toXDR().toString('base64')).toEqual('AAAACn////////////////////8=');

  result = converter.bigintToI128(min);
  expect(result.toXDR().toString('base64')).toEqual('AAAACoAAAAAAAAAAAAAAAAAAAAA=');

  result = converter.bigintToI128(zero);
  console.log(result.toXDR().toString('base64'));

  expect(result.toXDR().toString('base64')).toEqual('AAAACgAAAAAAAAAAAAAAAAAAAAA=');

  result = converter.bigintToI128(normal);

  expect(result.toXDR().toString('base64')).toEqual('AAAACgAAAAAAAAAAAAAAAAAAAHs=');

  result = converter.bigintToI128(negative);
  console.log(result.toXDR().toString('base64'));

  expect(result.toXDR().toString('base64')).toEqual('AAAACv///////////////////4U=');

  result = converter.bigintToI128(large);
  console.log(result.toXDR().toString('base64'));

  expect(result.toXDR().toString('base64')).toEqual('AAAACgAAAAAAAAAAAAAJGE5yoAA=');
});

test('convert ScVal to i128', () => {
  const max = xdr.ScVal.fromXDR('AAAACn////////////////////8=', 'base64');
  const min = xdr.ScVal.fromXDR('AAAACoAAAAAAAAAAAAAAAAAAAAA=', 'base64');
  const zero = xdr.ScVal.fromXDR('AAAACgAAAAAAAAAAAAAAAAAAAAA=', 'base64');
  const normal = xdr.ScVal.fromXDR('AAAACgAAAAAAAAAAAAAAAAAAAHs=', 'base64');
  const negative = xdr.ScVal.fromXDR('AAAACv///////////////////4U=', 'base64');
  const large = xdr.ScVal.fromXDR('AAAACgAAAAAAAAAAAAAJGE5yoAA=', 'base64');
  let result = converter.scvalToBigInt(max);
  expect(result).toEqual(BigInt('170141183460469231731687303715884105727'));

  result = converter.scvalToBigInt(min);
  expect(result).toEqual(BigInt('-170141183460469231731687303715884105728'));

  result = converter.scvalToBigInt(zero);
  expect(result).toEqual(BigInt('0'));

  result = converter.scvalToBigInt(normal);
  expect(result).toEqual(BigInt('123'));

  result = converter.scvalToBigInt(negative);
  expect(result).toEqual(BigInt('-123'));

  result = converter.scvalToBigInt(large);
  expect(result).toEqual(BigInt('10000000000000'));
});
