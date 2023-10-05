import { xdr, Address } from 'soroban-client';

export * from './pool_factory_client.js';

export enum PoolFactoryError {
  InvalidPoolInitArgs = 50,
}

export type PoolFactoryDataKey = { tag: 'Contracts'; values: [string] } | { tag: 'PoolInitMeta' };

export function PoolFactoryDataKeyToXDR(poolFactoryDataKey?: PoolFactoryDataKey): xdr.ScVal {
  if (!poolFactoryDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (poolFactoryDataKey.tag) {
    case 'Contracts':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Contracts'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolFactoryDataKey.values)
      );
      break;
    case 'PoolInitMeta':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolInitMeta'));
      break;
  }
  return xdr.ScVal.scvVec(res);
}

export interface PoolInitMeta {
  backstop: string;
  blnd_id: string;
  pool_hash: Buffer;
  usdc_id: string;
}

export function PoolInitMetaToXDR(poolInitMeta?: PoolInitMeta): xdr.ScVal {
  if (!poolInitMeta) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('backstop'),
      val: ((i) => Address.fromString(i).toScVal())(poolInitMeta.backstop),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('blnd_id'),
      val: ((i) => Address.fromString(i).toScVal())(poolInitMeta.blnd_id),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('pool_hash'),
      val: ((i) => xdr.ScVal.scvBytes(i))(poolInitMeta.pool_hash),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('usdc_id'),
      val: ((i) => Address.fromString(i).toScVal())(poolInitMeta.usdc_id),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}
