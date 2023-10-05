import { xdr } from 'soroban-client';
import { scvalToBigInt, scvalToNumber } from '../scval_converter.js';

export class Q4W {
  amount: bigint;
  exp: number;

  constructor(amount: bigint, exp: number) {
    this.amount = amount;
    this.exp = exp;
  }

  static fromContractDataXDR(xdr_string: string): Q4W[] {
    const q4w: Q4W[] = [];

    const data_entry = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64').contractData();
    const data_val = data_entry.val().vec();
    if (data_val == undefined) {
      throw Error('contract data value is not an array');
    }

    data_val.map((val) => {
      const scv_map = val.map();
      if (scv_map == undefined) {
        throw Error('contract data array value is not a map');
      }
      const amount = scv_map
        .find((map_entry) => map_entry?.key()?.sym()?.toString() == 'amount')
        ?.val();
      const exp = scv_map.find((map_entry) => map_entry?.key()?.sym()?.toString() == 'exp')?.val();
      if (scv_map.length !== 2 || amount == undefined || exp == undefined) {
        throw Error('scvMap value malformed');
      }
      q4w.push(new Q4W(scvalToBigInt(amount), scvalToNumber(exp)));
    });
    return q4w;
  }
}
