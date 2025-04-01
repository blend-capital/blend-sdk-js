import { Address, Contract, contract, Operation, scValToNative, xdr } from '@stellar/stellar-sdk';
import { PoolInitMeta } from './index.js';
import { i128 } from '../index.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface DeployV1Args {
  admin: Address | string;
  name: string;
  salt: Buffer;
  oracle: Address | string;
  backstop_take_rate: number;
  max_positions: number;
}

export interface DeployV2Args {
  admin: Address | string;
  name: string;
  salt: Buffer;
  oracle: Address | string;
  min_collateral: i128;
  backstop_take_rate: number;
  max_positions: number;
}

export abstract class PoolFactoryContract extends Contract {
  // @dev: Generated from soroban-cli Typescript bindings
  static spec: contract.Spec = new contract.Spec([
    // Enum PoolFactoryError
    'AAAABAAAAKlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgZmFjdG9yeSBjb250cmFjdC4gQ29tbW9uIGVycm9ycyBhcmUgY29kZXMgdGhhdCBtYXRjaCB1cCB3aXRoIHRoZSBidWlsdC1pbgpjb250cmFjdHMgZXJyb3IgcmVwb3J0aW5nLiBQb29sIGZhY3Rvcnkgc3BlY2lmaWMgZXJyb3JzIHN0YXJ0IGF0IDEzMDAuAAAAAAAAAAAAABBQb29sRmFjdG9yeUVycm9yAAAAAwAAAAAAAAANSW50ZXJuYWxFcnJvcgAAAAAAAAEAAAAAAAAAF0FscmVhZHlJbml0aWFsaXplZEVycm9yAAAAAAMAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAFFA==',
    // Function is_pool
    'AAAAAAAAAAAAAAAHaXNfcG9vbAAAAAABAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAQAAAAE=',
    // Union PoolFactoryDataKey
    'AAAAAgAAAAAAAAAAAAAAElBvb2xGYWN0b3J5RGF0YUtleQAAAAAAAQAAAAEAAAAAAAAACUNvbnRyYWN0cwAAAAAAAAEAAAAT',
    // Struct PoolInitMeta
    'AAAAAQAAAAAAAAAAAAAADFBvb2xJbml0TWV0YQAAAAMAAAAAAAAACGJhY2tzdG9wAAAAEwAAAAAAAAAHYmxuZF9pZAAAAAATAAAAAAAAAAlwb29sX2hhc2gAAAAAAAPuAAAAIA==',
  ]);

  static readonly parsers = {
    isPool: (result: string): boolean =>
      PoolFactoryContract.spec.funcResToNative('is_pool', result),
  };

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
      // Function initialize
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAOcG9vbF9pbml0X21ldGEAAAAAB9AAAAAMUG9vbEluaXRNZXRhAAAAAA==',
      // Function Deploy
      'AAAAAAAAAAAAAAAGZGVwbG95AAAAAAAGAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAARzYWx0AAAD7gAAACAAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAEAAAAT',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolFactoryContract.parsers,
    deployPool: (result: string): string =>
      PoolFactoryContractV1.spec.funcResToNative('deploy', result),
    initialize: () => {},
  };

  initialize(pool_init_meta: PoolInitMeta): string {
    return this.call(
      'initialize',
      ...PoolFactoryContractV1.spec.funcArgsToScVals('initialize', { pool_init_meta })
    ).toXDR('base64');
  }
  deployPool(contractArgs: DeployV1Args): string {
    return this.call(
      'deploy',
      ...PoolFactoryContractV1.spec.funcArgsToScVals('deploy', contractArgs)
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
      // Function constructor
      'AAAAAAAAAGhDb25zdHJ1Y3QgdGhlIHBvb2wgZmFjdG9yeSBjb250cmFjdAoKIyMjIEFyZ3VtZW50cwoqIGBwb29sX2luaXRfbWV0YWAgLSBUaGUgcG9vbCBpbml0aWFsaXphdGlvbiBtZXRhZGF0YQAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAQAAAAAAAAAOcG9vbF9pbml0X21ldGEAAAAAB9AAAAAMUG9vbEluaXRNZXRhAAAAAA==',
      // Function deploy
      'AAAAAAAAAAAAAAAGZGVwbG95AAAAAAAHAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAARzYWx0AAAD7gAAACAAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAAAAAAObWluX2NvbGxhdGVyYWwAAAAAAAsAAAABAAAAEw==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolFactoryContract.parsers,
    constructor: (result: string): string => scValToNative(xdr.ScVal.fromXDR(result, 'base64')),
    deployPool: (result: string): string =>
      PoolFactoryContractV2.spec.funcResToNative('deploy', result),
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

  deployPool(contractArgs: DeployV2Args): string {
    return this.call(
      'deploy',
      ...PoolFactoryContractV2.spec.funcArgsToScVals('deploy', contractArgs)
    ).toXDR('base64');
  }
}
