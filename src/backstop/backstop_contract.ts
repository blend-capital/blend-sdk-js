import { Address, Contract, contract, Operation, scValToNative, xdr } from '@stellar/stellar-sdk';
import { i128, PoolBackstopDataV2 } from '../index.js';
import { PoolBackstopDataV1, Q4W, UserBalance } from './index.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface BackstopConstructorArgs {
  backstop_token: Address | string;
  emitter: Address | string;
  usdc_token: Address | string;
  blnd_token: Address | string;
  pool_factory: Address | string;
  drop_list: Array<readonly [string, i128]>;
}

export interface PoolBackstopActionArgs {
  from: Address | string;
  pool_address: Address | string;
  amount: i128;
}

export interface BackstopClaimV1Args {
  from: Address | string;
  pool_addresses: Array<Address | string>;
  to: Address | string;
}

export interface BackstopClaimV2Args {
  from: Address | string;
  pool_addresses: Array<Address | string>;
  min_lp_tokens_out: i128; // Minimum amount of LP tokens to receive from the claim
}

export interface DrawArgs {
  to: Address | string;
  pool_address: Address | string;
  amount: i128;
}

export abstract class BackstopContract extends Contract {
  // @dev: Generated from soroban-cli Typescript bindings
  static spec: contract.Spec = new contract.Spec([
    // Struct PoolBalance
    'AAAAAQAAABxUaGUgcG9vbCdzIGJhY2tzdG9wIGJhbGFuY2VzAAAAAAAAAAtQb29sQmFsYW5jZQAAAAADAAAAAAAAAANxNHcAAAAACwAAAAAAAAAGc2hhcmVzAAAAAAALAAAAAAAAAAZ0b2tlbnMAAAAAAAs=',
    // Struct Q4W
    'AAAAAQAAACdBIGRlcG9zaXQgdGhhdCBpcyBxdWV1ZWQgZm9yIHdpdGhkcmF3YWwAAAAAAAAAAANRNFcAAAAAAgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAANleHAAAAAABg==',
    // Struct UserBalance
    'AAAAAQAAACdBIGRlcG9zaXQgdGhhdCBpcyBxdWV1ZWQgZm9yIHdpdGhkcmF3YWwAAAAAAAAAAAtVc2VyQmFsYW5jZQAAAAACAAAAAAAAAANxNHcAAAAD6gAAB9AAAAADUTRXAAAAAAAAAAAGc2hhcmVzAAAAAAAL',
    // Function deposit
    'AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAAAs=',
    // Function queue_withdrawal
    'AAAAAAAAAAAAAAAQcXVldWVfd2l0aGRyYXdhbAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAH0AAAAANRNFcA',
    // Function dequeue_withdrawal
    'AAAAAAAAAAAAAAASZGVxdWV1ZV93aXRoZHJhd2FsAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==',
    // Function withdraw
    'AAAAAAAAAAAAAAAId2l0aGRyYXcAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAAAs=',
    // Function user_balance
    'AAAAAAAAAAAAAAAMdXNlcl9iYWxhbmNlAAAAAgAAAAAAAAAEcG9vbAAAABMAAAAAAAAABHVzZXIAAAATAAAAAQAAB9AAAAALVXNlckJhbGFuY2UA',
    // Function pool_data
    'AAAAAAAAAAAAAAAJcG9vbF9kYXRhAAAAAAAAAQAAAAAAAAAEcG9vbAAAABMAAAABAAAH0AAAABBQb29sQmFja3N0b3BEYXRh',
    // Function backstop_token
    'AAAAAAAAAAAAAAAOYmFja3N0b3BfdG9rZW4AAAAAAAAAAAABAAAAEw==',
    // Function drop
    'AAAAAAAAAAAAAAAEZHJvcAAAAAAAAAAA',
    // Function draw
    'AAAAAAAAAAAAAAAEZHJhdwAAAAMAAAAAAAAADHBvb2xfYWRkcmVzcwAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAACdG8AAAAAABMAAAAA',
    // Function donate
    'AAAAAAAAAAAAAAAGZG9uYXRlAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==',
    // Struct UserEmissionData
    'AAAAAQAAAC1UaGUgdXNlciBlbWlzc2lvbiBkYXRhIHBvb2wncyBiYWNrc3RvcCB0b2tlbnMAAAAAAAAAAAAAEFVzZXJFbWlzc2lvbkRhdGEAAAACAAAAAAAAAAdhY2NydWVkAAAAAAsAAAAAAAAABWluZGV4AAAAAAAACw==',
    // Struct PoolUserKey
    'AAAAAQAAAAAAAAAAAAAAC1Bvb2xVc2VyS2V5AAAAAAIAAAAAAAAABHBvb2wAAAATAAAAAAAAAAR1c2VyAAAAEw==',
  ]);

  static readonly parsers = {
    deposit: (result: string): i128 => BackstopContract.spec.funcResToNative('deposit', result),
    queueWithdrawal: (result: string): Q4W =>
      BackstopContract.spec.funcResToNative('queue_withdrawal', result),
    dequeueWithdrawal: () => {},
    withdraw: (result: string): i128 => BackstopContract.spec.funcResToNative('withdraw', result),
    userBalance: (result: string): UserBalance =>
      BackstopContract.spec.funcResToNative('user_balance', result),
    backstopToken: (result: string): string =>
      BackstopContract.spec.funcResToNative('backstop_token', result),
    addReward: () => {},
    claim: (result: string): i128 => BackstopContract.spec.funcResToNative('claim', result),
    drop: () => {},
    draw: () => {},
    donate: () => {},
  };

  /**
   * Deposits backstop tokens from an address into the backstop of a pool.
   *
   * @param contractArgs - The arguments required for the deposit.
   * @param contractArgs.from - The address depositing into the backstop.
   * @param contractArgs.pool_address - The address of the pool.
   * @param contractArgs.amount - The amount of tokens to deposit.
   *
   * @returns A base64-encoded string representing the operation that must be submitted in a transaction.
   */
  deposit(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'deposit',
      ...BackstopContract.spec.funcArgsToScVals('deposit', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Queues deposited pool shares for withdrawal from a backstop of a pool.
   *
   * @param contractArgs - The arguments required for queuing a withdrawal.
   * @param contractArgs.from - The address whose deposits are being queued for withdrawal.
   * @param contractArgs.pool_address - The address of the pool.
   * @param contractArgs.amount - The amount of shares to queue for withdrawal.
   *
   * @returns A base64-encoded string representing the operation.
   */
  queueWithdrawal(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'queue_withdrawal',
      ...BackstopContract.spec.funcArgsToScVals('queue_withdrawal', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Dequeues a currently queued pool share withdrawal from the backstop of a pool.
   *
   * @param contractArgs - The arguments required for dequeuing a withdrawal.
   * @param contractArgs.from - The address whose deposits are being dequeued.
   * @param contractArgs.pool_address - The address of the pool.
   * @param contractArgs.amount - The amount of shares to dequeue.
   *
   * @returns A base64-encoded string representing the operation.
   */
  dequeueWithdrawal(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'dequeue_withdrawal',
      ...BackstopContract.spec.funcArgsToScVals('dequeue_withdrawal', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Withdraws shares from a user's withdraw queue for a backstop of a pool.
   *
   * @param contractArgs - The arguments required for withdrawing shares.
   * @param contractArgs.from - The address whose shares are being withdrawn.
   * @param contractArgs.pool_address - The address of the pool.
   * @param contractArgs.amount - The amount of shares to withdraw.
   *
   * @returns A base64-encoded string representing the operation.
   */
  withdraw(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'withdraw',
      ...BackstopContract.spec.funcArgsToScVals('withdraw', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Sends backstop tokens from an address to a pool's backstop. Can only be called by the pool.
   * Note: This is not a deposit, and the sender will permanently lose access to the funds.
   *
   * @param contractArgs - The arguments required for donating to the backstop.
   * @param contractArgs.from - The address donating tokens to the backstop.
   * @param contractArgs.pool_address - The address of the pool.
   * @param contractArgs.amount - The amount of tokens to donate.
   *
   * @throws Will throw an error if the pool_address is not valid or if the pool does not authorize the call.
   *
   * @returns A base64-encoded string representing the operation.
   */
  donate(contractArgs: PoolBackstopActionArgs): string {
    return this.call(
      'donate',
      ...BackstopContract.spec.funcArgsToScVals('donate', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Consumes accumulated USDC for a pool's backstop.
   *
   * @param pool_address - The address of the pool.
   *
   * @returns A base64-encoded string representing the operation.
   */
  gulpUSDC(pool_address: Address | string): string {
    return this.call(
      'gulp_usdc',
      ...BackstopContract.spec.funcArgsToScVals('gulp_usdc', { pool_address })
    ).toXDR('base64');
  }

  /**
   * Drops initial BLND to a list of addresses through the emitter.
   *
   * @returns A base64-encoded string representing the operation.
   */
  drop(): string {
    return this.call('drop', ...BackstopContract.spec.funcArgsToScVals('drop', {})).toXDR('base64');
  }

  /**
   * Fetches the balance of backstop shares of a pool for a user.
   *
   * @param pool - The address of the pool.
   * @param user - The user to fetch the balance for.
   *
   * @returns A base64-encoded string representing the operation.
   */
  userBalance(pool: Address | string, user: Address | string): string {
    return this.call(
      'user_balance',
      ...BackstopContract.spec.funcArgsToScVals('user_balance', { pool, user })
    ).toXDR('base64');
  }

  /**
   * Fetches the backstop token for the backstop.
   *
   * @returns A base64-encoded string representing the operation.
   */
  backstopToken(): string {
    return this.call(
      'backstop_token',
      ...BackstopContract.spec.funcArgsToScVals('backstop_token', {})
    ).toXDR('base64');
  }
}

export class BackstopContractV1 extends BackstopContract {
  constructor(address: string) {
    super(address);
  }
  static readonly spec = new contract.Spec([
    ...BackstopContract.spec.entries,
    ...new contract.Spec([
      // Function initialize
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABgAAAAAAAAAOYmFja3N0b3BfdG9rZW4AAAAAABMAAAAAAAAAB2VtaXR0ZXIAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAAAAAAKYmxuZF90b2tlbgAAAAAAEwAAAAAAAAAMcG9vbF9mYWN0b3J5AAAAEwAAAAAAAAAJZHJvcF9saXN0AAAAAAAD6gAAA+0AAAACAAAAEwAAAAsAAAAA',
      // Function gulp_emissions
      'AAAAAAAAAAAAAAAOZ3VscF9lbWlzc2lvbnMAAAAAAAAAAAAA',
      // Function add_reward
      'AAAAAAAAAAAAAAAKYWRkX3Jld2FyZAAAAAAAAgAAAAAAAAAGdG9fYWRkAAAAAAATAAAAAAAAAAl0b19yZW1vdmUAAAAAAAATAAAAAA==',
      // Function gulp_pool_emissions
      'AAAAAAAAAAAAAAATZ3VscF9wb29sX2VtaXNzaW9ucwAAAAABAAAAAAAAAAxwb29sX2FkZHJlc3MAAAATAAAAAQAAAAs=',
      // Function update_tkn_val
      'AAAAAAAAAAAAAAAOdXBkYXRlX3Rrbl92YWwAAAAAAAAAAAABAAAD7QAAAAIAAAALAAAACw==',
      // Function claim
      'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAOcG9vbF9hZGRyZXNzZXMAAAAAA+oAAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAEAAAAL',
      // Struct PoolBackstopData
      'AAAAAQAAABhUaGUgcG9vbCdzIGJhY2tzdG9wIGRhdGEAAAAAAAAAEFBvb2xCYWNrc3RvcERhdGEAAAAEAAAAAAAAAARibG5kAAAACwAAAAAAAAAHcTR3X3BjdAAAAAALAAAAAAAAAAZ0b2tlbnMAAAAAAAsAAAAAAAAABHVzZGMAAAAL',
      // Struct BackstopEmissionConfig
      'AAAAAQAAAAAAAAAAAAAAFkJhY2tzdG9wRW1pc3Npb25Db25maWcAAAAAAAIAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAG',
      // Struct BackstopEmissionData
      'AAAAAQAAAAAAAAAAAAAAFUJhY2tzdG9wRW1pc3Npb25zRGF0YQAAAAAAAAIAAAAAAAAABWluZGV4AAAAAAAACwAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
      // Enum BackstopError
      'AAAABAAAAKFFcnJvciBjb2RlcyBmb3IgdGhlIGJhY2tzdG9wIGNvbnRyYWN0LiBDb21tb24gZXJyb3JzIGFyZSBjb2RlcyB0aGF0IG1hdGNoIHVwIHdpdGggdGhlIGJ1aWx0LWluCmNvbnRyYWN0cyBlcnJvciByZXBvcnRpbmcuIEJhY2tzdG9wIHNwZWNpZmljIGVycm9ycyBzdGFydCBhdCAxMDAwLgAAAAAAAAAAAAANQmFja3N0b3BFcnJvcgAAAAAAAA4AAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAAA+gAAAAAAAAACk5vdEV4cGlyZWQAAAAAA+kAAAAAAAAAFkludmFsaWRSZXdhcmRab25lRW50cnkAAAAAA+oAAAAAAAAAEUluc3VmZmljaWVudEZ1bmRzAAAAAAAD6wAAAAAAAAAHTm90UG9vbAAAAAPsAAAAAAAAABZJbnZhbGlkU2hhcmVNaW50QW1vdW50AAAAAAPtAAAAAAAAABpJbnZhbGlkVG9rZW5XaXRoZHJhd0Ftb3VudAAAAAAD7gAAAAAAAAARVG9vTWFueVE0V0VudHJpZXMAAAAAAAPv',
      // Union BackstopDataKey
      'AAAAAgAAAAAAAAAAAAAAD0JhY2tzdG9wRGF0YUtleQAAAAAHAAAAAQAAAAAAAAALVXNlckJhbGFuY2UAAAAAAQAAB9AAAAALUG9vbFVzZXJLZXkAAAAAAQAAAAAAAAALUG9vbEJhbGFuY2UAAAAAAQAAABMAAAABAAAAAAAAAAhQb29sVVNEQwAAAAEAAAATAAAAAQAAAAAAAAAIUG9vbEVtaXMAAAABAAAAEwAAAAEAAAAAAAAACEJFbWlzQ2ZnAAAAAQAAABMAAAABAAAAAAAAAAlCRW1pc0RhdGEAAAAAAAABAAAAEwAAAAEAAAAAAAAACVVFbWlzRGF0YQAAAAAAAAEAAAfQAAAAC1Bvb2xVc2VyS2V5AA==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...BackstopContract.parsers,
    initialize: () => {},
    gulpEmissions: () => {},
    addReward: () => {},
    poolData: (result: string): PoolBackstopDataV1 =>
      BackstopContractV1.spec.funcResToNative('pool_data', result),
    gulpPoolEmissions: (result: string): i128 =>
      BackstopContractV1.spec.funcResToNative('gulp_pool_emissions', result),
    updateTknVal: (result: string): [i128, i128] =>
      BackstopContractV1.spec.funcResToNative('update_tkn_val', result),
  };

  /**
   * Initializes the backstop contract. This function requires that the Emitter has already been initialized.
   *
   * @param contractArgs - The arguments required for initialization.
   * @param contractArgs.backstop_token - The backstop token ID - an LP token with the pair BLND:USDC.
   * @param contractArgs.emitter - The Emitter contract ID.
   * @param contractArgs.usdc_token - The USDC token ID.
   * @param contractArgs.blnd_token - The BLND token ID.
   * @param contractArgs.pool_factory - The pool factory ID.
   * @param contractArgs.drop_list - The list of addresses to distribute initial BLND to and the percent of the distribution they should receive.
   *
   * @throws Will throw an error if initialize has already been called.
   *
   * @returns A base64-encoded string representing the operation.
   */
  initialize(contractArgs: BackstopConstructorArgs): string {
    return this.call(
      'initialize',
      ...BackstopContractV1.spec.funcArgsToScVals('initialize', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Consumes emissions from the Emitter and distributes them to backstops and pools in the reward zone.
   *
   * @returns A base64-encoded string representing the operation.
   */
  gulpEmissions(): string {
    return this.call(
      'gulp_emissions',
      ...BackstopContractV1.spec.funcArgsToScVals('gulp_emissions', {})
    ).toXDR('base64');
  }

  /**
   * Adds a pool to the reward zone, and if the reward zone is full, removes another pool.
   *
   * @param to_add - The address of the pool to add.
   * @param to_remove - The address of the pool to remove.
   *
   * @throws Will throw an error if the pool to remove has more tokens, or if distribution occurred in the last 48 hours.
   *
   * @returns A base64-encoded string representing the operation.
   */
  addReward(to_add: string, to_remove: string): string {
    return this.call(
      'add_reward',
      ...BackstopContractV1.spec.funcArgsToScVals('add_reward', { to_add, to_remove })
    ).toXDR('base64');
  }

  /**
   * Updates the underlying value of 1 backstop token.
   *
   * @returns A base64-encoded string representing the operation.
   */
  updateTokenValue(): string {
    return this.call(
      'update_tkn_val',
      ...BackstopContractV1.spec.funcArgsToScVals('update_tkn_val', {})
    ).toXDR('base64');
  }

  /**
   * Claims backstop deposit emissions from a list of pools for a user.
   *
   * @param contractArgs - The arguments required for claiming emissions.
   * @param contractArgs.from - The address of the user claiming emissions.
   * @param contractArgs.pool_addresses - The list of addresses to claim backstop deposit emissions from.
   * @param contractArgs.to - The address to send the emissions to.
   *
   * @throws Will throw an error if an invalid pool address is included.
   *
   * @returns A base64-encoded string representing the operation.
   */
  claim(contractArgs: BackstopClaimV1Args): string {
    return this.call(
      'claim',
      ...BackstopContractV1.spec.funcArgsToScVals('claim', contractArgs)
    ).toXDR('base64');
  }
}

export class BackstopContractV2 extends BackstopContract {
  constructor(address: string) {
    super(address);
  }

  static readonly spec = new contract.Spec([
    ...BackstopContract.spec.entries,
    ...new contract.Spec([
      // Function constructor
      'AAAAAAAAAY5Db25zdHJ1Y3QgdGhlIGJhY2tzdG9wIGNvbnRyYWN0CgojIyMgQXJndW1lbnRzCiogYGJhY2tzdG9wX3Rva2VuYCAtIFRoZSBiYWNrc3RvcCB0b2tlbiBJRCAtIGFuIExQIHRva2VuIHdpdGggdGhlIHBhaXIgQkxORDpVU0RDCiogYGVtaXR0ZXJgIC0gVGhlIEVtaXR0ZXIgY29udHJhY3QgSUQKKiBgYmxuZF90b2tlbmAgLSBUaGUgQkxORCB0b2tlbiBJRAoqIGB1c2RjX3Rva2VuYCAtIFRoZSBVU0RDIHRva2VuIElECiogYHBvb2xfZmFjdG9yeWAgLSBUaGUgcG9vbCBmYWN0b3J5IElECiogYGRyb3BfbGlzdGAgLSBUaGUgbGlzdCBvZiBhZGRyZXNzZXMgdG8gZGlzdHJpYnV0ZSBpbml0aWFsIEJMTkQgdG8gYW5kIHRoZSBwZXJjZW50IG9mIHRoZSBkaXN0cmlidXRpb24gdGhleSBzaG91bGQgcmVjZWl2ZQAAAAAADV9fY29uc3RydWN0b3IAAAAAAAAGAAAAAAAAAA5iYWNrc3RvcF90b2tlbgAAAAAAEwAAAAAAAAAHZW1pdHRlcgAAAAATAAAAAAAAAApibG5kX3Rva2VuAAAAAAATAAAAAAAAAAp1c2RjX3Rva2VuAAAAAAATAAAAAAAAAAxwb29sX2ZhY3RvcnkAAAATAAAAAAAAAAlkcm9wX2xpc3QAAAAAAAPqAAAD7QAAAAIAAAATAAAACwAAAAA=',
      // Function distribute
      'AAAAAAAAAAAAAAAKZGlzdHJpYnV0ZQAAAAAAAAAAAAEAAAAL',
      // Function gulp_emissions
      'AAAAAAAAAAAAAAAOZ3VscF9lbWlzc2lvbnMAAAAAAAEAAAAAAAAABHBvb2wAAAATAAAAAQAAAAs=',
      // Function add_reward
      'AAAAAAAAAAAAAAAKYWRkX3Jld2FyZAAAAAAAAgAAAAAAAAAGdG9fYWRkAAAAAAATAAAAAAAAAAl0b19yZW1vdmUAAAAAAAPoAAAAEwAAAAA=',
      // Function remove_reward
      'AAAAAAAAAAAAAAANcmVtb3ZlX3Jld2FyZAAAAAAAAAEAAAAAAAAACXRvX3JlbW92ZQAAAAAAABMAAAAA',
      // Function reward_zone
      'AAAAAAAAAAAAAAALcmV3YXJkX3pvbmUAAAAAAAAAAAEAAAPqAAAAEw==',
      // Function claim
      'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAOcG9vbF9hZGRyZXNzZXMAAAAAA+oAAAATAAAAAAAAABFtaW5fbHBfdG9rZW5zX291dAAAAAAAAAsAAAABAAAACw==',
      // Struct PoolBackstopData
      'AAAAAQAAABhUaGUgcG9vbCdzIGJhY2tzdG9wIGRhdGEAAAAAAAAAEFBvb2xCYWNrc3RvcERhdGEAAAAGAAAAAAAAAARibG5kAAAACwAAAAAAAAAHcTR3X3BjdAAAAAALAAAAAAAAAAZzaGFyZXMAAAAAAAsAAAAAAAAAEHRva2VuX3Nwb3RfcHJpY2UAAAALAAAAAAAAAAZ0b2tlbnMAAAAAAAsAAAAAAAAABHVzZGMAAAAL',
      // Struct RzEmissions
      'AAAAAQAAADNUaGUgYWNjcnVlZCBlbWlzc2lvbnMgZm9yIHBvb2wncyBpbiB0aGUgcmV3YXJkIHpvbmUAAAAAAAAAAAtSekVtaXNzaW9ucwAAAAACAAAAAAAAAAdhY2NydWVkAAAAAAsAAAAAAAAACWxhc3RfdGltZQAAAAAAAAY=',
      // Struct BackstopEmissionData
      'AAAAAQAAACdUaGUgZW1pc3Npb24gZGF0YSBmb3IgYSBwb29sJ3MgYmFja3N0b3AAAAAAAAAAABRCYWNrc3RvcEVtaXNzaW9uRGF0YQAAAAQAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAGAAAAAAAAAAVpbmRleAAAAAAAAAsAAAAAAAAACWxhc3RfdGltZQAAAAAAAAY=',
      // Enum BackstopError
      'AAAABAAAAKFFcnJvciBjb2RlcyBmb3IgdGhlIGJhY2tzdG9wIGNvbnRyYWN0LiBDb21tb24gZXJyb3JzIGFyZSBjb2RlcyB0aGF0IG1hdGNoIHVwIHdpdGggdGhlIGJ1aWx0LWluCmNvbnRyYWN0cyBlcnJvciByZXBvcnRpbmcuIEJhY2tzdG9wIHNwZWNpZmljIGVycm9ycyBzdGFydCBhdCAxMDAwLgAAAAAAAAAAAAANQmFja3N0b3BFcnJvcgAAAAAAABEAAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAAA+gAAAAAAAAACk5vdEV4cGlyZWQAAAAAA+kAAAAAAAAAFkludmFsaWRSZXdhcmRab25lRW50cnkAAAAAA+oAAAAAAAAAEUluc3VmZmljaWVudEZ1bmRzAAAAAAAD6wAAAAAAAAAHTm90UG9vbAAAAAPsAAAAAAAAABZJbnZhbGlkU2hhcmVNaW50QW1vdW50AAAAAAPtAAAAAAAAABpJbnZhbGlkVG9rZW5XaXRoZHJhd0Ftb3VudAAAAAAD7gAAAAAAAAARVG9vTWFueVE0V0VudHJpZXMAAAAAAAPvAAAAAAAAAA9Ob3RJblJld2FyZFpvbmUAAAAD8AAAAAAAAAAOUmV3YXJkWm9uZUZ1bGwAAAAAA/EAAAAAAAAAFE1heEJhY2tmaWxsRW1pc3Npb25zAAAD8g==',
      // Union BackstopDataKey
      'AAAAAgAAAAAAAAAAAAAAD0JhY2tzdG9wRGF0YUtleQAAAAAGAAAAAQAAAAAAAAALVXNlckJhbGFuY2UAAAAAAQAAB9AAAAALUG9vbFVzZXJLZXkAAAAAAQAAAAAAAAALUG9vbEJhbGFuY2UAAAAAAQAAABMAAAABAAAAAAAAAAhQb29sVVNEQwAAAAEAAAATAAAAAQAAAAAAAAAKUnpFbWlzRGF0YQAAAAAAAQAAABMAAAABAAAAAAAAAAlCRW1pc0RhdGEAAAAAAAABAAAAEwAAAAEAAAAAAAAACVVFbWlzRGF0YQAAAAAAAAEAAAfQAAAAC1Bvb2xVc2VyS2V5AA==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...BackstopContract.parsers,
    deploy: (result: string): string => scValToNative(xdr.ScVal.fromXDR(result, 'base64')),
    poolData: (result: string): PoolBackstopDataV2 =>
      BackstopContractV2.spec.funcResToNative('pool_data', result),
    distribute: (result: string): i128 =>
      BackstopContractV2.spec.funcResToNative('distribute', result),
    removeReward: () => {},
  };

  /**
   * Deploys a new instance of the Backstop V2 contract.
   *
   * @param deployer - The address of the deployer.
   * @param wasmHash - The hash of the WASM contract code.
   * @param args - The constructor arguments for the contract.
   * @param args.backstop_token - The backstop token ID - an LP token with the pair BLND:USDC.
   * @param args.emitter - The Emitter contract ID.
   * @param args.blnd_token - The BLND token ID.
   * @param args.usdc_token - The USDC token ID.
   * @param args.pool_factory - The pool factory ID.
   * @param args.drop_list - The list of addresses to distribute initial BLND to and the percent of the distribution they should receive.
   * @param salt - Optional salt for the contract deployment.
   * @param format - Optional format for the WASM hash (hex or base64).
   *
   * @returns A base64-encoded string representing the contract deployment operation.
   */
  static deploy(
    deployer: string,
    wasmHash: Buffer | string,
    args: BackstopConstructorArgs,
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

  /**
   * Updates the backstop with new emissions for all reward zone pools.
   *
   * @returns A base64-encoded string representing the operation.
   */
  distribute(): string {
    return this.call(
      'distribute',
      ...BackstopContractV2.spec.funcArgsToScVals('distribute', {})
    ).toXDR('base64');
  }

  /**
   * Adds a pool to the reward zone, and if the reward zone is full, can optionally remove another pool.
   *
   * @param to_add - The address of the pool to add.
   * @param to_remove - The address of the pool to remove (Optional - Used if the reward zone is full).
   *
   * @throws Will throw an error if the pool to remove has more tokens, or if distribution occurred in the last 48 hours.
   *
   * @returns A base64-encoded string representing the operation.
   */
  addReward(to_add: string, to_remove: string | undefined): string {
    return this.call(
      'add_reward',
      ...BackstopContractV2.spec.funcArgsToScVals('add_reward', { to_add, to_remove })
    ).toXDR('base64');
  }

  /**
   * Removes a pool from the reward zone.
   *
   * @param poolToRemove - The address of the pool to remove.
   *
   * @throws Will throw an error if the pool is not below the threshold or if the pool is not in the reward zone.
   *
   * @returns A base64-encoded string representing the operation.
   */
  removeReward(poolToRemove: string): string {
    return this.call(
      'remove_reward',
      ...BackstopContractV2.spec.funcArgsToScVals('remove_reward', { poolToRemove })
    ).toXDR('base64');
  }

  /**
   * Claims backstop deposit emissions from a list of pools for a user.
   *
   * @param contractArgs - The arguments required for claiming emissions.
   * @param contractArgs.from - The address of the user claiming emissions.
   * @param contractArgs.pool_addresses - The list of addresses to claim backstop deposit emissions from.
   * @param contractArgs.min_lp_tokens_out - The minimum amount of LP tokens to mint with the claimed BLND.
   *
   * @throws Will throw an error if an invalid pool address is included.
   *
   * @returns A base64-encoded string representing the operation.
   */
  claim(contractArgs: BackstopClaimV2Args): string {
    return this.call(
      'claim',
      ...BackstopContractV2.spec.funcArgsToScVals('claim', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Fetches the reward zone for the backstop.
   *
   * @returns A base64-encoded string representing the operation.
   */
  rewardZone(): string {
    return this.call(
      'reward_zone',
      ...BackstopContractV2.spec.funcArgsToScVals('reward_zone', {})
    ).toXDR('base64');
  }
}
