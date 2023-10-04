import { Address, Contract } from 'soroban-client';
import { bigintToI128 } from '../scval_converter';

export class OracleOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public set_price({ asset, price }: { asset: string; price: bigint }): string {
    const invokeArgs = {
      method: 'set_price',
      args: [((i) => Address.fromString(i).toScVal())(asset), ((i) => bigintToI128(i))(price)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
