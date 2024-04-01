import { Address, Contract, ContractSpec } from '@stellar/stellar-sdk';
import { i128 } from '../index.js';
import { PoolBackstopData, Q4W, UserBalance } from './index.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface BackstopInitializeArgs {
  backstop_token: Address | string;
  emitter: Address | string;
  usdc_token: Address | string;
  blnd_token: Address | string;
  pool_factory: Address | string;
  drop_list: Map<Address | string, i128>;
}

export interface PoolBackstopActionArgs {
  from: Address | string;
  pool_address: Address | string;
  amount: i128;
}

export interface AddRewardArgs {
  to_add: Address | string;
  to_remove: Address | string;
}

export interface BackstopClaimArgs {
  from: Address | string;
  pool_addresses: Array<Address | string>;
  to: Address | string;
}

export interface DrawArgs {
  to: Address | string;
  pool_address: Address | string;
  amount: i128;
}

export class BackstopContract extends Contract {
  // @dev: Generated from soroban-cli Typescript bindings
  static spec: ContractSpec = new ContractSpec([
    'AAAAAQAAABhUaGUgcG9vbCdzIGJhY2tzdG9wIGRhdGEAAAAAAAAAEFBvb2xCYWNrc3RvcERhdGEAAAAEAAAAAAAAAARibG5kAAAACwAAAAAAAAAHcTR3X3BjdAAAAAALAAAAAAAAAAZ0b2tlbnMAAAAAAAsAAAAAAAAABHVzZGMAAAAL',
    'AAAAAQAAABxUaGUgcG9vbCdzIGJhY2tzdG9wIGJhbGFuY2VzAAAAAAAAAAtQb29sQmFsYW5jZQAAAAADAAAAAAAAAANxNHcAAAAACwAAAAAAAAAGc2hhcmVzAAAAAAALAAAAAAAAAAZ0b2tlbnMAAAAAAAs=',
    'AAAAAQAAACdBIGRlcG9zaXQgdGhhdCBpcyBxdWV1ZWQgZm9yIHdpdGhkcmF3YWwAAAAAAAAAAANRNFcAAAAAAgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAANleHAAAAAABg==',
    'AAAAAQAAACdBIGRlcG9zaXQgdGhhdCBpcyBxdWV1ZWQgZm9yIHdpdGhkcmF3YWwAAAAAAAAAAAtVc2VyQmFsYW5jZQAAAAACAAAAAAAAAANxNHcAAAAD6gAAB9AAAAADUTRXAAAAAAAAAAAGc2hhcmVzAAAAAAAL',
    'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABgAAAAAAAAAOYmFja3N0b3BfdG9rZW4AAAAAABMAAAAAAAAAB2VtaXR0ZXIAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAAAAAAKYmxuZF90b2tlbgAAAAAAEwAAAAAAAAAMcG9vbF9mYWN0b3J5AAAAEwAAAAAAAAAJZHJvcF9saXN0AAAAAAAD7AAAABMAAAALAAAAAA==',
    'AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAAAs=',
    'AAAAAAAAAAAAAAAQcXVldWVfd2l0aGRyYXdhbAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAH0AAAAANRNFcA',
    'AAAAAAAAAAAAAAASZGVxdWV1ZV93aXRoZHJhd2FsAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==',
    'AAAAAAAAAAAAAAAId2l0aGRyYXcAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAAAs=',
    'AAAAAAAAAAAAAAAMdXNlcl9iYWxhbmNlAAAAAgAAAAAAAAAEcG9vbAAAABMAAAAAAAAABHVzZXIAAAATAAAAAQAAB9AAAAALVXNlckJhbGFuY2UA',
    'AAAAAAAAAAAAAAAJcG9vbF9kYXRhAAAAAAAAAQAAAAAAAAAEcG9vbAAAABMAAAABAAAH0AAAABBQb29sQmFja3N0b3BEYXRh',
    'AAAAAAAAAAAAAAAOYmFja3N0b3BfdG9rZW4AAAAAAAAAAAABAAAAEw==',
    'AAAAAAAAAAAAAAAOZ3VscF9lbWlzc2lvbnMAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAKYWRkX3Jld2FyZAAAAAAAAgAAAAAAAAAGdG9fYWRkAAAAAAATAAAAAAAAAAl0b19yZW1vdmUAAAAAAAATAAAAAA==',
    'AAAAAAAAAAAAAAATZ3VscF9wb29sX2VtaXNzaW9ucwAAAAABAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAQAAAAs=',
    'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAOcG9vbF9hZGRyZXNzZXMAAAAAA+oAAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAEAAAAL',
    'AAAAAAAAAAAAAAAEZHJvcAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAEZHJhdwAAAAMAAAAAAAAADHBvb2xfYWRkcmVzcwAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAACdG8AAAAAABMAAAAA',
    'AAAAAAAAAAAAAAAGZG9uYXRlAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==',
    'AAAAAAAAAAAAAAAOdXBkYXRlX3Rrbl92YWwAAAAAAAAAAAABAAAD7QAAAAIAAAALAAAACw==',
    'AAAABAAAAKFFcnJvciBjb2RlcyBmb3IgdGhlIGJhY2tzdG9wIGNvbnRyYWN0LiBDb21tb24gZXJyb3JzIGFyZSBjb2RlcyB0aGF0IG1hdGNoIHVwIHdpdGggdGhlIGJ1aWx0LWluCmNvbnRyYWN0cyBlcnJvciByZXBvcnRpbmcuIEJhY2tzdG9wIHNwZWNpZmljIGVycm9ycyBzdGFydCBhdCAxMDAwLgAAAAAAAAAAAAANQmFja3N0b3BFcnJvcgAAAAAAAA4AAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAAA+gAAAAAAAAACk5vdEV4cGlyZWQAAAAAA+kAAAAAAAAAFkludmFsaWRSZXdhcmRab25lRW50cnkAAAAAA+oAAAAAAAAAEUluc3VmZmljaWVudEZ1bmRzAAAAAAAD6wAAAAAAAAAHTm90UG9vbAAAAAPsAAAAAAAAABZJbnZhbGlkU2hhcmVNaW50QW1vdW50AAAAAAPtAAAAAAAAABpJbnZhbGlkVG9rZW5XaXRoZHJhd0Ftb3VudAAAAAAD7gAAAAAAAAARVG9vTWFueVE0V0VudHJpZXMAAAAAAAPv',
    'AAAAAQAAAAAAAAAAAAAAFkJhY2tzdG9wRW1pc3Npb25Db25maWcAAAAAAAIAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAG',
    'AAAAAQAAAAAAAAAAAAAAFUJhY2tzdG9wRW1pc3Npb25zRGF0YQAAAAAAAAIAAAAAAAAABWluZGV4AAAAAAAACwAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
    'AAAAAQAAADNUaGUgdXNlciBlbWlzc2lvbiBkYXRhIGZvciB0aGUgcmVzZXJ2ZSBiIG9yIGQgdG9rZW4AAAAAAAAAABBVc2VyRW1pc3Npb25EYXRhAAAAAgAAAAAAAAAHYWNjcnVlZAAAAAALAAAAAAAAAAVpbmRleAAAAAAAAAs=',
    'AAAAAQAAAAAAAAAAAAAAC1Bvb2xVc2VyS2V5AAAAAAIAAAAAAAAABHBvb2wAAAATAAAAAAAAAAR1c2VyAAAAEw==',
    'AAAAAgAAAAAAAAAAAAAAD0JhY2tzdG9wRGF0YUtleQAAAAAHAAAAAQAAAAAAAAALVXNlckJhbGFuY2UAAAAAAQAAB9AAAAALUG9vbFVzZXJLZXkAAAAAAQAAAAAAAAALUG9vbEJhbGFuY2UAAAAAAQAAABMAAAABAAAAAAAAAAhQb29sVVNEQwAAAAEAAAATAAAAAQAAAAAAAAAIUG9vbEVtaXMAAAABAAAAEwAAAAEAAAAAAAAACEJFbWlzQ2ZnAAAAAQAAABMAAAABAAAAAAAAAAlCRW1pc0RhdGEAAAAAAAABAAAAEwAAAAEAAAAAAAAACVVFbWlzRGF0YQAAAAAAAAEAAAfQAAAAC1Bvb2xVc2VyS2V5AA==',
  ]);

  static readonly parsers = {
    initialize: () => {},
    deposit: (result: string): i128 => BackstopContract.spec.funcResToNative('deposit', result),
    queueWithdrawal: (result: string): Q4W =>
      BackstopContract.spec.funcResToNative('queue_withdrawal', result),
    dequeueWithdrawal: () => {},
    withdraw: (result: string): i128 => BackstopContract.spec.funcResToNative('withdraw', result),
    userBalance: (result: string): UserBalance =>
      BackstopContract.spec.funcResToNative('user_balance', result),
    poolData: (result: string): PoolBackstopData =>
      BackstopContract.spec.funcResToNative('pool_data', result),
    backstopToken: (result: string): string =>
      BackstopContract.spec.funcResToNative('backstop_token', result),
    gulpEmissions: () => {},
    addReward: () => {},
    gulpPoolEmissions: (result: string): i128 =>
      BackstopContract.spec.funcResToNative('gulp_pool_emissions', result),
    claim: (result: string): i128 => BackstopContract.spec.funcResToNative('claim', result),
    drop: () => {},
    draw: () => {},
    donate: () => {},
    updateTknVal: (result: string): [i128, i128] =>
      BackstopContract.spec.funcResToNative('update_tkn_val', result),
  };

  initialize(contractArgs: BackstopInitializeArgs): string {
    return this.call(
      'initialize',
      ...BackstopContract.spec.funcArgsToScVals('initialize', contractArgs)
    ).toXDR('base64');
  }

  deposit(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'deposit',
      ...BackstopContract.spec.funcArgsToScVals('deposit', contractArgs)
    ).toXDR('base64');
  }

  queueWithdrawal(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'queue_withdrawal',
      ...BackstopContract.spec.funcArgsToScVals('queue_withdrawal', contractArgs)
    ).toXDR('base64');
  }

  dequeueWithdrawal(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'dequeue_withdrawal',
      ...BackstopContract.spec.funcArgsToScVals('dequeue_withdrawal', contractArgs)
    ).toXDR('base64');
  }

  withdraw(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'withdraw',
      ...BackstopContract.spec.funcArgsToScVals('withdraw', contractArgs)
    ).toXDR('base64');
  }

  gulpEmissions(): string {
    return this.call(
      'gulp_emissions',
      ...BackstopContract.spec.funcArgsToScVals('gulp_emissions', {})
    ).toXDR('base64');
  }

  addReward(contractArgs: AddRewardArgs): string {
    return this.call(
      'add_reward',
      ...BackstopContract.spec.funcArgsToScVals('add_reward', contractArgs)
    ).toXDR('base64');
  }

  claim(contractArgs: BackstopClaimArgs): string {
    return this.call(
      'claim',
      ...BackstopContract.spec.funcArgsToScVals('claim', contractArgs)
    ).toXDR('base64');
  }

  draw(contractArgs: DrawArgs): string {
    return this.call('draw', ...BackstopContract.spec.funcArgsToScVals('draw', contractArgs)).toXDR(
      'base64'
    );
  }

  donate(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'donate',
      ...BackstopContract.spec.funcArgsToScVals('donate', contractArgs)
    ).toXDR('base64');
  }

  donateUSDC(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'donate_usdc',
      ...BackstopContract.spec.funcArgsToScVals('donate_usdc', contractArgs)
    ).toXDR('base64');
  }

  gulpUSDC(pool_address: Address | string): string {
    return this.call(
      'gulp_usdc',
      ...BackstopContract.spec.funcArgsToScVals('gulp_usdc', { pool_address })
    ).toXDR('base64');
  }

  updateTokenValue(): string {
    return this.call(
      'update_tkn_val',
      ...BackstopContract.spec.funcArgsToScVals('update_tkn_val', {})
    ).toXDR('base64');
  }

  drop(): string {
    return this.call('drop', ...BackstopContract.spec.funcArgsToScVals('drop', {})).toXDR('base64');
  }
}
