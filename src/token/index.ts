import { Address, xdr } from 'soroban-client';
import { u32 } from '..';

export * from './token_op_builder';

export enum TokenError {
  NotImplemented = 999,
  InternalError = 1,
  AlreadyInitializedError = 3,
  UnauthorizedError = 4,
  NegativeAmountError = 8,
  AllowanceError = 9,
  BalanceError = 10,
  BalanceDeauthorizedError = 11,
  OverflowError = 12,
  TrustlineMissingError = 13,
}

export interface Asset {
  id: string;
  res_index: u32;
}

export function AssetToXDR(asset?: Asset): xdr.ScVal {
  if (!asset) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('id'),
      val: ((i) => Address.fromString(i).toScVal())(asset.id),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('res_index'),
      val: ((i) => xdr.ScVal.scvU32(i))(asset.res_index),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface AllowanceDataKey {
  from: string;
  spender: string;
}

function AllowanceDataKeyToXDR(allowanceDataKey?: AllowanceDataKey): xdr.ScVal {
  if (!allowanceDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('from'),
      val: ((i) => Address.fromString(i).toScVal())(allowanceDataKey.from),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('spender'),
      val: ((i) => Address.fromString(i).toScVal())(allowanceDataKey.spender),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export type TokenDataKey =
  | { tag: 'Allowance'; values: [AllowanceDataKey] }
  | { tag: 'Balance'; values: [string] }
  | { tag: 'Pool' }
  | { tag: 'PoolId' }
  | { tag: 'Asset' }
  | { tag: 'Decimals' }
  | { tag: 'Name' }
  | { tag: 'Symbol' };

export function TokenDataKeyToXDR(tokenDataKey?: TokenDataKey): xdr.ScVal {
  if (!tokenDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (tokenDataKey.tag) {
    case 'Allowance':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Allowance'));
      res.push(...((i) => [((i) => AllowanceDataKeyToXDR(i))(i[0])])(tokenDataKey.values));
      break;
    case 'Balance':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Balance'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(tokenDataKey.values));
      break;
    case 'Pool':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Pool'));
      break;
    case 'PoolId':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolId'));
      break;
    case 'Asset':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Asset'));
      break;
    case 'Decimals':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Decimals'));
      break;
    case 'Name':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Name'));
      break;
    case 'Symbol':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Symbol'));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
