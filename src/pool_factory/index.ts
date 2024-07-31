import { Address, xdr } from '@stellar/stellar-sdk';

export * from './pool_factory_config.js';
export * from './pool_factory_contract.js';
export * from './pool_factory_events.js';

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
}
