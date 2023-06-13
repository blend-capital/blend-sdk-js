import { Contract, Address, xdr } from 'stellar-base';
import { PoolInitMeta, PoolInitMetaToXDR } from '.';
import { u64 } from '..';

export class PoolFactoryOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public initialize({ pool_init_meta }: { pool_init_meta: PoolInitMeta }) {
    const invokeArgs = {
      method: 'initialize',
      args: [((i) => PoolInitMetaToXDR(i))(pool_init_meta)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public deploy({
    admin,
    name,
    salt,
    oracle,
    backstop_take_rate,
  }: {
    admin: string;
    name: string;
    salt: Buffer;
    oracle: string;
    backstop_take_rate: u64;
  }): string {
    const invokeArgs = {
      method: 'deploy',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => xdr.ScVal.scvSymbol(i))(name),
        ((i) => xdr.ScVal.scvBytes(i))(salt),
        ((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(oracle),
        ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(backstop_take_rate),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public is_pool({ pool_address }: { pool_address: string }): string {
    const invokeArgs = {
      method: 'is_pool',
      args: [((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(pool_address)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
