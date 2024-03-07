import { Address, Contract, ContractSpec, xdr } from 'stellar-sdk';
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

export class PoolFactoryContract extends Contract {
  spec: ContractSpec;

  constructor(address: string) {
    super(address);
    // @dev: Generated from soroban-cli Typescript bindings
    this.spec = new ContractSpec([
      'AAAABAAAAKlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgZmFjdG9yeSBjb250cmFjdC4gQ29tbW9uIGVycm9ycyBhcmUgY29kZXMgdGhhdCBtYXRjaCB1cCB3aXRoIHRoZSBidWlsdC1pbgpjb250cmFjdHMgZXJyb3IgcmVwb3J0aW5nLiBQb29sIGZhY3Rvcnkgc3BlY2lmaWMgZXJyb3JzIHN0YXJ0IGF0IDEzMDAuAAAAAAAAAAAAABBQb29sRmFjdG9yeUVycm9yAAAAAwAAAAAAAAANSW50ZXJuYWxFcnJvcgAAAAAAAAEAAAAAAAAAF0FscmVhZHlJbml0aWFsaXplZEVycm9yAAAAAAMAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAFFA==',
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAOcG9vbF9pbml0X21ldGEAAAAAB9AAAAAMUG9vbEluaXRNZXRhAAAAAA==',
      'AAAAAAAAAAAAAAAGZGVwbG95AAAAAAAGAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAARAAAAAAAAAARzYWx0AAAD7gAAACAAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAEAAAAT',
      'AAAAAAAAAAAAAAAHaXNfcG9vbAAAAAABAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAQAAAAE=',
      'AAAAAgAAAAAAAAAAAAAAElBvb2xGYWN0b3J5RGF0YUtleQAAAAAAAQAAAAEAAAAAAAAACUNvbnRyYWN0cwAAAAAAAAEAAAAT',
      'AAAAAQAAAAAAAAAAAAAADFBvb2xJbml0TWV0YQAAAAQAAAAAAAAACGJhY2tzdG9wAAAAEwAAAAAAAAAHYmxuZF9pZAAAAAATAAAAAAAAAAlwb29sX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAAHdXNkY19pZAAAAAAT',
    ]);
  }
  readonly parsers = {
    initialize: () => {},
    deploy: (result: string): string => this.spec.funcResToNative('deploy', result),
    isPool: (result: string): boolean => this.spec.funcResToNative('is_pool', result),
  };

  initialize(pool_init_meta: PoolInitMeta): string {
    return this.call(
      'initialize',
      ...this.spec.funcArgsToScVals('initialize', { pool_init_meta })
    ).toXDR('base64');
  }

  deploy(contractArgs: DeployArgs): string {
    return this.call('deploy', ...this.spec.funcArgsToScVals('deploy', contractArgs)).toXDR(
      'base64'
    );
  }
}
