import { Address, Contract, xdr } from 'stellar-base';
import { u32, i128 } from '..';
import { bigintToI128 } from '../scval_converter';

export class TokenOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public initialize({
    admin,
    decimal,
    name,
    symbol,
  }: {
    admin: string;
    decimal: u32;
    name: Buffer;
    symbol: Buffer;
  }): string {
    const invokeArgs = {
      method: 'initialize',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => xdr.ScVal.scvU32(i))(decimal),
        ((i) => xdr.ScVal.scvBytes(i))(name),
        ((i) => xdr.ScVal.scvBytes(i))(symbol),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public clawback({ from, amount }: { from: string; amount: i128 }): string {
    const invokeArgs = {
      method: 'clawback',
      args: [((i) => Address.fromString(i).toScVal())(from), ((i) => bigintToI128(i))(amount)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public mint({ to, amount }: { to: string; amount: i128 }): string {
    const invokeArgs = {
      method: 'mint',
      args: [((i) => Address.fromString(i).toScVal())(to), ((i) => bigintToI128(i))(amount)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public set_admin({ new_admin }: { new_admin: string }): string {
    const invokeArgs = {
      method: 'set_admin',
      args: [((i) => Address.fromString(i).toScVal())(new_admin)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public setauthorized({ id, authorize }: { id: string; authorize: boolean }): string {
    const invokeArgs = {
      method: 'setauthorized',
      args: [
        ((i) => Address.fromString(i).toScVal())(id),
        ((i) => xdr.ScVal.scvBool(i))(authorize),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public increase_allowance({
    from,
    spender,
    amount,
  }: {
    from: string;
    spender: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'increase_allowance',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(spender),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public decrease_allowance({
    from,
    spender,
    amount,
  }: {
    from: string;
    spender: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'decrease_allowance',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(spender),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public transfer({ from, to, amount }: { from: string; to: string; amount: i128 }): string {
    const invokeArgs = {
      method: 'transfer',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(to),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public transferfrom({
    spender,
    from,
    to,
    amount,
  }: {
    spender: string;
    from: string;
    to: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'transferfrom',
      args: [
        ((i) => Address.fromString(i).toScVal())(spender),
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(to),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public burn({ from, amount }: { from: string; amount: i128 }): string {
    const invokeArgs = {
      method: 'burn',
      args: [((i) => Address.fromString(i).toScVal())(from), ((i) => bigintToI128(i))(amount)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public burnfrom({
    _spender,
    from,
    amount,
  }: {
    _spender: string;
    from: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'burnfrom',
      args: [
        ((i) => Address.fromString(i).toScVal())(_spender),
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public balance({ id }: { id: string }): string {
    const invokeArgs = {
      method: 'balance',
      args: [((i) => Address.fromString(i).toScVal())(id)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public spendable({ id }: { id: string }): string {
    const invokeArgs = {
      method: 'spendable',
      args: [((i) => Address.fromString(i).toScVal())(id)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public authorized({ id }: { id: string }): string {
    const invokeArgs = {
      method: 'authorized',
      args: [((i) => Address.fromString(i).toScVal())(id)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public allowance({ from, spender }: { from: string; spender: string }): string {
    const invokeArgs = {
      method: 'allowance',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(spender),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public decimals(): string {
    const invokeArgs = { method: 'decimals', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public name(): string {
    const invokeArgs = { method: 'name', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public symbol(): string {
    const invokeArgs = { method: 'symbol', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public pool(): string {
    const invokeArgs = { method: 'pool', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public asset(): string {
    const invokeArgs = { method: 'asset', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public initialize_asset({ admin, asset, index }: { admin: string; asset: string; index: u32 }) {
    const invokeArgs = {
      method: 'initialize_asset',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => xdr.ScVal.scvU32(i))(index),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
