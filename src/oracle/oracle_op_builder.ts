import { Address, Contract, xdr } from 'stellar-base';

export class OracleOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public set_price({ asset, price }: { asset: string; price: bigint }): string {
    const invokeArgs = {
      method: 'set_price',
      args: [
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(price),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
