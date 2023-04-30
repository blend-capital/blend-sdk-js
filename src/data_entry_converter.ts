/**
 * Convert basic types out of contract data entries
 */

import { xdr } from 'stellar-base';
import * as scval_converter from './scval_converter';

// Expects val to an ScVal that can be converted to a hex string
export function toString(xdr_string: string, encoding?: BufferEncoding | undefined): string {
  const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
  const data_val = data_entry.val();
  const temp = scval_converter.scvalToString(data_val, encoding);
  return temp;
}

// Expects val to be of type `Vec[scvBytes]`
export function toStringArray(xdr_string: string, encoding: BufferEncoding | undefined): string[] {
  const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
  const data_val = data_entry.val().vec();
  if (data_val == undefined) {
    throw Error('contract data value is not an array');
  }
  return data_val.map((val) => scval_converter.scvalToString(val, encoding));
}

// Expects val to an ScVal that can be converted to BigInt
export function toBigInt(xdr_string: string): bigint {
  const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
  const data_val = data_entry.val();
  return scval_converter.scvalToBigInt(data_val);
}

// Expects val to an ScVal that can be converted to number
export function toNumber(xdr_string: string): number {
  const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
  const data_val = data_entry.val();
  return scval_converter.scvalToNumber(data_val);
}

// Expects val to be directly converted to a BigInt or a map with
export function toTokenBalance(xdr_string: string): bigint {
  const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
  const data_val = data_entry.val();
  switch (data_val.switch()) {
    case xdr.ScValType.scvI128():
      return scval_converter.scvalToBigInt(data_val);
    case xdr.ScValType.scvMap(): {
      const amount_entry = data_val
        .map()
        ?.find((map_entry) => map_entry?.key()?.sym()?.toString() == 'amount')
        ?.val();
      if (amount_entry == undefined) {
        throw Error('unable to find map entry with key "amount"');
      }
      return scval_converter.scvalToBigInt(amount_entry);
    }
    default:
      throw Error(`invalid ScValType for a token balance: ${data_val.switch()}`);
  }
}
