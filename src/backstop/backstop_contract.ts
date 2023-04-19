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
      'q_withdraw',
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
      'dequeue_wd',
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

  /***** DataKey *****/

  public datakey_RewardZone(): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('RewardZone')]);
  }
}
