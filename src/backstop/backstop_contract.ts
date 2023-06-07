import { Address, Contract, Operation, xdr } from 'stellar-base';
import * as scval_converter from '../scval_converter';

export class BackstopContract {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public initialize(
    backstop_token_id: string,
    blnd_token_id: string,
    pool_factory_id: string
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'initialize',
      xdr.ScVal.scvBytes(Buffer.from(backstop_token_id, 'hex')),
      xdr.ScVal.scvBytes(Buffer.from(blnd_token_id, 'hex')),
      xdr.ScVal.scvBytes(Buffer.from(pool_factory_id, 'hex'))
    );
  }

  public deposit(
    from: Address,
    pool_id: string,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'deposit',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
      scval_converter.bigintToI128(amount)
    );
  }

  public q_withdraw(
    from: Address,
    pool_id: string,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'queue_withdrawal',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
      scval_converter.bigintToI128(amount)
    );
  }

  public dequeue_wd(
    from: Address,
    pool_id: string,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'dequeue_withdrawal',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
      scval_converter.bigintToI128(amount)
    );
  }

  public withdraw(
    from: Address,
    pool_id: string,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'withdraw',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
      scval_converter.bigintToI128(amount)
    );
  }

  /*========== Data Keys ==========*/

  /***** Backstop ******/

  public datakey_RewardZone(): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('RewardZone')]);
  }

  /***** Pool ******/

  public datakey_PoolToken(pool_id: string): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('PoolTkn'),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
    ]);
  }

  public datakey_PoolShares(pool_id: string): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('PoolShares'),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
    ]);
  }

  public datakey_PoolQ4W(pool_id: string): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('PoolQ4W'),
      xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
    ]);
  }

  /***** User ******/

  public datakey_UserShares(pool_id: string, user: Address): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Shares'), getPoolUserKey(pool_id, user)]);
  }

  public datakey_UserQ4W(pool_id: string, user: Address): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Q4W'), getPoolUserKey(pool_id, user)]);
  }
}

function getPoolUserKey(pool_id: string, user: Address): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('pool'),
      val: xdr.ScVal.scvBytes(Buffer.from(pool_id, 'hex')),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('user'),
      val: user.toScVal(),
    }),
  ]);
}
