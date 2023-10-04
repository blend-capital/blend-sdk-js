import { xdr } from 'soroban-client';

export * from './emitter_client';

export enum EmitterError {
  AlreadyInitialized = 10,
  NotAuthorized = 20,
  InsufficientBackstopSize = 30,
}

export type EmitterDataKey =
  | { tag: 'Backstop' }
  | { tag: 'BstopId' }
  | { tag: 'BlendId' }
  | { tag: 'BlendLPId' }
  | { tag: 'LastDistro' };

export function EmitterDataKeyToXDR(emitterDataKey?: EmitterDataKey): xdr.ScVal {
  if (!emitterDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (emitterDataKey.tag) {
    case 'Backstop':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Backstop'));
      break;
    case 'BstopId':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BstopId'));
      break;
    case 'BlendId':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BlendId'));
      break;
    case 'BlendLPId':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BlendLPId'));
      break;
    case 'LastDistro':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('LastDistro'));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
