import { Address, Contract, contract, Operation, scValToNative, xdr } from '@stellar/stellar-sdk';
import { PoolInitMeta } from './index.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface DeployArgs {
  admin: Address | string;
  name: string;
  salt: Buffer;
  oracle: Address | string;
  backstop_take_rate: number;
  max_positions: number;
}

export abstract class PoolFactoryContract extends Contract {
  // @dev: Generated from soroban-cli Typescript bindings
  static spec: contract.Spec = new contract.Spec([
    'AAAABAAAAKlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgZmFjdG9yeSBjb250cmFjdC4gQ29tbW9uIGVycm9ycyBhcmUgY29kZXMgdGhhdCBtYXRjaCB1cCB3aXRoIHRoZSBidWlsdC1pbgpjb250cmFjdHMgZXJyb3IgcmVwb3J0aW5nLiBQb29sIGZhY3Rvcnkgc3BlY2lmaWMgZXJyb3JzIHN0YXJ0IGF0IDEzMDAuAAAAAAAAAAAAABBQb29sRmFjdG9yeUVycm9yAAAAAwAAAAAAAAANSW50ZXJuYWxFcnJvcgAAAAAAAAEAAAAAAAAAF0FscmVhZHlJbml0aWFsaXplZEVycm9yAAAAAAMAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAFFA==',
    'AAAAAAAAAAAAAAAGZGVwbG95AAAAAAAGAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAARzYWx0AAAD7gAAACAAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAEAAAAT',
    'AAAAAAAAAAAAAAAHaXNfcG9vbAAAAAABAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAQAAAAE=',
    'AAAAAgAAAAAAAAAAAAAAElBvb2xGYWN0b3J5RGF0YUtleQAAAAAAAQAAAAEAAAAAAAAACUNvbnRyYWN0cwAAAAAAAAEAAAAT',
    'AAAAAQAAAAAAAAAAAAAADFBvb2xJbml0TWV0YQAAAAMAAAAAAAAACGJhY2tzdG9wAAAAEwAAAAAAAAAHYmxuZF9pZAAAAAATAAAAAAAAAAlwb29sX2hhc2gAAAAAAAPuAAAAIA==',
  ]);

  static readonly parsers = {
    deployPool: (result: string): string =>
      PoolFactoryContract.spec.funcResToNative('deploy', result),
    isPool: (result: string): boolean =>
      PoolFactoryContract.spec.funcResToNative('is_pool', result),
  };

  deployPool(contractArgs: DeployArgs): string {
    return this.call(
      'deploy',
      ...PoolFactoryContract.spec.funcArgsToScVals('deploy', contractArgs)
    ).toXDR('base64');
  }

  isPool(pool_address: string): string {
    return this.call(
      'deploy',
      ...PoolFactoryContract.spec.funcArgsToScVals('deploy', { pool_address })
    ).toXDR('base64');
  }
}

export class PoolFactoryContractV1 extends PoolFactoryContract {
  constructor(address: string) {
    super(address);
  }

  static readonly spec: contract.Spec = new contract.Spec([
    ...PoolFactoryContract.spec.entries,
    ...new contract.Spec([
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAOcG9vbF9pbml0X21ldGEAAAAAB9AAAAAMUG9vbEluaXRNZXRhAAAAAA==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolFactoryContract.parsers,
    initialize: () => {},
  };

  initialize(pool_init_meta: PoolInitMeta): string {
    return this.call(
      'initialize',
      ...PoolFactoryContractV1.spec.funcArgsToScVals('initialize', { pool_init_meta })
    ).toXDR('base64');
  }
}

export class PoolFactoryContractV2 extends PoolFactoryContract {
  constructor(address: string) {
    super(address);
  }

  static readonly spec: contract.Spec = new contract.Spec([
    ...PoolFactoryContract.spec.entries,
    ...new contract.Spec([
      'AAAAAAAAAGhDb25zdHJ1Y3QgdGhlIHBvb2wgZmFjdG9yeSBjb250cmFjdAoKIyMjIEFyZ3VtZW50cwoqIGBwb29sX2luaXRfbWV0YWAgLSBUaGUgcG9vbCBpbml0aWFsaXphdGlvbiBtZXRhZGF0YQAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAQAAAAAAAAAOcG9vbF9pbml0X21ldGEAAAAAB9AAAAAMUG9vbEluaXRNZXRhAAAAAA==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolFactoryContract.parsers,
    constructor: (result: string): string => scValToNative(xdr.ScVal.fromXDR(result, 'base64')),
  };

  static deploy(
    deployer: string,
    wasmHash: Buffer | string,
    pool_init_meta: PoolInitMeta,
    salt?: Buffer,
    format?: 'hex' | 'base64'
  ): string {
    return Operation.createCustomContract({
      address: Address.fromString(deployer),
      wasmHash:
        typeof wasmHash === 'string'
          ? Buffer.from(wasmHash, format ?? 'hex')
          : (wasmHash as Buffer),
      salt,
      constructorArgs: this.spec.funcArgsToScVals('__constructor', { pool_init_meta }),
    }).toXDR('base64');
  }
}
