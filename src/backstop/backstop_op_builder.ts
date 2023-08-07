import { Address, Contract, xdr } from 'stellar-base';
import { i128 } from '..';
import { bigintToI128 } from '../scval_converter';

export class BackstopOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public initialize({
    backstop_token,
    blnd_token,
    pool_factory,
    drop_list,
  }: {
    backstop_token: string;
    blnd_token: string;
    pool_factory: string;
    drop_list: Map<string, i128>;
  }): string {
    const invokeArgs = {
      method: 'initialize',
      args: [
        ((i) => Address.fromString(i).toScVal())(backstop_token),
        ((i) => Address.fromString(i).toScVal())(blnd_token),
        ((i) => Address.fromString(i).toScVal())(pool_factory),
        ((i) =>
          xdr.ScVal.scvMap(
            Array.from(i.entries()).map(([key, value]) => {
              return new xdr.ScMapEntry({
                key: ((i) => Address.fromString(i).toScVal())(key),
                val: ((i) => bigintToI128(i))(value),
              });
            })
          ))(drop_list),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public deposit({
    from,
    pool_address,
    amount,
  }: {
    from: string;
    pool_address: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'deposit',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(pool_address),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public queue_withdrawal({
    from,
    pool_address,
    amount,
  }: {
    from: string;
    pool_address: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'queue_withdrawal',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(pool_address),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public dequeue_withdrawal({
    from,
    pool_address,
    amount,
  }: {
    from: string;
    pool_address: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'dequeue_withdrawal',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(pool_address),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public withdraw({
    from,
    pool_address,
    amount,
  }: {
    from: string;
    pool_address: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'withdraw',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(pool_address),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public user_balance({ pool, user }: { pool: string; user: string }): string {
    const invokeArgs = {
      method: 'user_balance',
      args: [
        ((i) => Address.fromString(i).toScVal())(pool),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public pool_balance({ pool }: { pool: string }): string {
    const invokeArgs = {
      method: 'pool_balance',
      args: [((i) => Address.fromString(i).toScVal())(pool)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public backstop_token(): string {
    const invokeArgs = { method: 'backstop_token', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public update_emission_cycle(): string {
    const invokeArgs = { method: 'update_emission_cycle', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public next_emission_cycle(): string {
    const invokeArgs = { method: 'next_emission_cycle', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public add_reward({ to_add, to_remove }: { to_add: string; to_remove: string }): string {
    const invokeArgs = {
      method: 'add_reward',
      args: [
        ((i) => Address.fromString(i).toScVal())(to_add),
        ((i) => Address.fromString(i).toScVal())(to_remove),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public get_rz(): string {
    const invokeArgs = { method: 'get_rz', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public pool_eps({ pool_address }: { pool_address: string }): string {
    const invokeArgs = {
      method: 'pool_eps',
      args: [((i) => Address.fromString(i).toScVal())(pool_address)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public claim({
    from,
    pool_addresses,
    to,
  }: {
    from: string;
    pool_addresses: Array<string>;
    to: string;
  }): string {
    const invokeArgs = {
      method: 'claim',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => xdr.ScVal.scvVec(i.map((j) => Address.contract(Buffer.from(j, 'hex')).toScVal())))(
          pool_addresses
        ),
        ((i) => Address.fromString(i).toScVal())(to),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public draw({
    pool_address,
    amount,
    to,
  }: {
    pool_address: string;
    amount: i128;
    to: string;
  }): string {
    const invokeArgs = {
      method: 'draw',
      args: [
        ((i) => Address.fromString(i).toScVal())(pool_address),
        ((i) => bigintToI128(i))(amount),
        ((i) => Address.fromString(i).toScVal())(to),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public donate({
    from,
    pool_address,
    amount,
  }: {
    from: string;
    pool_address: string;
    amount: i128;
  }): string {
    const invokeArgs = {
      method: 'donate',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(pool_address),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
