import { Address, Contract, contract, Operation, scValToNative, xdr } from '@stellar/stellar-sdk';
import { i128, u32, u64 } from '../index.js';
import {
  AuctionData,
  PoolConfig,
  ContractReserve,
  Market,
  Positions,
  Request,
  ReserveConfig,
  ReserveEmissionMetadata,
} from './index.js';
import { EmissionDataV2, UserEmissions } from '../emissions.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface SubmitArgs {
  from: Address | string;
  spender: Address | string;
  to: Address | string;
  requests: Array<Request>;
}

export interface PoolConstructorArgs {
  admin: Address | string;
  name: string;
  oracle: Address | string;
  bstop_rate: u32;
  max_positions: u32;
  backstop_id: Address | string;
  blnd_id: Address | string;
}

export interface UpdatePoolArgs {
  backstop_take_rate: u32;
  max_positions: u32;
}

export interface SetReserveArgs {
  asset: Address | string;
  metadata: ReserveConfig;
}

export interface PoolClaimArgs {
  from: Address | string;
  reserve_token_ids: Array<u32>;
  to: Address | string;
}

export interface NewLiqudiationAuctionArgs {
  user: Address | string;
  percent_liquidated: u64;
}

export interface NewAuctionArgs {
  auction_type: u32;
  user: string;
  bid: Array<string>;
  lot: Array<string>;
  percent: u32;
}

export interface FlashLoanArgs {
  contract: Address | string;
  asset: Address | string;
  amount: i128;
}

export abstract class PoolContract extends Contract {
  // @dev: Generated from soroban-cli Typescript bindings
  static spec: contract.Spec = new contract.Spec([
    'AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=',
    'AAAAAAAAAAAAAAALdXBkYXRlX3Bvb2wAAAAAAgAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAA=',
    'AAAAAAAAAAAAAAARcXVldWVfc2V0X3Jlc2VydmUAAAAAAAACAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAACG1ldGFkYXRhAAAH0AAAAA1SZXNlcnZlQ29uZmlnAAAAAAAAAA==',
    'AAAAAAAAAAAAAAASY2FuY2VsX3NldF9yZXNlcnZlAAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABMAAAAA',
    'AAAAAAAAAAAAAAALc2V0X3Jlc2VydmUAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAQAAAAQ=',
    'AAAAAAAAAAAAAAANZ2V0X3Bvc2l0aW9ucwAAAAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAEAAAfQAAAACVBvc2l0aW9ucwAAAA==',
    'AAAAAAAAAAAAAAAGc3VibWl0AAAAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAIcmVxdWVzdHMAAAPqAAAH0AAAAAdSZXF1ZXN0AAAAAAEAAAfQAAAACVBvc2l0aW9ucwAAAA==',
    'AAAAAAAAAAAAAAAIYmFkX2RlYnQAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAA=',
    'AAAAAAAAAAAAAAANdXBkYXRlX3N0YXR1cwAAAAAAAAAAAAABAAAABA==',
    'AAAAAAAAAAAAAAAKc2V0X3N0YXR1cwAAAAAAAQAAAAAAAAALcG9vbF9zdGF0dXMAAAAABAAAAAA=',
    'AAAAAAAAAAAAAAAOZ3VscF9lbWlzc2lvbnMAAAAAAAAAAAABAAAACw==',
    'AAAAAAAAAAAAAAAUc2V0X2VtaXNzaW9uc19jb25maWcAAAABAAAAAAAAABVyZXNfZW1pc3Npb25fbWV0YWRhdGEAAAAAAAPqAAAH0AAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAAA',
    'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAARcmVzZXJ2ZV90b2tlbl9pZHMAAAAAAAPqAAAABAAAAAAAAAACdG8AAAAAABMAAAABAAAACw==',
    'AAAAAAAAAAAAAAALZ2V0X2F1Y3Rpb24AAAAAAgAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAABAAAH0AAAAAtBdWN0aW9uRGF0YQA=',
    'AAAAAQAAADRNZXRhZGF0YSBmb3IgYSBwb29sJ3MgcmVzZXJ2ZSBlbWlzc2lvbiBjb25maWd1cmF0aW9uAAAAAAAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAADAAAAAAAAAAlyZXNfaW5kZXgAAAAAAAAEAAAAAAAAAAhyZXNfdHlwZQAAAAQAAAAAAAAABXNoYXJlAAAAAAAABg==',
    'AAAAAQAAACdBIHJlcXVlc3QgYSB1c2VyIG1ha2VzIGFnYWluc3QgdGhlIHBvb2wAAAAAAAAAAAdSZXF1ZXN0AAAAAAMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAxyZXF1ZXN0X3R5cGUAAAAE',
    'AAAAAQAAAE1BIHVzZXIgLyBjb250cmFjdHMgcG9zaXRpb24ncyB3aXRoIHRoZSBwb29sLCBzdG9yZWQgaW4gdGhlIFJlc2VydmUncyBkZWNpbWFscwAAAAAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAwAAAAAAAAAKY29sbGF0ZXJhbAAAAAAD7AAAAAQAAAALAAAAAAAAAAtsaWFiaWxpdGllcwAAAAPsAAAABAAAAAsAAAAAAAAABnN1cHBseQAAAAAD7AAAAAQAAAAL',
    'AAAAAQAAABFUaGUgcG9vbCdzIGNvbmZpZwAAAAAAAAAAAAAKUG9vbENvbmZpZwAAAAAABAAAAAAAAAAKYnN0b3BfcmF0ZQAAAAAABAAAAAAAAAANbWF4X3Bvc2l0aW9ucwAAAAAAAAQAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAAE',
    'AAAAAQAAABpUaGUgcG9vbCdzIGVtaXNzaW9uIGNvbmZpZwAAAAAAAAAAABJQb29sRW1pc3Npb25Db25maWcAAAAAAAIAAAAAAAAABmNvbmZpZwAAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
    'AAAAAQAAAAAAAAAAAAAAEVF1ZXVlZFJlc2VydmVJbml0AAAAAAAAAgAAAAAAAAAKbmV3X2NvbmZpZwAAAAAH0AAAAA1SZXNlcnZlQ29uZmlnAAAAAAAAAAAAAAt1bmxvY2tfdGltZQAAAAAG',
    'AAAAAQAAABxUaGUgZGF0YSBmb3IgYSByZXNlcnZlIGFzc2V0AAAAAAAAAAtSZXNlcnZlRGF0YQAAAAAHAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAABmRfcmF0ZQAAAAAACwAAAAAAAAAIZF9zdXBwbHkAAAALAAAAAAAAAAZpcl9tb2QAAAAAAAsAAAAAAAAACWxhc3RfdGltZQAAAAAAAAY=',
    'AAAAAQAAADNUaGUgdXNlciBlbWlzc2lvbiBkYXRhIGZvciB0aGUgcmVzZXJ2ZSBiIG9yIGQgdG9rZW4AAAAAAAAAABBVc2VyRW1pc3Npb25EYXRhAAAAAgAAAAAAAAAHYWNjcnVlZAAAAAALAAAAAAAAAAVpbmRleAAAAAAAAAs=',
    'AAAAAQAAAAAAAAAAAAAADlVzZXJSZXNlcnZlS2V5AAAAAAACAAAAAAAAAApyZXNlcnZlX2lkAAAAAAAEAAAAAAAAAAR1c2VyAAAAEw==',
    'AAAAAQAAAAAAAAAAAAAACkF1Y3Rpb25LZXkAAAAAAAIAAAAAAAAACWF1Y3RfdHlwZQAAAAAAAAQAAAAAAAAABHVzZXIAAAAT',
    'AAAAAgAAAAAAAAAAAAAAC1Bvb2xEYXRhS2V5AAAAAAkAAAABAAAAAAAAAAlSZXNDb25maWcAAAAAAAABAAAAEwAAAAEAAAAAAAAAB1Jlc0luaXQAAAAAAQAAABMAAAABAAAAAAAAAAdSZXNEYXRhAAAAAAEAAAATAAAAAQAAAAAAAAAKRW1pc0NvbmZpZwAAAAAAAQAAAAQAAAABAAAAAAAAAAhFbWlzRGF0YQAAAAEAAAAEAAAAAQAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAQAAABMAAAABAAAAAAAAAAhVc2VyRW1pcwAAAAEAAAfQAAAADlVzZXJSZXNlcnZlS2V5AAAAAAABAAAAAAAAAAdBdWN0aW9uAAAAAAEAAAfQAAAACkF1Y3Rpb25LZXkAAAAAAAEAAAAAAAAACEF1Y3REYXRhAAAAAQAAABM=',
    'AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==',
    'AAAAAgAAAApBc3NldCB0eXBlAAAAAAAAAAAABUFzc2V0AAAAAAAAAgAAAAEAAAAAAAAAB1N0ZWxsYXIAAAAAAQAAABMAAAABAAAAAAAAAAVPdGhlcgAAAAAAAAEAAAAR',
  ]);

  static readonly parsers = {
    setAdmin: () => {},
    updatePool: () => {},
    queueSetReserve: () => {},
    cancelSetReserve: () => {},
    setReserve: (result: string): u32 => PoolContract.spec.funcResToNative('set_reserve', result),
    getPositions: (result: string): Positions => Positions.fromScVal(result),
    submit: (result: string): Positions => Positions.fromScVal(result),
    badDebt: () => {},
    updateStatus: (result: string): u32 =>
      PoolContract.spec.funcResToNative('update_status', result),
    setStatus: () => {},
    gulpEmissions: (result: string): i128 =>
      PoolContract.spec.funcResToNative('gulp_emissions', result),
    setEmissionsConfig: () => {},
    claim: (result: string): i128 => PoolContract.spec.funcResToNative('claim', result),
    getAuction: (result: string): AuctionData => AuctionData.fromScVal(result),
  };

  setAdmin(new_admin: Address | string): string {
    return this.call(
      'set_admin',
      ...PoolContract.spec.funcArgsToScVals('set_admin', { new_admin })
    ).toXDR('base64');
  }

  updatePool(contractArgs: UpdatePoolArgs): string {
    return this.call(
      'update_pool',
      ...PoolContract.spec.funcArgsToScVals('update_pool', contractArgs)
    ).toXDR('base64');
  }

  cancelSetReserve(asset: Address | string): string {
    return this.call(
      'cancel_set_reserve',
      ...PoolContract.spec.funcArgsToScVals('cancel_set_reserve', { asset })
    ).toXDR('base64');
  }

  setReserve(asset: Address | string): string {
    return this.call(
      'set_reserve',
      ...PoolContract.spec.funcArgsToScVals('set_reserve', { asset })
    ).toXDR('base64');
  }

  submit(contractArgs: SubmitArgs): string {
    return this.call('submit', ...PoolContract.spec.funcArgsToScVals('submit', contractArgs)).toXDR(
      'base64'
    );
  }

  badDebt(user: Address | string): string {
    return this.call('bad_debt', ...PoolContract.spec.funcArgsToScVals('bad_debt', { user })).toXDR(
      'base64'
    );
  }

  updateStatus(): string {
    return this.call(
      'update_status',
      ...PoolContract.spec.funcArgsToScVals('update_status', {})
    ).toXDR('base64');
  }

  setStatus(pool_status: u32): string {
    return this.call(
      'set_status',
      ...PoolContract.spec.funcArgsToScVals('set_status', { pool_status })
    ).toXDR('base64');
  }

  gulpEmissions(): string {
    return this.call(
      'gulp_emissions',
      ...PoolContract.spec.funcArgsToScVals('gulp_emissions', {})
    ).toXDR('base64');
  }

  setEmissionsConfig(res_emission_metadata: Array<ReserveEmissionMetadata>): string {
    return this.call(
      'set_emissions_config',
      ...PoolContract.spec.funcArgsToScVals('set_emissions_config', { res_emission_metadata })
    ).toXDR('base64');
  }

  claim(contractArgs: PoolClaimArgs): string {
    return this.call('claim', ...PoolContract.spec.funcArgsToScVals('claim', contractArgs)).toXDR(
      'base64'
    );
  }
  getAuction(auction_id: number): string {
    return this.call(
      'get_auction',
      ...PoolContract.spec.funcArgsToScVals('get_auction', { auction_id })
    ).toXDR('base64');
  }

  getPositions(user: Address | string): string {
    return this.call(
      'get_positions',
      ...PoolContract.spec.funcArgsToScVals('get_positions', { user })
    ).toXDR('base64');
  }
}

export class PoolContractV1 extends PoolContract {
  constructor(address: string) {
    super(address);
  }

  static readonly spec = new contract.Spec([
    ...PoolContract.spec.entries,
    ...new contract.Spec([
      'AAAAAQAAAAAAAAAAAAAAC0F1Y3Rpb25EYXRhAAAAAAMAAAAAAAAAA2JpZAAAAAPsAAAAEwAAAAsAAAAAAAAABWJsb2NrAAAAAAAABAAAAAAAAAADbG90AAAAA+wAAAATAAAACw==',
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAApic3RvcF9yYXRlAAAAAAAEAAAAAAAAAAxtYXhfcG9zdGlvbnMAAAAEAAAAAAAAAAtiYWNrc3RvcF9pZAAAAAATAAAAAAAAAAdibG5kX2lkAAAAABMAAAAA',
      'AAAAAAAAAAAAAAAXbmV3X2xpcXVpZGF0aW9uX2F1Y3Rpb24AAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAAEnBlcmNlbnRfbGlxdWlkYXRlZAAAAAAABgAAAAEAAAfQAAAAC0F1Y3Rpb25EYXRhAA==',
      'AAAAAAAAAAAAAAAUbmV3X2JhZF9kZWJ0X2F1Y3Rpb24AAAAAAAAAAQAAB9AAAAALQXVjdGlvbkRhdGEA',
      'AAAAAAAAAAAAAAAUbmV3X2ludGVyZXN0X2F1Y3Rpb24AAAABAAAAAAAAAAZhc3NldHMAAAAAA+oAAAATAAAAAQAAB9AAAAALQXVjdGlvbkRhdGEA',
      'AAAABAAAAJlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgY29udHJhY3QuIENvbW1vbiBlcnJvcnMgYXJlIGNvZGVzIHRoYXQgbWF0Y2ggdXAgd2l0aCB0aGUgYnVpbHQtaW4KY29udHJhY3RzIGVycm9yIHJlcG9ydGluZy4gUG9vbCBzcGVjaWZpYyBlcnJvcnMgc3RhcnQgYXQgMTIwMC4AAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAABoAAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAABLAAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAEsQAAAAAAAAAWSW52YWxpZFJlc2VydmVNZXRhZGF0YQAAAAAEsgAAAAAAAAAPSW5pdE5vdFVubG9ja2VkAAAABLMAAAAAAAAAEFN0YXR1c05vdEFsbG93ZWQAAAS0AAAAAAAAAAlJbnZhbGlkSGYAAAAAAAS1AAAAAAAAABFJbnZhbGlkUG9vbFN0YXR1cwAAAAAABLYAAAAAAAAAD0ludmFsaWRVdGlsUmF0ZQAAAAS3AAAAAAAAABRNYXhQb3NpdGlvbnNFeGNlZWRlZAAABLgAAAAAAAAAF0ludGVybmFsUmVzZXJ2ZU5vdEZvdW5kAAAABLkAAAAAAAAAClN0YWxlUHJpY2UAAAAABLoAAAAAAAAAEkludmFsaWRMaXF1aWRhdGlvbgAAAAAEuwAAAAAAAAARQXVjdGlvbkluUHJvZ3Jlc3MAAAAAAAS8AAAAAAAAABJJbnZhbGlkTGlxVG9vTGFyZ2UAAAAABL0AAAAAAAAAEkludmFsaWRMaXFUb29TbWFsbAAAAAAEvgAAAAAAAAAQSW50ZXJlc3RUb29TbWFsbAAABL8AAAAAAAAAF0ludmFsaWRCVG9rZW5NaW50QW1vdW50AAAABMAAAAAAAAAAF0ludmFsaWRCVG9rZW5CdXJuQW1vdW50AAAABMEAAAAAAAAAF0ludmFsaWREVG9rZW5NaW50QW1vdW50AAAABMIAAAAAAAAAF0ludmFsaWREVG9rZW5CdXJuQW1vdW50AAAABMM=',
      'AAAAAQAAADNUaGUgY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc2VydmUgYXNzZXQAAAAAAAAAAA1SZXNlcnZlQ29uZmlnAAAAAAAACwAAAAAAAAAIY19mYWN0b3IAAAAEAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAIbF9mYWN0b3IAAAAEAAAAAAAAAAhtYXhfdXRpbAAAAAQAAAAAAAAABnJfYmFzZQAAAAAABAAAAAAAAAAFcl9vbmUAAAAAAAAEAAAAAAAAAAdyX3RocmVlAAAAAAQAAAAAAAAABXJfdHdvAAAAAAAABAAAAAAAAAAKcmVhY3Rpdml0eQAAAAAABAAAAAAAAAAEdXRpbAAAAAQ=',
      'AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAADQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAACGNfZmFjdG9yAAAABAAAAAAAAAAGZF9yYXRlAAAAAAALAAAAAAAAAAhkX3N1cHBseQAAAAsAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAGaXJfbW9kAAAAAAALAAAAAAAAAAhsX2ZhY3RvcgAAAAQAAAAAAAAACWxhc3RfdGltZQAAAAAAAAYAAAAAAAAACG1heF91dGlsAAAABAAAAAAAAAAGc2NhbGFyAAAAAAAL',
      'AAAAAQAAAIFUaGUgY29uZmlndXJhdGlvbiBvZiBlbWlzc2lvbnMgZm9yIHRoZSByZXNlcnZlIGIgb3IgZCB0b2tlbgoKYEBkZXZgIElmIHRoaXMgaXMgdXBkYXRlZCwgUmVzZXJ2ZUVtaXNzaW9uc0RhdGEgTVVTVCBhbHNvIGJlIHVwZGF0ZWQAAAAAAAAAAAAAFlJlc2VydmVFbWlzc2lvbnNDb25maWcAAAAAAAIAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAG',
      'AAAAAQAAAC5UaGUgZW1pc3Npb24gZGF0YSBmb3IgdGhlIHJlc2VydmUgYiBvciBkIHRva2VuAAAAAAAAAAAAFFJlc2VydmVFbWlzc2lvbnNEYXRhAAAAAgAAAAAAAAAFaW5kZXgAAAAAAAALAAAAAAAAAAlsYXN0X3RpbWUAAAAAAAAG',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolContract.parsers,
    initialize: () => {},
    newLiquidationAuction: (result: string): AuctionData =>
      PoolContractV1.spec.funcResToNative('new_liquidation_auction', result),
    newBadDebtAuction: (result: string): AuctionData =>
      PoolContractV1.spec.funcResToNative('new_bad_debt_auction', result),
    newInterestAuction: (result: string): AuctionData =>
      PoolContractV1.spec.funcResToNative('new_interest_auction', result),
  };

  initialize(contractArgs: PoolConstructorArgs): string {
    return this.call(
      'initialize',
      ...PoolContractV1.spec.funcArgsToScVals('initialize', contractArgs)
    ).toXDR('base64');
  }

  queueSetReserve(contractArgs: SetReserveArgs): string {
    return this.call(
      'queue_set_reserve',
      ...PoolContractV1.spec.funcArgsToScVals('queue_set_reserve', contractArgs)
    ).toXDR('base64');
  }

  newLiquidationAuction(contractArgs: NewLiqudiationAuctionArgs): string {
    return this.call(
      'new_liquidation_auction',
      ...PoolContractV1.spec.funcArgsToScVals('new_liquidation_auction', contractArgs)
    ).toXDR('base64');
  }

  newBadDebtAuction(): string {
    return this.call(
      'new_bad_debt_auction',
      ...PoolContractV1.spec.funcArgsToScVals('new_bad_debt_auction', {})
    ).toXDR('base64');
  }

  newInterestAuction(assets: Array<Address | string>): string {
    return this.call(
      'new_interest_auction',
      ...PoolContractV1.spec.funcArgsToScVals('new_interest_auction', { assets })
    ).toXDR('base64');
  }
}

export class PoolContractV2 extends PoolContract {
  constructor(address: string) {
    super(address);
  }

  static readonly spec = new contract.Spec([
    ...PoolContract.spec.entries,
    ...new contract.Spec([
      'AAAAAQAAAAAAAAAAAAAAC0F1Y3Rpb25EYXRhAAAAAAMAAAEMQSBtYXAgb2YgdGhlIGFzc2V0cyBiZWluZyBiaWQgb24gYW5kIHRoZSBhbW91bnQgYmVpbmcgYmlkLiBUaGVzZSBhcmUgdG9rZW5zIHNwZW50CmJ5IHRoZSBmaWxsZXIgb2YgdGhlIGF1Y3Rpb24uCgpUaGUgYmlkIGlzIGRpZmZlcmVudCBiYXNlZCBvbiBlYWNoIGF1Y3Rpb24gdHlwZToKLSBVc2VyTGlxdWlkYXRpb246IGRUb2tlbnMKLSBCYWREZWJ0QXVjdGlvbjogZFRva2VucwotIEludGVyZXN0QXVjdGlvbjogVW5kZXJseWluZyBhc3NldHMgKGJhY2tzdG9wIHRva2VuKQAAAANiaWQAAAAD7AAAABMAAAALAAAAo1RoZSBibG9jayB0aGUgYXVjdGlvbiBiZWdpbnMgb24uIFRoaXMgaXMgdXNlZCB0byBkZXRlcm1pbmUgaG93IHRoZSBhdWN0aW9uCnNob3VsZCBiZSBzY2FsZWQgYmFzZWQgb24gdGhlIG51bWJlciBvZiBibG9ja3MgdGhhdCBoYXZlIHBhc3NlZCBzaW5jZSB0aGUgYXVjdGlvbiBiZWdhbi4AAAAABWJsb2NrAAAAAAAABAAAASZBIG1hcCBvZiB0aGUgYXNzZXRzIGJlaW5nIGF1Y3Rpb25lZCBvZmYgYW5kIHRoZSBhbW91bnQgYmVpbmcgYXVjdGlvbmVkLiBUaGVzZSBhcmUgdG9rZW5zCnJlY2VpdmVkIGJ5IHRoZSBmaWxsZXIgb2YgdGhlIGF1Y3Rpb24uCgpUaGUgbG90IGlzIGRpZmZlcmVudCBiYXNlZCBvbiBlYWNoIGF1Y3Rpb24gdHlwZToKLSBVc2VyTGlxdWlkYXRpb246IGJUb2tlbnMKLSBCYWREZWJ0QXVjdGlvbjogVW5kZXJseWluZyBhc3NldHMgKGJhY2tzdG9wIHRva2VuKQotIEludGVyZXN0QXVjdGlvbjogVW5kZXJseWluZyBhc3NldHMAAAAAAANsb3QAAAAD7AAAABMAAAAL',
      'AAAAAAAAAcxJbml0aWFsaXplIHRoZSBwb29sCgojIyMgQXJndW1lbnRzCkNyZWF0b3Igc3VwcGxpZWQ6CiogYGFkbWluYCAtIFRoZSBBZGRyZXNzIGZvciB0aGUgYWRtaW4KKiBgbmFtZWAgLSBUaGUgbmFtZSBvZiB0aGUgcG9vbAoqIGBvcmFjbGVgIC0gVGhlIGNvbnRyYWN0IGFkZHJlc3Mgb2YgdGhlIG9yYWNsZQoqIGBiYWNrc3RvcF90YWtlX3JhdGVgIC0gVGhlIHRha2UgcmF0ZSBmb3IgdGhlIGJhY2tzdG9wICg3IGRlY2ltYWxzKQoqIGBtYXhfcG9zaXRpb25zYCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBwb3NpdGlvbnMgYSB1c2VyIGlzIHBlcm1pdHRlZCB0byBoYXZlCgpQb29sIEZhY3Rvcnkgc3VwcGxpZWQ6CiogYGJhY2tzdG9wX2lkYCAtIFRoZSBjb250cmFjdCBhZGRyZXNzIG9mIHRoZSBwb29sJ3MgYmFja3N0b3AgbW9kdWxlCiogYGJsbmRfaWRgIC0gVGhlIGNvbnRyYWN0IElEIG9mIHRoZSBCTE5EIHRva2VuAAAADV9fY29uc3RydWN0b3IAAAAAAAAHAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAACmJzdG9wX3JhdGUAAAAAAAQAAAAAAAAADW1heF9wb3NpdGlvbnMAAAAAAAAEAAAAAAAAAAtiYWNrc3RvcF9pZAAAAAATAAAAAAAAAAdibG5kX2lkAAAAABMAAAAA',
      'AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAAClBvb2xDb25maWcAAA==',
      'AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT',
      'AAAAAAAAAAAAAAALZ2V0X3Jlc2VydmUAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAQAAB9AAAAAHUmVzZXJ2ZQA=',
      'AAAAAAAAAAAAAAAKZ2V0X21hcmtldAAAAAAAAAAAAAEAAAPtAAAAAgAAB9AAAAAKUG9vbENvbmZpZwAAAAAD6gAAB9AAAAAHUmVzZXJ2ZQA=',
      'AAAAAAAAAAAAAAAVc3VibWl0X3dpdGhfYWxsb3dhbmNlAAAAAAAABAAAAAAAAAAEZnJvbQAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAACHJlcXVlc3RzAAAD6gAAB9AAAAAHUmVxdWVzdAAAAAABAAAH0AAAAAlQb3NpdGlvbnMAAAA=',
      'AAAAAAAAAAAAAAAKZmxhc2hfbG9hbgAAAAAAAwAAAAAAAAAEZnJvbQAAABMAAAAAAAAACmZsYXNoX2xvYW4AAAAAB9AAAAAJRmxhc2hMb2FuAAAAAAAAAAAAAAhyZXF1ZXN0cwAAA+oAAAfQAAAAB1JlcXVlc3QAAAAAAQAAB9AAAAAJUG9zaXRpb25zAAAA',
      'AAAAAAAAAAAAAAAEZ3VscAAAAAEAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAEAAAAL',
      'AAAAAAAAAAAAAAAVZ2V0X3Jlc2VydmVfZW1pc3Npb25zAAAAAAAAAQAAAAAAAAATcmVzZXJ2ZV90b2tlbl9pbmRleAAAAAAEAAAAAQAAA+gAAAfQAAAAE1Jlc2VydmVFbWlzc2lvbkRhdGEA',
      'AAAAAAAAAAAAAAASZ2V0X3VzZXJfZW1pc3Npb25zAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAATcmVzZXJ2ZV90b2tlbl9pbmRleAAAAAAEAAAAAQAAA+gAAAfQAAAAEFVzZXJFbWlzc2lvbkRhdGE=',
      'AAAAAAAAAAAAAAALbmV3X2F1Y3Rpb24AAAAABQAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAAA2JpZAAAAAPqAAAAEwAAAAAAAAADbG90AAAAA+oAAAATAAAAAAAAAAdwZXJjZW50AAAAAAQAAAABAAAH0AAAAAtBdWN0aW9uRGF0YQA=',
      'AAAAAQAAAAAAAAAAAAAACUZsYXNoTG9hbgAAAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAhjb250cmFjdAAAABM=',
      'AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAABAAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZjb25maWcAAAAAB9AAAAANUmVzZXJ2ZUNvbmZpZwAAAAAAAAAAAAAEZGF0YQAAB9AAAAALUmVzZXJ2ZURhdGEAAAAAAAAAAAZzY2FsYXIAAAAAAAs=',
      'AAAABAAAAJlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgY29udHJhY3QuIENvbW1vbiBlcnJvcnMgYXJlIGNvZGVzIHRoYXQgbWF0Y2ggdXAgd2l0aCB0aGUgYnVpbHQtaW4KY29udHJhY3RzIGVycm9yIHJlcG9ydGluZy4gUG9vbCBzcGVjaWZpYyBlcnJvcnMgc3RhcnQgYXQgMTIwMC4AAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAAB4AAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAABLAAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAEsQAAAAAAAAAWSW52YWxpZFJlc2VydmVNZXRhZGF0YQAAAAAEsgAAAAAAAAAPSW5pdE5vdFVubG9ja2VkAAAABLMAAAAAAAAAEFN0YXR1c05vdEFsbG93ZWQAAAS0AAAAAAAAAAlJbnZhbGlkSGYAAAAAAAS1AAAAAAAAABFJbnZhbGlkUG9vbFN0YXR1cwAAAAAABLYAAAAAAAAAD0ludmFsaWRVdGlsUmF0ZQAAAAS3AAAAAAAAABRNYXhQb3NpdGlvbnNFeGNlZWRlZAAABLgAAAAAAAAAF0ludGVybmFsUmVzZXJ2ZU5vdEZvdW5kAAAABLkAAAAAAAAAClN0YWxlUHJpY2UAAAAABLoAAAAAAAAAEkludmFsaWRMaXF1aWRhdGlvbgAAAAAEuwAAAAAAAAARQXVjdGlvbkluUHJvZ3Jlc3MAAAAAAAS8AAAAAAAAABJJbnZhbGlkTGlxVG9vTGFyZ2UAAAAABL0AAAAAAAAAEkludmFsaWRMaXFUb29TbWFsbAAAAAAEvgAAAAAAAAAQSW50ZXJlc3RUb29TbWFsbAAABL8AAAAAAAAAF0ludmFsaWRCVG9rZW5NaW50QW1vdW50AAAABMAAAAAAAAAAF0ludmFsaWRCVG9rZW5CdXJuQW1vdW50AAAABMEAAAAAAAAAF0ludmFsaWREVG9rZW5NaW50QW1vdW50AAAABMIAAAAAAAAAF0ludmFsaWREVG9rZW5CdXJuQW1vdW50AAAABMMAAAAAAAAAFUV4Y2VlZGVkQ29sbGF0ZXJhbENhcAAAAAAABMQAAAAAAAAACkludmFsaWRCaWQAAAAABMUAAAAAAAAACkludmFsaWRMb3QAAAAABMYAAAAAAAAAD1Jlc2VydmVEaXNhYmxlZAAAAATH',
      'AAAAAQAAADNUaGUgY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc2VydmUgYXNzZXQAAAAAAAAAAA1SZXNlcnZlQ29uZmlnAAAAAAAADQAAAAAAAAAIY19mYWN0b3IAAAAEAAAAAAAAAA5jb2xsYXRlcmFsX2NhcAAAAAAACwAAAAAAAAAIZGVjaW1hbHMAAAAEAAAAAAAAAAdlbmFibGVkAAAAAAEAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAIbF9mYWN0b3IAAAAEAAAAAAAAAAhtYXhfdXRpbAAAAAQAAAAAAAAABnJfYmFzZQAAAAAABAAAAAAAAAAFcl9vbmUAAAAAAAAEAAAAAAAAAAdyX3RocmVlAAAAAAQAAAAAAAAABXJfdHdvAAAAAAAABAAAAAAAAAAKcmVhY3Rpdml0eQAAAAAABAAAAAAAAAAEdXRpbAAAAAQ=',
      'AAAAAQAAAC5UaGUgZW1pc3Npb24gZGF0YSBmb3IgdGhlIHJlc2VydmUgYiBvciBkIHRva2VuAAAAAAAAAAAAE1Jlc2VydmVFbWlzc2lvbkRhdGEAAAAABAAAAAAAAAADZXBzAAAAAAYAAAAAAAAACmV4cGlyYXRpb24AAAAAAAYAAAAAAAAABWluZGV4AAAAAAAACwAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolContract.parsers,
    deploy: (result: string): string => scValToNative(xdr.ScVal.fromXDR(result, 'base64')),
    submitWithAllowance: (result: string): Positions => Positions.fromScVal(result),
    flashLoan: (result: string): Positions => Positions.fromScVal(result),
    gulp: (result: string): i128 => PoolContract.spec.funcResToNative('gulp', result),
    newAuction: (result: string): AuctionData => AuctionData.fromScVal(result),
    getConfig: (result: string): PoolConfig => PoolConfig.fromScVal(result),
    getAdmin: (result: string): string => PoolContract.spec.funcResToNative('get_admin', result),
    getReserve: (result: string): ContractReserve => ContractReserve.fromScVal(result),
    getMarket: (result: string): Market => Market.fromScVal(result),
    getReserveEmissions: (result: string): EmissionDataV2 | undefined =>
      PoolContractV2.spec.funcResToNative('get_reserve_emissions', result),
    getUserEmissions: (result: string): UserEmissions | undefined =>
      PoolContractV2.spec.funcResToNative('get_user_emissions', result),
  };

  static deploy(
    deployer: string,
    wasmHash: Buffer | string,
    args: PoolConstructorArgs,
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
      constructorArgs: this.spec.funcArgsToScVals('__constructor', args),
    }).toXDR('base64');
  }

  queueSetReserve(contractArgs: SetReserveArgs): string {
    return this.call(
      'queue_set_reserve',
      ...PoolContractV2.spec.funcArgsToScVals('queue_set_reserve', contractArgs)
    ).toXDR('base64');
  }

  submitWithAllowance(contractArgs: SubmitArgs): string {
    return this.call(
      'submit_with_allowance',
      ...PoolContractV2.spec.funcArgsToScVals('submit_with_allowance', contractArgs)
    ).toXDR('base64');
  }

  flashLoan(contractArgs: FlashLoanArgs): string {
    return this.call(
      'flash_loan',
      ...PoolContractV2.spec.funcArgsToScVals('flash_loan', contractArgs)
    ).toXDR('base64');
  }

  gulp(asset: string): string {
    return this.call('gulp', ...PoolContractV2.spec.funcArgsToScVals('gulp', { asset })).toXDR(
      'base64'
    );
  }

  newAuction(contractArgs: NewAuctionArgs): string {
    return this.call(
      'new_auction',
      ...PoolContractV2.spec.funcArgsToScVals('new_auction', contractArgs)
    ).toXDR('base64');
  }

  getConfig(): string {
    return this.call('get_config', ...PoolContractV2.spec.funcArgsToScVals('get_config', {})).toXDR(
      'base64'
    );
  }

  getAdmin(): string {
    return this.call('get_admin', ...PoolContractV2.spec.funcArgsToScVals('get_admin', {})).toXDR(
      'base64'
    );
  }

  getReserve(asset: Address | string): string {
    return this.call(
      'get_reserve',
      ...PoolContractV2.spec.funcArgsToScVals('get_reserve', { asset })
    ).toXDR('base64');
  }

  getReserveEmissions(reserve_token_id: number): string {
    return this.call(
      'get_reserve_emissions',
      ...PoolContractV2.spec.funcArgsToScVals('get_reserve_emissions', { reserve_token_id })
    ).toXDR('base64');
  }

  getUserEmissions(user: Address | string, reserve_token_id: number): string {
    return this.call(
      'get_user_emissions',
      ...PoolContractV2.spec.funcArgsToScVals('get_user_emissions', { user, reserve_token_id })
    ).toXDR('base64');
  }

  getMarket(): string {
    return this.call('get_market', ...PoolContractV2.spec.funcArgsToScVals('get_market', {})).toXDR(
      'base64'
    );
  }
}
