import { Address, xdr } from '@stellar/stellar-sdk';
import { i128, u32, u64 } from '../index.js';

export * from './pool.js';
export * from './pool_config.js';
export * from './pool_contract.js';
export * from './pool_est.js';
export * from './pool_user.js';
export * from './pool_user_types.js';
export * from './reserve.js';
export * from './reserve_est.js';
export * from './reserve_types.js';
export * from './user_position_est.js';

/**
 * Metadata for a pool's reserve emission configuration
 */
export interface ReserveEmissionMetadata {
  res_index: u32;
  res_type: u32;
  share: u64;
}

export interface UserReserveKey {
  reserve_id: u32;
  user: string;
}

export function UserReserveKeyToXDR(userReserveKey?: UserReserveKey): xdr.ScVal {
  if (!userReserveKey) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('reserve_id'),
      val: ((i) => xdr.ScVal.scvU32(i))(userReserveKey.reserve_id),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('user'),
      val: ((i) => Address.fromString(i).toScVal())(userReserveKey.user),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

/**
 * RequestType for specifying submit action
 */
export enum RequestType {
  Supply = 0,
  Withdraw = 1,
  SupplyCollateral = 2,
  WithdrawCollateral = 3,
  Borrow = 4,
  Repay = 5,
  FillUserLiquidationAuction = 6,
  FillBadDebtAuction = 7,
  FillInterestAuction = 8,
  DeleteLiquidationAuction = 9,
}

/**
 * Request for submitting actions
 */
export interface Request {
  request_type: RequestType;
  address: string;
  amount: i128;
}

export interface Positions {
  liabilities: Map<u32, i128>;
  collateral: Map<u32, i128>;
  supply: Map<u32, i128>;
}

export interface AuctionKey {
  auct_type: u32;
  user: string;
}

function AuctionKeyToXDR(auctionKey?: AuctionKey): xdr.ScVal {
  if (!auctionKey) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('auct_type'),
      val: ((i) => xdr.ScVal.scvU32(i))(auctionKey.auct_type),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('user'),
      val: ((i) => Address.fromString(i).toScVal())(auctionKey.user),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface AuctionData {
  bid: Map<u32, i128>;
  block: u32;
  lot: Map<u32, i128>;
}

export type PoolDataKey =
  | { tag: 'Admin' }
  | { tag: 'Name' }
  | { tag: 'Backstop' }
  | { tag: 'TokenHash' }
  | { tag: 'BLNDTkn' }
  | { tag: 'USDCTkn' }
  | { tag: 'PoolConfig' }
  | { tag: 'PoolEmis' }
  | { tag: 'Positions'; values: [string] }
  | { tag: 'ResConfig'; values: [string] }
  | { tag: 'ResData'; values: [string] }
  | { tag: 'ResList' }
  | { tag: 'EmisConfig'; values: [u32] }
  | { tag: 'EmisData'; values: [u32] }
  | { tag: 'UserEmis'; values: [UserReserveKey] }
  | { tag: 'Auction'; values: [AuctionKey] }
  | { tag: 'AuctData'; values: [string] };

export function PoolDataKeyToXDR(poolDataKey?: PoolDataKey): xdr.ScVal {
  if (!poolDataKey) {
    return xdr.ScVal.scvVoid();
  }
  const res: xdr.ScVal[] = [];
  switch (poolDataKey.tag) {
    case 'Admin':
      return ((i) => xdr.ScVal.scvSymbol(i))('Admin');
    case 'Name':
      return ((i) => xdr.ScVal.scvSymbol(i))('Name');
    case 'Backstop':
      return ((i) => xdr.ScVal.scvSymbol(i))('Backstop');
    case 'BLNDTkn':
      return ((i) => xdr.ScVal.scvSymbol(i))('BLNDTkn');
    case 'USDCTkn':
      return ((i) => xdr.ScVal.scvSymbol(i))('USDCTkn');
    case 'PoolConfig':
      return ((i) => xdr.ScVal.scvSymbol(i))('PoolConfig');
    case 'PoolEmis':
      return ((i) => xdr.ScVal.scvSymbol(i))('PoolEmis');
    case 'Positions':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Positions'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolDataKey.values));
      break;
    case 'ResConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('ResConfig'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolDataKey.values));
      break;
    case 'ResData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('ResData'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolDataKey.values));
      break;
    case 'ResList':
      return ((i) => xdr.ScVal.scvSymbol(i))('ResList');
    case 'EmisConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('EmisConfig'));
      res.push(...((i) => [((i) => xdr.ScVal.scvU32(i))(i[0])])(poolDataKey.values));
      break;
    case 'EmisData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('EmisData'));
      res.push(...((i) => [((i) => xdr.ScVal.scvU32(i))(i[0])])(poolDataKey.values));
      break;
    case 'UserEmis':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('UserEmis'));
      res.push(...((i) => [((i) => UserReserveKeyToXDR(i))(i[0])])(poolDataKey.values));
      break;
    case 'Auction':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Auction'));
      res.push(...((i) => [((i) => AuctionKeyToXDR(i))(i[0])])(poolDataKey.values));
      break;
    case 'AuctData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('AuctData'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolDataKey.values));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
