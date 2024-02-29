import { Address, xdr } from 'stellar-sdk';
import { u64 } from '../index.js';

export * from './emitter_contract.js';
export * from './emitter_config.js';

export interface Swap {
  /**
    
    */
  new_backstop: string;
  /**
    
    */
  new_backstop_token: string;
  /**
    
    */
  unlock_time: u64;
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
