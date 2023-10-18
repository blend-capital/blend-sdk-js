import { xdr, Address } from 'soroban-client';
import { u64, i128 } from '../index.js';
import { bigintToI128, scvalToBigInt, scvalToNumber } from '../scval_converter.js';

export * from './backstop_client.js';
export * from './Q4W.js';
export * from './backstop_config.js';
export * from './backstop_pool_data.js';
export * from './backstop_user_data.js';

export enum BackstopError {
  BadRequest = 1,
  InvalidBalance = 2,
  NotExpired = 3,
  InvalidRewardZoneEntry = 4,
  NotAuthorized = 5,
  InsufficientFunds = 6,
  AlreadyInitialized = 7,
  NotPool = 10,
  NegativeAmount = 11,
}

export interface BackstopEmissionConfig {
  eps: u64;
  expiration: u64;
}

export function BackstopEmissionConfigToXDR(
  backstopEmissionConfig?: BackstopEmissionConfig
): xdr.ScVal {
  if (!backstopEmissionConfig) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('eps'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        backstopEmissionConfig.eps
      ),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('expiration'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        backstopEmissionConfig.expiration
      ),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface BackstopEmissionsData {
  index: i128;
  last_time: u64;
}

export function BackstopEmissionsDataToXDR(
  backstopEmissionsData?: BackstopEmissionsData
): xdr.ScVal {
  if (!backstopEmissionsData) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('index'),
      val: ((i) => bigintToI128(i))(backstopEmissionsData.index),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('last_time'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        backstopEmissionsData.last_time
      ),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

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

export interface Q4W {
  amount: bigint;
  exp: number;
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
  q4w_pct: i128;
  tokens: i128;
  usdc: i128;
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
