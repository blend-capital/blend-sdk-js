import { scValToBigInt, xdr } from 'stellar-base';
import { i128, u64 } from '..';

export * from './oracle_op_builder';

export interface AssetPrices {
  price: bigint;
  assetKey: string;
}

export interface PriceData {
  price: i128;
  timestamp: u64;
}

export function PriceDataFromXDR(xdr_string: string): PriceData {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .body()
    .data()
    .val()
    .map();

  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }
  let price: i128 | undefined;
  let timestamp: u64 | undefined;

  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'price': {
        price = scValToBigInt(map_entry.val());
        break;
      }
      case 'timestamp': {
        timestamp = scValToBigInt(map_entry.val());
        break;
      }
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (price == undefined || timestamp == undefined) {
    throw Error('xdr_string is malformed');
  }
  return {
    price,
    timestamp,
  };
}
