import { Address, Contract, Operation, xdr } from 'stellar-base';
import * as scval_converter from '../scval_converter';

export class PoolContract {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public supply(
    from: Address,
    asset_id: string,
    amount: bigint
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'supply',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(asset_id, 'hex')),
      scval_converter.bigintToI128(amount)
    );
  }

  public withdraw(
    from: Address,
    asset_id: string,
    amount: bigint,
    to: Address
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'withdraw',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(asset_id, 'hex')),
      scval_converter.bigintToI128(amount),
      to.toScVal()
    );
  }

  public borrow(
    from: Address,
    asset_id: string,
    amount: bigint,
    to: Address
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'borrow',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(asset_id, 'hex')),
      scval_converter.bigintToI128(amount),
      to.toScVal()
    );
  }

  public repay(
    from: Address,
    asset_id: string,
    amount: bigint,
    on_behalf_of: Address
  ): xdr.Operation<Operation.InvokeHostFunction> {
    return this._contract.call(
      'repay',
      from.toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(asset_id, 'hex')),
      scval_converter.bigintToI128(amount),
      on_behalf_of.toScVal()
    );
  }

  /***** Data Keys *****/

  public datakey_PoolEmissionsConfig(): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('PEConfig')]);
  }

  public datakey_ResList(): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('ResList')]);
  }

  public datakey_ResConfig(asset_id: string): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('ResConfig'),
      xdr.ScVal.scvBytes(Buffer.from(asset_id, 'hex')),
    ]);
  }

  public datakey_ResData(asset_id: string): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('ResData'),
      xdr.ScVal.scvBytes(Buffer.from(asset_id, 'hex')),
    ]);
  }

  public datakey_ResEmisConfig(res_index: number): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('EmisConfig'), xdr.ScVal.scvU32(res_index)]);
  }

  public datakey_ResEmisData(res_index: number): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('EmisData'), xdr.ScVal.scvU32(res_index)]);
  }

  public datakey_UserConfig(user: Address): xdr.ScVal {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('UserConfig'), user.toScVal()]);
  }

  public datakey_UserEmissions(user: Address, res_index: number): xdr.ScVal {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('UserEmis'),
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('reserve_id'),
          val: xdr.ScVal.scvU32(res_index),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('user'),
          val: user.toScVal(),
        }),
      ]),
    ]);
  }
}
