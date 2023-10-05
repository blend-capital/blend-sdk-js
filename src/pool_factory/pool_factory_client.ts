import { Contract, Address, xdr, ContractSpec } from 'soroban-client';
import { PoolInitMeta } from './index.js';
import { ContractResult, Network, TxOptions, u64 } from '../index.js';
import { invokeOperation } from '../tx.js';

export interface DeployArgs {
  admin: Address | string;
  name: string;
  salt: Buffer;
  oracle: Address | string;
  backstop_take_rate: u64;
}

export class PoolFactoryClient {
  address: string;
  private contract: Contract;
  spec: ContractSpec;

  constructor(address: string) {
    this.address = address;
    this.contract = new Contract(address);
    // @dev: Generated from soroban-cli Typescript bindings
    this.spec = new ContractSpec([
      'AAAABAAAAAAAAAAAAAAAEFBvb2xGYWN0b3J5RXJyb3IAAAACAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAACgAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAAMg==',
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAOcG9vbF9pbml0X21ldGEAAAAAB9AAAAAMUG9vbEluaXRNZXRhAAAAAA==',
      'AAAAAAAAAAAAAAAGZGVwbG95AAAAAAAFAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAARAAAAAAAAAARzYWx0AAAD7gAAACAAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAGAAAAAQAAABM=',
      'AAAAAAAAAAAAAAAHaXNfcG9vbAAAAAABAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAQAAAAE=',
      'AAAAAgAAAAAAAAAAAAAAElBvb2xGYWN0b3J5RGF0YUtleQAAAAAAAQAAAAEAAAAAAAAACUNvbnRyYWN0cwAAAAAAAAEAAAAT',
      'AAAAAQAAAAAAAAAAAAAADFBvb2xJbml0TWV0YQAAAAQAAAAAAAAACGJhY2tzdG9wAAAAEwAAAAAAAAAHYmxuZF9pZAAAAAATAAAAAAAAAAlwb29sX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAAHdXNkY19pZAAAAAAT',
    ]);
  }

  async initialize(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    pool_init_meta: PoolInitMeta
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'initialize',
        ...this.spec.funcArgsToScVals('initialize', { pool_init_meta })
      )
    );
  }

  async deploy(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: DeployArgs
  ): Promise<ContractResult<Address>> {
    return await invokeOperation<Address>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): Address | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('deploy', value);
      },
      this.contract.call('deploy', ...this.spec.funcArgsToScVals('deploy', contractArgs))
    );
  }
}
