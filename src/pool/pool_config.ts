import { Address, xdr } from 'stellar-base';
import { scvalToNumber, scvalToString } from '../scval_converter';

export class PoolConfig {
  constructor(public bstop_rate: number, public oracle: string, public status: number) {}

  static fromContractDataXDR(xdr_string: string): PoolConfig {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .body()
      .data()
      .val()
      .map();
    if (data_entry_map == undefined) {
      throw Error('contract data value is not a map');
    }

    let bstop_rate: number | undefined;
    let oracle: string | undefined;
    let status: number | undefined;
    for (const map_entry of data_entry_map) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'bstop_rate':
          bstop_rate = scvalToNumber(map_entry.val());
          break;
        case 'oracle':
          oracle = scvalToString(map_entry.val(), 'hex');
          break;
        case 'status':
          status = scvalToNumber(map_entry.val());
          break;
        default:
          throw Error(
            `scvMap value malformed: should not contain ${map_entry?.key()?.sym()?.toString()}`
          );
      }
    }

    if (bstop_rate == undefined || oracle == undefined || status == undefined) {
      throw Error('scvMap value malformed');
    }

    return new PoolConfig(bstop_rate, oracle, status);
  }

  public PoolConfigToXDR(poolConfig?: PoolConfig): xdr.ScVal {
    if (!poolConfig) {
      return xdr.ScVal.scvVoid();
    }
    const arr = [
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('bstop_rate'),
        val: ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(poolConfig.bstop_rate),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('oracle'),
        val: ((i) => Address.fromString(i).toScVal())(poolConfig.oracle),
      }),
      new xdr.ScMapEntry({
        key: ((i) => xdr.ScVal.scvSymbol(i))('status'),
        val: ((i) => xdr.ScVal.scvU32(i))(poolConfig.status),
      }),
    ];
    return xdr.ScVal.scvMap(arr);
  }
}
