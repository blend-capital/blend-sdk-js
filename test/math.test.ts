import { FixedMath } from '../src/index.js';

test('mul floor rounds down', () => {
  const x = BigInt(1_5391283);
  const y = BigInt(314_1592653);
  const denominator = BigInt(1_0000001);

  const result = FixedMath.mulFloor(x, y, denominator);

  expect(result).toEqual(BigInt(483_5313675));
});

test('mul floor large number', () => {
  const x = BigInt('170141183460469231731');
  const y = BigInt('1000000000000000000');
  const denominator = BigInt('1000000000000000000');

  const result = FixedMath.mulFloor(x, y, denominator);

  expect(result).toEqual(BigInt('170141183460469231731'));
});

test('mul ceil rounds up', () => {
  const x = BigInt(1_5391283);
  const y = BigInt(314_1592653);
  const denominator = BigInt(1_0000001);

  const result = FixedMath.mulCeil(x, y, denominator);

  expect(result).toEqual(BigInt(483_5313676));
});

test('mul ceil large number', () => {
  const x = BigInt('170141183460469231731');
  const y = BigInt('1000000000000000000');
  const denominator = BigInt('1000000000000000000');

  const result = FixedMath.mulCeil(x, y, denominator);

  expect(result).toEqual(BigInt('170141183460469231731'));
});

test('div floor rounds down', () => {
  const x = BigInt(314_1592653);
  const y = BigInt(1_5391280);
  const denominator = BigInt(1_0000000);

  const result = FixedMath.divFloor(x, y, denominator);

  expect(result).toEqual(BigInt(204_1150997));
});

test('div floor large number', () => {
  const x = BigInt('170141183460469231731');
  const y = BigInt('1000000000000000000');
  const denominator = BigInt('1000000000000000000');

  const result = FixedMath.divFloor(x, y, denominator);

  expect(result).toEqual(BigInt('170141183460469231731'));
});

test('div ceil rounds up', () => {
  const x = BigInt(314_1592653);
  const y = BigInt(1_5391280);
  const denominator = BigInt(1_0000000);

  const result = FixedMath.divCeil(x, y, denominator);

  expect(result).toEqual(BigInt(204_1150998));
});

test('div ceil large number', () => {
  const x = BigInt('170141183460469231731');
  const y = BigInt('1000000000000000000');
  const denominator = BigInt('1000000000000000000');

  const result = FixedMath.divCeil(x, y, denominator);

  expect(result).toEqual(BigInt('170141183460469231731'));
});
