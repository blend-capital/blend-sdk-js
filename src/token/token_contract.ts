import { Address, Contract, Operation, xdr } from 'stellar-base';
import * as scval_converter from '../scval_converter';

export class TokenContract {
  _contract: Contract;
  id: string;

  constructor(address: string) {
    this._contract = new Contract(address);
    this.id = address;
  }

  public initialize(
    admin: Address,
    decimal: number,
    name: string,
    symbol: string
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'initialize',
      admin.toScVal(),
      xdr.ScVal.scvU32(decimal),
      xdr.ScVal.scvBytes(Buffer.from(name)),
      xdr.ScVal.scvBytes(Buffer.from(symbol))
    );
  }

  public mint(
    admin: Address,
    to: Address,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'mint',
      admin.toScVal(),
      to.toScVal(),
      scval_converter.bigintToI128(amount)
    );
  }

  public clawback(
    admin: Address,
    from: Address,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'clawback',
      admin.toScVal(),
      from.toScVal(),
      scval_converter.bigintToI128(amount)
    );
  }

  public incrAllowance(
    from: Address,
    spender: Address,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'incr_allow',
      from.toScVal(),
      spender.toScVal(),
      scval_converter.bigintToI128(amount)
    );
  }

  public decrAllowance(
    from: Address,
    spender: Address,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'decr_allow',
      from.toScVal(),
      spender.toScVal(),
      scval_converter.bigintToI128(amount)
    );
  }

  public transfer(
    from: Address,
    to: Address,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'xfer',
      from.toScVal(),
      to.toScVal(),
      scval_converter.bigintToI128(amount)
    );
  }

  /***** DataKeys *****/

  public datakey_balance(from: Address): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Balance'), from.toScVal()]);
  }

  public datakey_allowance(from: Address, spender: Address): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Allowance'),
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('from'),
          val: from.toScVal(),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('spender'),
          val: spender.toScVal(),
        }),
      ]),
    ]);
  }
}
