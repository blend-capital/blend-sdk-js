import { xdr, Address } from 'stellar-base';
import { u32, u64, u128, i128 } from '..';
import { bigintToI128 } from '../scval_converter';

export * from './pool_op_builder';
export * from './pool_config';
export * from './reserve';

/**
 * Metadata for a pool's reserve emission configuration
 */
export interface ReserveEmissionMetadata {
  res_index: u32;
  res_type: u32;
  share: u64;
}

export function ReserveEmissionMetadataToXDR(
  reserveEmissionMetadata?: ReserveEmissionMetadata
): xdr.ScVal {
  if (!reserveEmissionMetadata) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('res_index'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveEmissionMetadata.res_index),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('res_type'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveEmissionMetadata.res_type),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('share'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        reserveEmissionMetadata.share
      ),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

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
 * The pool's emission config
 */
export interface PoolEmissionConfig {
  config: u128;
  last_time: u64;
}

export function PoolEmissionConfigToXDR(poolEmissionConfig?: PoolEmissionConfig): xdr.ScVal {
  if (!poolEmissionConfig) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('config'),
      val: ((i) => xdr.ScVal.scvU128(xdr.Int128Parts.fromXDR(i.toString(16), 'hex')))(
        poolEmissionConfig.config
      ),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('last_time'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        poolEmissionConfig.last_time
      ),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

/**
 * The mutable configuration information about a reserve asset
 */
export interface ReserveMetadata {
  c_factor: u32;
  decimals: u32;
  l_factor: u32;
  max_util: u32;
  r_one: u32;
  r_three: u32;
  r_two: u32;
  reactivity: u32;
  util: u32;
}

export function ReserveMetadataToXDR(reserveMetadata?: ReserveMetadata): xdr.ScVal {
  if (!reserveMetadata) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('c_factor'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.c_factor),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('decimals'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.decimals),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('l_factor'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.l_factor),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('max_util'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.max_util),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('r_one'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.r_one),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('r_three'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.r_three),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('r_two'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.r_two),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('reactivity'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.reactivity),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('util'),
      val: ((i) => xdr.ScVal.scvU32(i))(reserveMetadata.util),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

/**
 * The configuration of emissions for the reserve b or d token
 *
 * `@dev` If this is updated, ReserveEmissionsData MUST also be updated
 */
export interface ReserveEmissionsConfig {
  eps: u64;
  expiration: u64;
}

export function ReserveEmissionsConfigToXDR(
  reserveEmissionsConfig?: ReserveEmissionsConfig
): xdr.ScVal {
  if (!reserveEmissionsConfig) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('eps'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        reserveEmissionsConfig.eps
      ),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('expiration'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        reserveEmissionsConfig.expiration
      ),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

/**
 * The emission data for the reserve b or d token
 */
export interface ReserveEmissionsData {
  index: i128;
  last_time: u64;
}

export function ReserveEmissionsDataToXDR(reserveEmissionsData?: ReserveEmissionsData): xdr.ScVal {
  if (!reserveEmissionsData) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('index'),
      val: ((i) => bigintToI128(i))(reserveEmissionsData.index),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('last_time'),
      val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(
        reserveEmissionsData.last_time
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
      val: ((i) => Address.account(Buffer.from(i, 'hex')).toScVal())(userReserveKey.user),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
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
      val: ((i) => Address.account(Buffer.from(i, 'hex')).toScVal())(auctionKey.user),
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
  | { tag: 'PEConfig' }
  | { tag: 'ResConfig'; values: [string] }
  | { tag: 'ResData'; values: [string] }
  | { tag: 'ResList' }
  | { tag: 'EmisConfig'; values: [u32] }
  | { tag: 'EmisData'; values: [u32] }
  | { tag: 'UserConfig'; values: [string] }
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
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Admin'));
      break;
    case 'Name':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Name'));
      break;
    case 'Backstop':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('Backstop'));
      break;
    case 'TokenHash':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('TokenHash'));
      break;
    case 'BLNDTkn':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('BLNDTkn'));
      break;
    case 'USDCTkn':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('USDCTkn'));
      break;
    case 'PoolConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolConfig'));
      break;
    case 'PoolEmis':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PoolEmis'));
      break;
    case 'PEConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('PEConfig'));
      break;
    case 'ResConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('ResConfig'));
      res.push(
        ...((i) => [((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(i[0])])(
          poolDataKey.values
        )
      );
      break;
    case 'ResData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('ResData'));
      res.push(
        ...((i) => [((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(i[0])])(
          poolDataKey.values
        )
      );
      break;
    case 'ResList':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('ResList'));
      break;
    case 'EmisConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('EmisConfig'));
      res.push(...((i) => [((i) => xdr.ScVal.scvU32(i))(i[0])])(poolDataKey.values));
      break;
    case 'EmisData':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('EmisData'));
      res.push(...((i) => [((i) => xdr.ScVal.scvU32(i))(i[0])])(poolDataKey.values));
      break;
    case 'UserConfig':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('UserConfig'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolDataKey.values));
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
      res.push(
        ...((i) => [((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(i[0])])(
          poolDataKey.values
        )
      );
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
              key: ((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(key),
              val: ((i) => bigintToI128(i))(value),
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
              key: ((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(key),
              val: ((i) => bigintToI128(i))(value),
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
              val: ((i) => bigintToI128(i))(value),
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
              val: ((i) => bigintToI128(i))(value),
            });
          })
        ))(auctionData.lot),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}
