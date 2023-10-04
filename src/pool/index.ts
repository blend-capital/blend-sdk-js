import { xdr, Address } from 'soroban-client';
import { u32, u64, u128, i128 } from '..';
import { bigintToI128, scvalToBigInt, scvalToNumber } from '../scval_converter';

export * from './pool_client';
export * from './pool_config';
export * from './reserve';

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

export function ReserveEmissionsConfigFromXDR(xdr_string: string): ReserveEmissionsConfig {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .val()
    .map();
  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }

  let expiration: number | undefined;
  let eps: number | undefined;
  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'expiration':
        expiration = scvalToNumber(map_entry.val());
        break;
      case 'eps':
        eps = scvalToNumber(map_entry.val());
        break;
      default:
        throw Error('scvMap value malformed');
    }
  }

  if (eps == undefined || expiration == undefined) {
    throw Error('scvMap value malformed');
  }

  return {
    eps: BigInt(eps),
    expiration: BigInt(expiration),
  };
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

export function ReserveEmissionsDataFromXDR(xdr_string: string): ReserveEmissionsData {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .val()
    .map();
  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }

  let index: bigint | undefined;
  let last_time: number | undefined;
  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'index':
        index = scvalToBigInt(map_entry.val());
        break;
      case 'last_time':
        last_time = scvalToNumber(map_entry.val());
        break;
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (index == undefined || last_time == undefined) {
    throw Error('scvMap value malformed');
  }

  return {
    index,
    last_time: BigInt(last_time),
  };
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

export function UserEmissionDataFromXDR(xdr_string: string): UserEmissionData {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .val()
    .map();
  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }

  let accrued: bigint | undefined;
  let index: bigint | undefined;
  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'accrued':
        accrued = scvalToBigInt(map_entry.val());
        break;
      case 'index':
        index = scvalToBigInt(map_entry.val());
        break;
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (accrued == undefined || index == undefined) {
    throw Error('scvMap value malformed');
  }

  return {
    accrued,
    index,
  };
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

export function RequestToXDR(request?: Request): xdr.ScVal {
  if (!request) {
    return xdr.ScVal.scvVoid();
  }
  const arr = [
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('address'),
      val: ((i) => Address.fromString(i).toScVal())(request.address),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('amount'),
      val: ((i) => bigintToI128(i))(request.amount),
    }),
    new xdr.ScMapEntry({
      key: ((i) => xdr.ScVal.scvSymbol(i))('request_type'),
      val: ((i) => xdr.ScVal.scvU32(i))(request.request_type),
    }),
  ];
  return xdr.ScVal.scvMap(arr);
}

export interface Positions {
  liabilities: Map<u32, i128>;
  collateral: Map<u32, i128>;
  supply: Map<u32, i128>;
}

export function PositionsFromXDR(xdr_string: string): Positions {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .val()
    .map();

  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }
  let liability_map: Map<u32, i128> | undefined;
  let collateral_map: Map<u32, i128> | undefined;
  let supply_map: Map<u32, i128> | undefined;

  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'liabilities': {
        liability_map = new Map<u32, i128>();
        const liabilities = map_entry.val().map();
        if (liabilities) {
          for (const liability of liabilities) {
            liability_map.set(liability.key().u32(), scvalToBigInt(liability.val()));
          }
        }
        break;
      }
      case 'collateral': {
        collateral_map = new Map<u32, i128>();
        const collaterals = map_entry.val().map();
        if (collaterals) {
          for (const collateral of collaterals) {
            collateral_map.set(collateral.key().u32(), scvalToBigInt(collateral.val()));
          }
        }

        break;
      }
      case 'supply': {
        supply_map = new Map<u32, i128>();
        const supplies = map_entry.val().map();
        if (supplies) {
          for (const supply of supplies) {
            supply_map.set(supply.key().u32(), scvalToBigInt(supply.val()));
          }
        }
        break;
      }
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (!liability_map || !collateral_map || !supply_map) {
    throw Error('xdr_string is malformed');
  }
  return {
    liabilities: liability_map,
    collateral: collateral_map,
    supply: supply_map,
  };
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
              key: ((i) => Address.fromString(i).toScVal())(key),
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
