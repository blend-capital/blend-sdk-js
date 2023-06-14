import { xdr, Address } from 'stellar-base';
import { u64, i128 } from '..';
import { bigintToI128 } from '../scval_converter';

export * from './backstop_op_builder';
export * from './Q4W';

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

/**
 * The user emission data for the reserve b or d token
 */
export interface UserEmissionData {
  accrued: i128;
  index: i128;
}

export function UserEmissionDataToXDR(userEmissionData?: UserEmissionData): xdr.ScVal {
  if (!userEmissionData) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('accrued'),
      val: ((i) => bigintToI128(i))(userEmissionData.accrued),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('index'),
      val: ((i) => bigintToI128(i))(userEmissionData.index),
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

export type BackstopDataKey =
  | { tag: 'Shares'; values: [PoolUserKey] }
  | { tag: 'Q4W'; values: [PoolUserKey] }
  | { tag: 'PoolTkn'; values: [string] }
  | { tag: 'PoolShares'; values: [string] }
  | { tag: 'PoolQ4W'; values: [string] }
  | { tag: 'NextDist' }
  | { tag: 'RewardZone' }
  | { tag: 'PoolEPS'; values: [string] }
  | { tag: 'PoolEmis'; values: [string] }
  | { tag: 'BEmisCfg'; values: [string] }
  | { tag: 'BEmisData'; values: [string] }
  | { tag: 'UEmisData'; values: [PoolUserKey] }
  | { tag: 'BckstpTkn' }
  | { tag: 'PoolFact' }
  | { tag: 'BLNDTkn' };

export function BackstopDataKeyToXDR(backstopDataKey?: BackstopDataKey): xdr.ScVal {
  if (!backstopDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (backstopDataKey.tag) {
    case 'Shares':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Shares'));
      res.push(...((i) => [((i) => PoolUserKeyToXDR(i))(i[0])])(backstopDataKey.values));
      break;
    case 'Q4W':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Q4W'));
      res.push(...((i) => [((i) => PoolUserKeyToXDR(i))(i[0])])(backstopDataKey.values));
      break;
    case 'PoolTkn':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolTkn'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'PoolShares':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolShares'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'PoolQ4W':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolQ4W'));
      res.push(
        ...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(backstopDataKey.values)
      );
      break;
    case 'NextDist':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('NextDist'));
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
    case 'PoolEmis':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolEmis'));
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
    case 'BckstpTkn':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BckstpTkn'));
      break;
    case 'PoolFact':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolFact'));
      break;
    case 'BLNDTkn':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BLNDTkn'));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
