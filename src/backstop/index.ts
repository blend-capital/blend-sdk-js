import { xdr, Address } from 'stellar-base';
import { u64, i128 } from '..';
import { bigintToI128, scvalToBigInt, scvalToNumber } from '../scval_converter';

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

interface Q4W {
  amount: bigint;
  exp: number;
}

export interface UserBalance {
  shares: i128;
  q4w: Q4W[];
}

export function UserBalanceFromXDR(xdr_string: string): UserBalance {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .body()
    .data()
    .val()
    .map();
  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }
  let shares: bigint | undefined;
  let q4w: Q4W[] | undefined;
  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'shares':
        shares = scvalToBigInt(map_entry.val());
        break;
      case 'q4w':
        q4w = map_entry
          .val()
          .vec()
          ?.map((entry) => {
            const q4w_array = entry.map();
            let amount: bigint | undefined;
            let exp: number | undefined;
            for (const q4w of q4w_array ?? []) {
              switch (q4w.key().sym().toString()) {
                case 'amount':
                  amount = scvalToBigInt(q4w.val());
                  break;
                case 'exp':
                  exp = scvalToNumber(q4w.val());
                  break;
                default:
                  throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
              }
            }
            if (!amount || !exp) {
              throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
            }
            return { amount, exp };
          });
        break;
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }
  if (!shares || !q4w) {
    throw Error('scvMap value malformed');
  }
  return {
    shares,
    q4w,
  };
}

export function Q4WFromXDR(xdr_string: string): UserBalance {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .body()
    .data()
    .val()
    .map();
  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }
  let shares: bigint | undefined;
  let q4w: Q4W[] | undefined;
  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'shares':
        shares = scvalToBigInt(map_entry.val());
        break;
      case 'q4w':
        q4w = map_entry
          .val()
          .vec()
          ?.map((entry) => {
            const q4w_array = entry.map();
            let amount: bigint | undefined;
            let exp: number | undefined;
            for (const q4w of q4w_array ?? []) {
              switch (q4w.key().sym().toString()) {
                case 'amount':
                  amount = scvalToBigInt(q4w.val());
                  break;
                case 'exp':
                  exp = scvalToNumber(q4w.val());
                  break;
                default:
                  throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
              }
            }
            if (!amount || !exp) {
              throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
            }
            return { amount, exp };
          });
        break;
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (!shares || !q4w) {
    throw Error('scvMap value malformed');
  }
  return {
    shares,
    q4w,
  };
}

export interface PoolBalance {
  shares: i128;
  tokens: i128;
  q4w: i128;
}

export function PoolBalanceFromXDR(xdr_string: string): PoolBalance {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .body()
    .data()
    .val()
    .map();
  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }
  let shares: bigint | undefined;
  let tokens: bigint | undefined;
  let q4w: bigint | undefined;

  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'shares':
        shares = scvalToBigInt(map_entry.val());
        break;
      case 'tokens':
        tokens = scvalToBigInt(map_entry.val());
        break;
      case 'q4w':
        q4w = scvalToBigInt(map_entry.val());
        break;
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (!shares || !tokens || !q4w) {
    throw Error('scvMap value malformed');
  }
  return {
    shares,
    tokens,
    q4w,
  };
}

export type BackstopDataKey =
  | { tag: 'UserBalance'; values: [PoolUserKey] }
  | { tag: 'PoolBalance'; values: [string] }
  | { tag: 'NextEmis' }
  | { tag: 'RewardZone' }
  | { tag: 'PoolEPS'; values: [string] }
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
