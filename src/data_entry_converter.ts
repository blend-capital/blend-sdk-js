/**
 * Convert basic types out of contract data entries
 */

import { xdr } from 'stellar-base';
import * as scval_converter from './scval_converter';

// Expects val to be of type `Vec[scvBytes]`
export function toHexStringArray(xdr_string: string): string[] {
  const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
  const data_val = data_entry.val().vec();
  if (data_val == undefined) {
    throw Error('contract data value is not an array');
  }
  return data_val.map((val) => scval_converter.scvalToString(val));
}
