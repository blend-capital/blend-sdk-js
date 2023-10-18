import { xdr, Address, nativeToScVal } from 'soroban-client';
import { u32, u64, i128 } from '../index.js';

export * from './pool_client.js';
export * from './pool_config.js';
export * from './reserve.js';
export * from './user_positions.js';
export * from './user_emissions.js';

export enum PoolError {
  NotAuthorized = 1,
  BadRequest = 2,
  AlreadyInitialized = 3,
  NegativeAmount = 4,
  InvalidPoolInitArgs = 5,
  InvalidReserveMetadata = 6,
  InvalidHf = 10,
  InvalidPoolStatus = 11,
  InvalidUtilRate = 12,
  EmissionFailure = 20,
  InvalidLiquidation = 100,
  InvalidLot = 101,
  InvalidBids = 102,
  AuctionInProgress = 103,
  InvalidAuctionType = 104,
  InvalidLotTooLarge = 105,
  InvalidLotTooSmall = 106,
  InvalidBidTooLarge = 107,
  InvalidBidTooSmall = 108,
}

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
 * Request for submitting actions
 */
export interface Request {
  request_type: u32;
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

export interface LiquidationMetadata {
  collateral: Map<string, i128>;
  liability: Map<string, i128>;
}

export function LiquidationMetadataToXDR(liquidationMetadata?: LiquidationMetadata): xdr.ScVal {
  if (!liquidationMetadata) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('collateral'),
      val: ((i) =>
        xdr.ScVal.scvMap(
          Array.from(i.entries()).map(([key, value]) => {
            return new xdr.ScMapEntry({
              key: ((i) => Address.fromString(i).toScVal())(key),
              val: ((i) => nativeToScVal(i, { type: 'i128' }))(value),
            });
          })
        ))(liquidationMetadata.collateral),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('liability'),
      val: ((i) =>
        xdr.ScVal.scvMap(
          Array.from(i.entries()).map(([key, value]) => {
            return new xdr.ScMapEntry({
              key: ((i) => Address.fromString(i).toScVal())(key),
              val: ((i) => nativeToScVal(i, { type: 'i128' }))(value),
            });
          })
        ))(liquidationMetadata.liability),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface AuctionQuote {
  bid: Array<[string, i128]>;
  block: u32;
  lot: Array<[string, i128]>;
}

export function AuctionQuoteToXDR(auctionQuote?: AuctionQuote): xdr.ScVal {
  if (!auctionQuote) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('bid'),
      val: ((i) =>
        xdr.ScVal.scvVec(
          i.map((j) =>
            xdr.ScVal.scvVec([
              ((k) => Address.fromString(k).toScVal())(j[0]),
              ((k) => xdr.ScVal.scvI128(xdr.Int128Parts.fromXDR(k.toString(16), 'hex')))(j[1]),
            ])
          )
        ))(auctionQuote.bid),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('block'),
      val: ((i) => xdr.ScVal.scvU32(i))(auctionQuote.block),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('lot'),
      val: ((i) =>
        xdr.ScVal.scvVec(
          i.map((j) =>
            xdr.ScVal.scvVec([
              ((k) => Address.fromString(k).toScVal())(j[0]),
              ((k) => xdr.ScVal.scvI128(xdr.Int128Parts.fromXDR(k.toString(16), 'hex')))(j[1]),
            ])
          )
        ))(auctionQuote.lot),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface AuctionData {
  bid: Map<u32, i128>;
  block: u32;
  lot: Map<u32, i128>;
}

export function AuctionDataToXDR(auctionData?: AuctionData): xdr.ScVal {
  if (!auctionData) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('bid'),
      val: ((i) =>
        xdr.ScVal.scvMap(
          Array.from(i.entries()).map(([key, value]) => {
            return new xdr.ScMapEntry({
              key: ((i) => xdr.ScVal.scvU32(i))(key),
              val: ((i) => nativeToScVal(i, { type: 'i128' }))(value),
            });
          })
        ))(auctionData.bid),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('block'),
      val: ((i) => xdr.ScVal.scvU32(i))(auctionData.block),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('lot'),
      val: ((i) =>
        xdr.ScVal.scvMap(
          Array.from(i.entries()).map(([key, value]) => {
            return new xdr.ScMapEntry({
              key: ((i) => xdr.ScVal.scvU32(i))(key),
              val: ((i) => nativeToScVal(i, { type: 'i128' }))(value),
            });
          })
        ))(auctionData.lot),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}
