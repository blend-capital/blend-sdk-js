import { Address, xdr } from 'stellar-sdk';

export * from './emitter_client.js';
export * from './emitter_config.js';

export enum EmitterError {
  AlreadyInitialized = 10,
  NotAuthorized = 20,
  InsufficientBackstopSize = 30,
}

export type EmitterDataKey =
  | { tag: 'LastDistro'; values: readonly [string] }
  | { tag: 'Dropped'; values: readonly [string] };

export function EmitterDataKeyToXDR(emitterDataKey?: EmitterDataKey): xdr.ScVal {
  if (!emitterDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (emitterDataKey.tag) {
    case 'Dropped':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Dropped'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(emitterDataKey.values));
      break;
    case 'LastDistro':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('LastDistro'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(emitterDataKey.values));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
