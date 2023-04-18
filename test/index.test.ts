import { TestObject } from '../src/index';

test('build TestObject', () => {
  const testObject = new TestObject(7, 'GAQ62Q46SCD2RCUUV6YKMK5IMMPTAUGOI2VCORX5UUGWB6GVEZKJVH2S');
  expect(testObject.objNumber).toBe(7);
});
