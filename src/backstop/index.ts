import { Address, xdr } from 'stellar-sdk';
import { i128, u64 } from '../index.js';

export * from './backstop.js';
export * from './backstop_contract.js';
export * from './backstop_config.js';
export * from './backstop_pool.js';
export * from './backstop_pool_est.js';
export * from './backstop_user.js';
export * from './backstop_user_est.js';
export * from './backstop_user_types.js';

export interface PoolUserKey {
  pool: string;
  user: string;
}

export function PoolUserKeyToXDR(poolUserKey?: PoolUserKey): xdr.ScVal {
  if (!poolUserKey) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('pool'),
      val: ((i) => Address.fromString(i).toScVal())(poolUserKey.pool),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('user'),
      val: ((i) => Address.fromString(i).toScVal())(poolUserKey.user),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface LpTokenValue {
  blndPerShare: i128;
  usdcPerShare: i128;
}

/**
 * The pool's backstop data
 */
export interface PoolBackstopData {
  blnd: i128;
  q4wPercent: i128;
  tokens: i128;
  usdc: i128;
}

export interface Q4W {
  amount: i128;
  exp: u64;
}

export type BackstopDataKey =
  | { tag: 'UserBalance'; values: readonly [PoolUserKey] }
  | { tag: 'PoolBalance'; values: readonly [string] }
  | { tag: 'PoolUSDC'; values: readonly [string] }
  | { tag: 'NextEmis'; values: void }
  | { tag: 'RewardZone'; values: void }
  | { tag: 'PoolEPS'; values: readonly [string] }
  | { tag: 'BEmisCfg'; values: readonly [string] }
  | { tag: 'BEmisData'; values: readonly [string] }
  | { tag: 'UEmisData'; values: readonly [PoolUserKey] }
  | { tag: 'DropList'; values: void }
  | { tag: 'LPTknVal'; values: void };

export function BackstopDataKeyToXDR(backstopDataKey?: BackstopDataKey): xdr.ScVal {
  if (!backstopDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (backstopDataKey.tag) {
    case 'UserBalance':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('UserBalance'));
      res.push(...((i) => [((i) => PoolUserKeyToXDR(i))(i[0])])(backstopDataKey.values));
      break;
    case 'PoolBalance':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolBalance'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'NextEmis':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('NextEmis'));
      break;
    case 'RewardZone':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('RewardZone'));
      break;
    case 'PoolEPS':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolEPS'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'BEmisCfg':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BEmisCfg'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'BEmisData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BEmisData'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'UEmisData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('UEmisData'));
      res.push(...((i) => [((i) => PoolUserKeyToXDR(i))(i[0])])(backstopDataKey.values));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
