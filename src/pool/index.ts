import { Address, scValToNative, xdr } from '@stellar/stellar-sdk';
import { ContractReserve, i128, u32, u64 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

export * from './pool.js';
export * from './pool_metadata.js';
export * from './pool_contract.js';
export * from './pool_est.js';
export * from './pool_events.js';
export * from './pool_oracle.js';
export * from './pool_user.js';
export * from './reserve.js';
export * from './reserve_types.js';
export * from './user_positions_est.js';
export * from './user_types.js';
export * from './auction.js';
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

export class AuctionData {
  constructor(public bid: Map<string, i128>, public block: u32, public lot: Map<string, i128>) {}

  static ledgerKey(poolId: string, auctionKey: AuctionKey): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('Auction'),
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: ((i) => xdr.ScVal.scvSymbol(i))('auct_type'),
          val: ((i) => xdr.ScVal.scvU32(i))(auctionKey.auct_type),
        }),
        new xdr.ScMapEntry({
          key: ((i) => xdr.ScVal.scvSymbol(i))('user'),
          val: ((i) => Address.fromString(i).toScVal())(auctionKey.user),
        }),
      ]),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.temporary(),
      })
    );
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): AuctionData {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    return AuctionData.fromScVal(ledger_entry_data.contractData().val());
  }

  static fromScVal(sc_val: xdr.ScVal | string): AuctionData {
    if (typeof sc_val == 'string') {
      sc_val = xdr.ScVal.fromXDR(sc_val, 'base64');
    }
    const data_entry_map = sc_val.map();
    if (data_entry_map == undefined) {
      throw Error('UserPositions contract data value is not a map');
    }
    let bid_map: Map<string, i128> | undefined;
    let lot_map: Map<string, i128> | undefined;
    let block: u32;

    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'bid': {
          bid_map = new Map<string, i128>();
          const bid = map_entry.val().map();
          if (bid) {
            for (const asset of bid) {
              bid_map.set(scValToNative(asset.key()), scValToNative(asset.val()));
            }
          }
          break;
        }
        case 'lot': {
          lot_map = new Map<string, i128>();
          const lot = map_entry.val().map();
          if (lot) {
            for (const asset of lot) {
              lot_map.set(scValToNative(asset.key()), scValToNative(asset.val()));
            }
          }
          break;
        }
        case 'block': {
          block = scValToNative(map_entry.val());
          break;
        }
        default:
          throw Error(`Invalid UserPositions key: should not contain ${key}`);
      }
    }

    if (!bid_map || !lot_map || !block) {
      throw Error('User positions xdr_string is malformed');
    }
    return new AuctionData(bid_map, block, lot_map);
  }
}

/*
 * The pool contracts config object
 */

export class PoolConfig {
  constructor(
    public backstopRate: number,
    public maxPositions: number,
    public oracle: string,
    public status: number
  ) {}

  static fromScVal(sc_val: xdr.ScVal | string): PoolConfig {
    if (typeof sc_val == 'string') {
      sc_val = xdr.ScVal.fromXDR(sc_val, 'base64');
    }
    let backstopRate: number | undefined;
    let oracle: string | undefined;
    let status: number | undefined;
    let maxPositions: number | undefined;
    sc_val.map()?.map((config_entry) => {
      const poolConfigKey = decodeEntryKey(config_entry.key());
      switch (poolConfigKey) {
        case 'bstop_rate':
          backstopRate = Number(config_entry.val().u32().toString());
          return;
        case 'oracle':
          oracle = Address.fromScVal(config_entry.val()).toString();
          return;
        case 'status':
          status = scValToNative(config_entry.val());
          return;
        case 'max_positions':
          maxPositions = Number(config_entry.val().u32().toString());
          return;
        default:
          throw Error(`Invalid pool config key: should not contain ${poolConfigKey}`);
      }
    });
    if (
      backstopRate == undefined ||
      oracle == undefined ||
      status == undefined ||
      maxPositions == undefined
    ) {
      throw new Error();
    }
    return new PoolConfig(backstopRate, maxPositions, oracle, status);
  }
}

export class Market {
  constructor(public poolConfig: PoolConfig, public reserves: ContractReserve[]) {}

  static fromScVal(sc_val: xdr.ScVal | string): Market {
    if (typeof sc_val == 'string') {
      sc_val = xdr.ScVal.fromXDR(sc_val, 'base64');
    }
    const vec = sc_val.vec();
    if (vec == undefined) {
      throw Error('Market contract data value is not a vec');
    }
    const poolConfig: PoolConfig = PoolConfig.fromScVal(vec[0]);
    const reserves: ContractReserve[] = vec[1]
      .vec()
      .map((reserve) => ContractReserve.fromScVal(reserve));

    if (poolConfig == undefined || reserves == undefined) {
      throw Error('Unable to load market data');
    }
    return new Market(poolConfig, reserves);
  }
}

export type PoolDataKey =
  | { tag: 'Admin' }
  | { tag: 'Name' }
  | { tag: 'Backstop' }
  | { tag: 'BLNDTkn' }
  | { tag: 'Config' }
  | { tag: 'PoolEmis' }
  | { tag: 'ResList' }
  | { tag: 'Positions'; values: [string] }
  | { tag: 'ResConfig'; values: [string] }
  | { tag: 'ResData'; values: [string] }
  | { tag: 'EmisConfig'; values: [u32] }
  | { tag: 'EmisData'; values: [u32] }
  | { tag: 'UserEmis'; values: [UserReserveKey] }
  | { tag: 'Auction'; values: [AuctionKey] }
  | { tag: 'AuctData'; values: [string] }
  | { tag: 'ResInit'; values: [string] };

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
    case 'Config':
      return ((i) => xdr.ScVal.scvSymbol(i))('Config');
    case 'PoolEmis':
      return ((i) => xdr.ScVal.scvSymbol(i))('PoolEmis');
    case 'ResList':
      return ((i) => xdr.ScVal.scvSymbol(i))('ResList');
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
    case 'ResInit':
      res.push(((i) => xdr.ScVal.scvSymbol(i))('ResInit'));
      res.push(...((i) => [((i) => Address.fromString(i).toScVal())(i[0])])(poolDataKey.values));
      break;
  }
  return xdr.ScVal.scvVec(res);
}
