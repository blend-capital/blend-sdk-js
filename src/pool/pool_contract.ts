import { Address, Contract, contract, Operation, scValToNative, xdr } from '@stellar/stellar-sdk';
import { i128, u32, u64 } from '../index.js';
import {
  AuctionData,
  PoolConfig,
  ContractReserve,
  Positions,
  Request,
  ReserveConfig,
  ReserveEmissionMetadata,
  ReserveConfigV2,
  FlashLoan,
} from './index.js';
import { EmissionDataV2, UserEmissions } from '../emissions.js';
import { AuctionType } from './auction.js';

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

export interface PoolConstructorArgsV2 extends PoolConstructorArgs {
  min_collateral: i128;
}

export interface UpdatePoolV1Args {
  backstop_take_rate: u32;
  max_positions: u32;
}

export interface UpdatePoolV2Args {
  backstop_take_rate: u32;
  max_positions: u32;
  min_collateral: i128; // The maximum number of bTokens that can be minted
}

export interface SetReserveV1Args {
  asset: Address | string;
  metadata: ReserveConfig;
}

export interface SetReserveV2Args {
  asset: Address | string;
  metadata: ReserveConfigV2;
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
  auction_type: AuctionType;
  user: string;
  bid: Array<string>;
  lot: Array<string>;
  percent: u32;
}

export interface FlashLoanArgs {
  from: Address | string;
  flash_loan: FlashLoan;
  requests: Array<Request>;
}

export abstract class PoolContract extends Contract {
  // @dev: Generated from soroban-cli Typescript bindings
  static spec: contract.Spec = new contract.Spec([
    // Function set_admin
    'AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=',
    // Function queue_set_reserve
    'AAAAAAAAAAAAAAARcXVldWVfc2V0X3Jlc2VydmUAAAAAAAACAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAACG1ldGFkYXRhAAAH0AAAAA1SZXNlcnZlQ29uZmlnAAAAAAAAAA==',
    // Function cancel_set_reserve
    'AAAAAAAAAAAAAAASY2FuY2VsX3NldF9yZXNlcnZlAAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABMAAAAA',
    // Function set_reserve
    'AAAAAAAAAAAAAAALc2V0X3Jlc2VydmUAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAQAAAAQ=',
    // Function get_positions
    'AAAAAAAAAAAAAAANZ2V0X3Bvc2l0aW9ucwAAAAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAEAAAfQAAAACVBvc2l0aW9ucwAAAA==',
    // Function submit
    'AAAAAAAAAAAAAAAGc3VibWl0AAAAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAIcmVxdWVzdHMAAAPqAAAH0AAAAAdSZXF1ZXN0AAAAAAEAAAfQAAAACVBvc2l0aW9ucwAAAA==',
    // Function bad_debt
    'AAAAAAAAAAAAAAAIYmFkX2RlYnQAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAA=',
    // Function update_status
    'AAAAAAAAAAAAAAANdXBkYXRlX3N0YXR1cwAAAAAAAAAAAAABAAAABA==',
    // Function set_status
    'AAAAAAAAAAAAAAAKc2V0X3N0YXR1cwAAAAAAAQAAAAAAAAALcG9vbF9zdGF0dXMAAAAABAAAAAA=',
    // Function gulp_emissions
    'AAAAAAAAAAAAAAAOZ3VscF9lbWlzc2lvbnMAAAAAAAAAAAABAAAACw==',
    // Function set_emissions_config
    'AAAAAAAAAAAAAAAUc2V0X2VtaXNzaW9uc19jb25maWcAAAABAAAAAAAAABVyZXNfZW1pc3Npb25fbWV0YWRhdGEAAAAAAAPqAAAH0AAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAAA',
    // Function claim
    'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAARcmVzZXJ2ZV90b2tlbl9pZHMAAAAAAAPqAAAABAAAAAAAAAACdG8AAAAAABMAAAABAAAACw==',
    // Function get_auction
    'AAAAAAAAAAAAAAALZ2V0X2F1Y3Rpb24AAAAAAgAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAABAAAH0AAAAAtBdWN0aW9uRGF0YQA=',
    // Struct ReserveEmissionMetadata
    'AAAAAQAAADRNZXRhZGF0YSBmb3IgYSBwb29sJ3MgcmVzZXJ2ZSBlbWlzc2lvbiBjb25maWd1cmF0aW9uAAAAAAAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAADAAAAAAAAAAlyZXNfaW5kZXgAAAAAAAAEAAAAAAAAAAhyZXNfdHlwZQAAAAQAAAAAAAAABXNoYXJlAAAAAAAABg==',
    // Struct Request
    'AAAAAQAAACdBIHJlcXVlc3QgYSB1c2VyIG1ha2VzIGFnYWluc3QgdGhlIHBvb2wAAAAAAAAAAAdSZXF1ZXN0AAAAAAMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAxyZXF1ZXN0X3R5cGUAAAAE',
    // Struct Positions
    'AAAAAQAAAE1BIHVzZXIgLyBjb250cmFjdHMgcG9zaXRpb24ncyB3aXRoIHRoZSBwb29sLCBzdG9yZWQgaW4gdGhlIFJlc2VydmUncyBkZWNpbWFscwAAAAAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAwAAAAAAAAAKY29sbGF0ZXJhbAAAAAAD7AAAAAQAAAALAAAAAAAAAAtsaWFiaWxpdGllcwAAAAPsAAAABAAAAAsAAAAAAAAABnN1cHBseQAAAAAD7AAAAAQAAAAL',
    // Struct PoolEmissionConfig
    'AAAAAQAAABpUaGUgcG9vbCdzIGVtaXNzaW9uIGNvbmZpZwAAAAAAAAAAABJQb29sRW1pc3Npb25Db25maWcAAAAAAAIAAAAAAAAABmNvbmZpZwAAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
    // Struct QueuedReserveInit
    'AAAAAQAAAAAAAAAAAAAAEVF1ZXVlZFJlc2VydmVJbml0AAAAAAAAAgAAAAAAAAAKbmV3X2NvbmZpZwAAAAAH0AAAAA1SZXNlcnZlQ29uZmlnAAAAAAAAAAAAAAt1bmxvY2tfdGltZQAAAAAG',
    // Struct ReserveData
    'AAAAAQAAABxUaGUgZGF0YSBmb3IgYSByZXNlcnZlIGFzc2V0AAAAAAAAAAtSZXNlcnZlRGF0YQAAAAAHAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAABmRfcmF0ZQAAAAAACwAAAAAAAAAIZF9zdXBwbHkAAAALAAAAAAAAAAZpcl9tb2QAAAAAAAsAAAAAAAAACWxhc3RfdGltZQAAAAAAAAY=',
    // Struct UserEmissionData
    'AAAAAQAAADNUaGUgdXNlciBlbWlzc2lvbiBkYXRhIGZvciB0aGUgcmVzZXJ2ZSBiIG9yIGQgdG9rZW4AAAAAAAAAABBVc2VyRW1pc3Npb25EYXRhAAAAAgAAAAAAAAAHYWNjcnVlZAAAAAALAAAAAAAAAAVpbmRleAAAAAAAAAs=',
    // Struct UserReserveKey
    'AAAAAQAAAAAAAAAAAAAADlVzZXJSZXNlcnZlS2V5AAAAAAACAAAAAAAAAApyZXNlcnZlX2lkAAAAAAAEAAAAAAAAAAR1c2VyAAAAEw==',
    // Struct AuctionKey
    'AAAAAQAAAAAAAAAAAAAACkF1Y3Rpb25LZXkAAAAAAAIAAAAAAAAACWF1Y3RfdHlwZQAAAAAAAAQAAAAAAAAABHVzZXIAAAAT',
    // Struct PriceData
    'AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==',
    // Struct AuctionData
    'AAAAAQAAAAAAAAAAAAAAC0F1Y3Rpb25EYXRhAAAAAAMAAAEMQSBtYXAgb2YgdGhlIGFzc2V0cyBiZWluZyBiaWQgb24gYW5kIHRoZSBhbW91bnQgYmVpbmcgYmlkLiBUaGVzZSBhcmUgdG9rZW5zIHNwZW50CmJ5IHRoZSBmaWxsZXIgb2YgdGhlIGF1Y3Rpb24uCgpUaGUgYmlkIGlzIGRpZmZlcmVudCBiYXNlZCBvbiBlYWNoIGF1Y3Rpb24gdHlwZToKLSBVc2VyTGlxdWlkYXRpb246IGRUb2tlbnMKLSBCYWREZWJ0QXVjdGlvbjogZFRva2VucwotIEludGVyZXN0QXVjdGlvbjogVW5kZXJseWluZyBhc3NldHMgKGJhY2tzdG9wIHRva2VuKQAAAANiaWQAAAAD7AAAABMAAAALAAAAo1RoZSBibG9jayB0aGUgYXVjdGlvbiBiZWdpbnMgb24uIFRoaXMgaXMgdXNlZCB0byBkZXRlcm1pbmUgaG93IHRoZSBhdWN0aW9uCnNob3VsZCBiZSBzY2FsZWQgYmFzZWQgb24gdGhlIG51bWJlciBvZiBibG9ja3MgdGhhdCBoYXZlIHBhc3NlZCBzaW5jZSB0aGUgYXVjdGlvbiBiZWdhbi4AAAAABWJsb2NrAAAAAAAABAAAASZBIG1hcCBvZiB0aGUgYXNzZXRzIGJlaW5nIGF1Y3Rpb25lZCBvZmYgYW5kIHRoZSBhbW91bnQgYmVpbmcgYXVjdGlvbmVkLiBUaGVzZSBhcmUgdG9rZW5zCnJlY2VpdmVkIGJ5IHRoZSBmaWxsZXIgb2YgdGhlIGF1Y3Rpb24uCgpUaGUgbG90IGlzIGRpZmZlcmVudCBiYXNlZCBvbiBlYWNoIGF1Y3Rpb24gdHlwZToKLSBVc2VyTGlxdWlkYXRpb246IGJUb2tlbnMKLSBCYWREZWJ0QXVjdGlvbjogVW5kZXJseWluZyBhc3NldHMgKGJhY2tzdG9wIHRva2VuKQotIEludGVyZXN0QXVjdGlvbjogVW5kZXJseWluZyBhc3NldHMAAAAAAANsb3QAAAAD7AAAABMAAAAL',
    // Union Asset
    'AAAAAgAAAApBc3NldCB0eXBlAAAAAAAAAAAABUFzc2V0AAAAAAAAAgAAAAEAAAAAAAAAB1N0ZWxsYXIAAAAAAQAAABMAAAABAAAAAAAAAAVPdGhlcgAAAAAAAAEAAAAR',
    // Union PoolDataKey
    'AAAAAgAAAAAAAAAAAAAAC1Bvb2xEYXRhS2V5AAAAAAkAAAABAAAAAAAAAAlSZXNDb25maWcAAAAAAAABAAAAEwAAAAEAAAAAAAAAB1Jlc0luaXQAAAAAAQAAABMAAAABAAAAAAAAAAdSZXNEYXRhAAAAAAEAAAATAAAAAQAAAAAAAAAKRW1pc0NvbmZpZwAAAAAAAQAAAAQAAAABAAAAAAAAAAhFbWlzRGF0YQAAAAEAAAAEAAAAAQAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAQAAABMAAAABAAAAAAAAAAhVc2VyRW1pcwAAAAEAAAfQAAAADlVzZXJSZXNlcnZlS2V5AAAAAAABAAAAAAAAAAdBdWN0aW9uAAAAAAEAAAfQAAAACkF1Y3Rpb25LZXkAAAAAAAEAAAAAAAAACEF1Y3REYXRhAAAAAQAAABM=',
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

  /**
   * Sets a new address as the admin of this pool. Only callable by the current admin.
   *
   * @param new_admin - The new admin address.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  setAdmin(new_admin: Address | string): string {
    return this.call(
      'set_admin',
      ...PoolContract.spec.funcArgsToScVals('set_admin', { new_admin })
    ).toXDR('base64');
  }

  /**
   * Cancels the queued set of a reserve in the pool. Only callable by the admin.
   *
   * @param asset - The underlying asset address to cancel initialization for.
   *
   * @throws Will throw an error if the caller is not the admin or the reserve is not queued for initialization.
   *
   * @returns A base64-encoded string representing the operation.
   */
  cancelSetReserve(asset: Address | string): string {
    return this.call(
      'cancel_set_reserve',
      ...PoolContract.spec.funcArgsToScVals('cancel_set_reserve', { asset })
    ).toXDR('base64');
  }

  /**
   * Executes the queued set of a reserve in the pool.
   *
   * @param asset - The underlying asset address to setup.
   *
   * @throws Will throw an error if the reserve is not queued for initialization, is already setup, or has invalid metadata.
   *
   * @returns A base64-encoded string representing the operation.
   */
  setReserve(asset: Address | string): string {
    return this.call(
      'set_reserve',
      ...PoolContract.spec.funcArgsToScVals('set_reserve', { asset })
    ).toXDR('base64');
  }

  /**
   * Submits a set of requests to the pool where 'from' takes on the position, 'sender' sends any required tokens to the pool
   * and 'to' receives any tokens sent from the pool.
   *
   * @param contractArgs - The arguments required for the submit operation.
   * @param contractArgs.from - The address of the user whose positions are being modified.
   * @param contractArgs.spender - The address of the user who is sending tokens to the pool.
   * @param contractArgs.to - The address of the user who is receiving tokens from the pool.
   * @param contractArgs.requests - A list of requests to be processed.
   *
   * @throws Will throw an error if the request cannot be completed due to insufficient funds or invalid health factor.
   *
   * @returns A base64-encoded string representing the operation.
   */
  submit(contractArgs: SubmitArgs): string {
    return this.call('submit', ...PoolContract.spec.funcArgsToScVals('submit', contractArgs)).toXDR(
      'base64'
    );
  }

  /**
   * Manages bad debt. Debt is considered "bad" if there is no longer any collateral posted.
   *
   * @param user - The user who currently possesses bad debt.
   *
   * @throws Will throw an error if the user has collateral posted.
   *
   * @returns A base64-encoded string representing the operation.
   */
  badDebt(user: Address | string): string {
    return this.call('bad_debt', ...PoolContract.spec.funcArgsToScVals('bad_debt', { user })).toXDR(
      'base64'
    );
  }

  /**
   * Updates the pool status based on the backstop state.
   *
   * @throws Will throw an error if the pool is currently on status 4, "admin-freeze",
   * where only the admin can perform a status update via `setStatus`.
   *
   * @returns A base64-encoded string representing the operation.
   */
  updateStatus(): string {
    return this.call(
      'update_status',
      ...PoolContract.spec.funcArgsToScVals('update_status', {})
    ).toXDR('base64');
  }

  /**
   * Sets the pool status. Only callable by the admin.
   *
   * @param pool_status - The pool status to be set: 0 (active), 2 (on-ice), or 4 (frozen).
   *
   * @throws Will throw an error if the caller is not the admin or if the specified conditions are not met for the status to be set.
   *
   * @returns A base64-encoded string representing the operation.
   */
  setStatus(pool_status: u32): string {
    return this.call(
      'set_status',
      ...PoolContract.spec.funcArgsToScVals('set_status', { pool_status })
    ).toXDR('base64');
  }

  /**
   * Consumes emissions from the backstop and distributes to the reserves based on the reserve emission configuration.
   *
   * @returns A base64-encoded string representing the operation.
   */
  gulpEmissions(): string {
    return this.call(
      'gulp_emissions',
      ...PoolContract.spec.funcArgsToScVals('gulp_emissions', {})
    ).toXDR('base64');
  }

  /**
   * Sets the emission configuration for the pool. Only callable by the admin.
   *
   * @param res_emission_metadata - A vector of ReserveEmissionMetadata to update metadata to.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  setEmissionsConfig(res_emission_metadata: Array<ReserveEmissionMetadata>): string {
    return this.call(
      'set_emissions_config',
      ...PoolContract.spec.funcArgsToScVals('set_emissions_config', { res_emission_metadata })
    ).toXDR('base64');
  }

  /**
   * Claims outstanding emissions for the caller for the given reserve tokens.
   *
   * @param contractArgs - The arguments required for claiming emissions.
   * @param contractArgs.from - The address claiming.
   * @param contractArgs.reserve_token_ids - List of reserve token IDs.
   * @param contractArgs.to - The address to send the claimed tokens to.
   *
   * @returns A base64-encoded string representing the operation.
   */
  claim(contractArgs: PoolClaimArgs): string {
    return this.call('claim', ...PoolContract.spec.funcArgsToScVals('claim', contractArgs)).toXDR(
      'base64'
    );
  }

  /**
   * Fetches an auction from the ledger. Returns a quote based on the current block.
   *
   * @param auction_id - The ID of the auction.
   *
   * @throws Will throw an error if the auction does not exist.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getAuction(auction_id: number): string {
    return this.call(
      'get_auction',
      ...PoolContract.spec.funcArgsToScVals('get_auction', { auction_id })
    ).toXDR('base64');
  }

  /**
   * Fetches the positions for an address.
   *
   * @param user - The address to fetch positions for.
   *
   * @returns A base64-encoded string representing the operation.
   */
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
      // Function initialize
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAApic3RvcF9yYXRlAAAAAAAEAAAAAAAAAAxtYXhfcG9zdGlvbnMAAAAEAAAAAAAAAAtiYWNrc3RvcF9pZAAAAAATAAAAAAAAAAdibG5kX2lkAAAAABMAAAAA',
      // Function new_liquidation_auction
      'AAAAAAAAAAAAAAAXbmV3X2xpcXVpZGF0aW9uX2F1Y3Rpb24AAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAAEnBlcmNlbnRfbGlxdWlkYXRlZAAAAAAABgAAAAEAAAfQAAAAC0F1Y3Rpb25EYXRhAA==',
      // Function new_bad_debt_auction
      'AAAAAAAAAAAAAAAUbmV3X2JhZF9kZWJ0X2F1Y3Rpb24AAAAAAAAAAQAAB9AAAAALQXVjdGlvbkRhdGEA',
      // Function new_interest_auction
      'AAAAAAAAAAAAAAAUbmV3X2ludGVyZXN0X2F1Y3Rpb24AAAABAAAAAAAAAAZhc3NldHMAAAAAA+oAAAATAAAAAQAAB9AAAAALQXVjdGlvbkRhdGEA',
      // Function update_pool
      'AAAAAAAAAAAAAAALdXBkYXRlX3Bvb2wAAAAAAgAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAA=',
      // Struct Errors
      'AAAABAAAAJlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgY29udHJhY3QuIENvbW1vbiBlcnJvcnMgYXJlIGNvZGVzIHRoYXQgbWF0Y2ggdXAgd2l0aCB0aGUgYnVpbHQtaW4KY29udHJhY3RzIGVycm9yIHJlcG9ydGluZy4gUG9vbCBzcGVjaWZpYyBlcnJvcnMgc3RhcnQgYXQgMTIwMC4AAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAABoAAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAABLAAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAEsQAAAAAAAAAWSW52YWxpZFJlc2VydmVNZXRhZGF0YQAAAAAEsgAAAAAAAAAPSW5pdE5vdFVubG9ja2VkAAAABLMAAAAAAAAAEFN0YXR1c05vdEFsbG93ZWQAAAS0AAAAAAAAAAlJbnZhbGlkSGYAAAAAAAS1AAAAAAAAABFJbnZhbGlkUG9vbFN0YXR1cwAAAAAABLYAAAAAAAAAD0ludmFsaWRVdGlsUmF0ZQAAAAS3AAAAAAAAABRNYXhQb3NpdGlvbnNFeGNlZWRlZAAABLgAAAAAAAAAF0ludGVybmFsUmVzZXJ2ZU5vdEZvdW5kAAAABLkAAAAAAAAAClN0YWxlUHJpY2UAAAAABLoAAAAAAAAAEkludmFsaWRMaXF1aWRhdGlvbgAAAAAEuwAAAAAAAAARQXVjdGlvbkluUHJvZ3Jlc3MAAAAAAAS8AAAAAAAAABJJbnZhbGlkTGlxVG9vTGFyZ2UAAAAABL0AAAAAAAAAEkludmFsaWRMaXFUb29TbWFsbAAAAAAEvgAAAAAAAAAQSW50ZXJlc3RUb29TbWFsbAAABL8AAAAAAAAAF0ludmFsaWRCVG9rZW5NaW50QW1vdW50AAAABMAAAAAAAAAAF0ludmFsaWRCVG9rZW5CdXJuQW1vdW50AAAABMEAAAAAAAAAF0ludmFsaWREVG9rZW5NaW50QW1vdW50AAAABMIAAAAAAAAAF0ludmFsaWREVG9rZW5CdXJuQW1vdW50AAAABMM=',
      // Struct ReserveConfig
      'AAAAAQAAADNUaGUgY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc2VydmUgYXNzZXQAAAAAAAAAAA1SZXNlcnZlQ29uZmlnAAAAAAAACwAAAAAAAAAIY19mYWN0b3IAAAAEAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAIbF9mYWN0b3IAAAAEAAAAAAAAAAhtYXhfdXRpbAAAAAQAAAAAAAAABnJfYmFzZQAAAAAABAAAAAAAAAAFcl9vbmUAAAAAAAAEAAAAAAAAAAdyX3RocmVlAAAAAAQAAAAAAAAABXJfdHdvAAAAAAAABAAAAAAAAAAKcmVhY3Rpdml0eQAAAAAABAAAAAAAAAAEdXRpbAAAAAQ=',
      // Struct Reserve
      'AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAADQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAACGNfZmFjdG9yAAAABAAAAAAAAAAGZF9yYXRlAAAAAAALAAAAAAAAAAhkX3N1cHBseQAAAAsAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAGaXJfbW9kAAAAAAALAAAAAAAAAAhsX2ZhY3RvcgAAAAQAAAAAAAAACWxhc3RfdGltZQAAAAAAAAYAAAAAAAAACG1heF91dGlsAAAABAAAAAAAAAAGc2NhbGFyAAAAAAAL',
      // Struct PoolConfig
      'AAAAAQAAABFUaGUgcG9vbCdzIGNvbmZpZwAAAAAAAAAAAAAKUG9vbENvbmZpZwAAAAAABAAAAAAAAAAKYnN0b3BfcmF0ZQAAAAAABAAAAAAAAAANbWF4X3Bvc2l0aW9ucwAAAAAAAAQAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAAE',
      // Struct ReserveEmissionsConfig
      'AAAAAQAAAIFUaGUgY29uZmlndXJhdGlvbiBvZiBlbWlzc2lvbnMgZm9yIHRoZSByZXNlcnZlIGIgb3IgZCB0b2tlbgoKYEBkZXZgIElmIHRoaXMgaXMgdXBkYXRlZCwgUmVzZXJ2ZUVtaXNzaW9uc0RhdGEgTVVTVCBhbHNvIGJlIHVwZGF0ZWQAAAAAAAAAAAAAFlJlc2VydmVFbWlzc2lvbnNDb25maWcAAAAAAAIAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAG',
      // Struct ReserveEmissionData
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

  /**
   * Initializes the pool.
   *
   * @param contractArgs - The arguments required for pool initialization.
   * @param contractArgs.admin - The address for the admin.
   * @param contractArgs.name - The name of the pool.
   * @param contractArgs.oracle - The contract address of the oracle.
   * @param contractArgs.bstop_rate - The take rate for the backstop (7 decimals).
   * @param contractArgs.max_positions - The maximum number of positions a user is permitted to have.
   * @param contractArgs.backstop_id - The contract address of the pool's backstop module.
   * @param contractArgs.blnd_id - The contract ID of the BLND token.
   *
   * @returns A base64-encoded string representing the operation.
   */
  initialize(contractArgs: PoolConstructorArgs): string {
    return this.call(
      'initialize',
      ...PoolContractV1.spec.funcArgsToScVals('initialize', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Updates the pool configuration. Only callable by the admin.
   *
   * @param contractArgs - The arguments required to update the pool.
   * @param contractArgs.backstop_take_rate - The new take rate for the backstop (7 decimals).
   * @param contractArgs.max_positions - The new maximum number of allowed positions for a single user's account.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  updatePool(contractArgs: UpdatePoolV1Args): string {
    return this.call(
      'update_pool',
      ...PoolContract.spec.funcArgsToScVals('update_pool', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Queues setting data for a reserve in the pool. Only callable by the admin.
   *
   * @param contractArgs - The arguments required for queuing a reserve.
   * @param contractArgs.asset - The underlying asset to add as a reserve.
   * @param contractArgs.metadata - The ReserveConfig for the reserve.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  queueSetReserve(contractArgs: SetReserveV1Args): string {
    return this.call(
      'queue_set_reserve',
      ...PoolContractV1.spec.funcArgsToScVals('queue_set_reserve', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Creates a new user liquidation auction.
   *
   * @param contractArgs - The arguments required to create a liquidation auction.
   * @param contractArgs.user - The user getting liquidated through the auction.
   * @param contractArgs.percent_liquidated - The percent of the user's position being liquidated as a percentage (15 => 15%).
   *
   * @throws Will throw an error if the user liquidation auction was unable to be created.
   *
   * @returns A base64-encoded string representing the operation.
   */
  newLiquidationAuction(contractArgs: NewLiqudiationAuctionArgs): string {
    return this.call(
      'new_liquidation_auction',
      ...PoolContractV1.spec.funcArgsToScVals('new_liquidation_auction', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Creates a new bad debt auction.
   *
   * @throws Will throw an error if the auction was unable to be created.
   *
   * @returns A base64-encoded string representing the operation.
   */
  newBadDebtAuction(): string {
    return this.call(
      'new_bad_debt_auction',
      ...PoolContractV1.spec.funcArgsToScVals('new_bad_debt_auction', {})
    ).toXDR('base64');
  }

  /**
   * Creates a new interest auction.
   *
   * @param assets - The assets interest is being auctioned off for.
   *
   * @throws Will throw an error if the auction was unable to be created.
   *
   * @returns A base64-encoded string representing the operation.
   */
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
      // Function constructor
      'AAAAAAAAAjVJbml0aWFsaXplIHRoZSBwb29sCgojIyMgQXJndW1lbnRzCkNyZWF0b3Igc3VwcGxpZWQ6CiogYGFkbWluYCAtIFRoZSBBZGRyZXNzIGZvciB0aGUgYWRtaW4KKiBgbmFtZWAgLSBUaGUgbmFtZSBvZiB0aGUgcG9vbAoqIGBvcmFjbGVgIC0gVGhlIGNvbnRyYWN0IGFkZHJlc3Mgb2YgdGhlIG9yYWNsZQoqIGBiYWNrc3RvcF90YWtlX3JhdGVgIC0gVGhlIHRha2UgcmF0ZSBmb3IgdGhlIGJhY2tzdG9wICg3IGRlY2ltYWxzKQoqIGBtYXhfcG9zaXRpb25zYCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBwb3NpdGlvbnMgYSB1c2VyIGlzIHBlcm1pdHRlZCB0byBoYXZlCiogYG1pbl9jb2xsYXRlcmFsYCAtIFRoZSBtaW5pbXVtIGNvbGxhdGVyYWwgcmVxdWlyZWQgdG8gb3BlbiBhIGJvcnJvdyBwb3NpdGlvbiBpbiB0aGUgb3JhY2xlcyBiYXNlIGFzc2V0CgpQb29sIEZhY3Rvcnkgc3VwcGxpZWQ6CiogYGJhY2tzdG9wX2lkYCAtIFRoZSBjb250cmFjdCBhZGRyZXNzIG9mIHRoZSBwb29sJ3MgYmFja3N0b3AgbW9kdWxlCiogYGJsbmRfaWRgIC0gVGhlIGNvbnRyYWN0IElEIG9mIHRoZSBCTE5EIHRva2VuAAAAAAAADV9fY29uc3RydWN0b3IAAAAAAAAIAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAACmJzdG9wX3JhdGUAAAAAAAQAAAAAAAAADW1heF9wb3NpdGlvbnMAAAAAAAAEAAAAAAAAAA5taW5fY29sbGF0ZXJhbAAAAAAACwAAAAAAAAALYmFja3N0b3BfaWQAAAAAEwAAAAAAAAAHYmxuZF9pZAAAAAATAAAAAA==',
      // Function submit_with_allowance
      'AAAAAAAAAAAAAAAVc3VibWl0X3dpdGhfYWxsb3dhbmNlAAAAAAAABAAAAAAAAAAEZnJvbQAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAACHJlcXVlc3RzAAAD6gAAB9AAAAAHUmVxdWVzdAAAAAABAAAH0AAAAAlQb3NpdGlvbnMAAAA=',
      // Function flash_loan
      'AAAAAAAAAAAAAAAKZmxhc2hfbG9hbgAAAAAAAwAAAAAAAAAEZnJvbQAAABMAAAAAAAAACmZsYXNoX2xvYW4AAAAAB9AAAAAJRmxhc2hMb2FuAAAAAAAAAAAAAAhyZXF1ZXN0cwAAA+oAAAfQAAAAB1JlcXVlc3QAAAAAAQAAB9AAAAAJUG9zaXRpb25zAAAA',
      // Function gulp
      'AAAAAAAAAAAAAAAEZ3VscAAAAAEAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAEAAAAL',
      // Function new_auction
      'AAAAAAAAAAAAAAALbmV3X2F1Y3Rpb24AAAAABQAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAAA2JpZAAAAAPqAAAAEwAAAAAAAAADbG90AAAAA+oAAAATAAAAAAAAAAdwZXJjZW50AAAAAAQAAAABAAAH0AAAAAtBdWN0aW9uRGF0YQA=',
      // Function update_pool
      'AAAAAAAAAAAAAAALdXBkYXRlX3Bvb2wAAAAAAwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAAAAAA1tYXhfcG9zaXRpb25zAAAAAAAABAAAAAAAAAAObWluX2NvbGxhdGVyYWwAAAAAAAsAAAAA',
      // Function del_auction
      'AAAAAAAAAAAAAAALZGVsX2F1Y3Rpb24AAAAAAgAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAAA',
      // Function propose_admin
      'AAAAAAAAAAAAAAANcHJvcG9zZV9hZG1pbgAAAAAAAAEAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAAA',
      // Function accept_admin
      'AAAAAAAAAAAAAAAMYWNjZXB0X2FkbWluAAAAAAAAAAA=',
      // Function get_config
      'AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAAClBvb2xDb25maWcAAA==',
      // Function get_admin
      'AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT',
      // Function get_reserve
      'AAAAAAAAAAAAAAALZ2V0X3Jlc2VydmUAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAQAAB9AAAAAHUmVzZXJ2ZQA=',
      // Function get_reserve_list
      'AAAAAAAAAAAAAAAQZ2V0X3Jlc2VydmVfbGlzdAAAAAAAAAABAAAD6gAAABM=',
      // Function get_reserve_emissions
      'AAAAAAAAAAAAAAAVZ2V0X3Jlc2VydmVfZW1pc3Npb25zAAAAAAAAAQAAAAAAAAATcmVzZXJ2ZV90b2tlbl9pbmRleAAAAAAEAAAAAQAAA+gAAAfQAAAAE1Jlc2VydmVFbWlzc2lvbkRhdGEA',
      // Function get_user_emissions
      'AAAAAAAAAAAAAAASZ2V0X3VzZXJfZW1pc3Npb25zAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAATcmVzZXJ2ZV90b2tlbl9pbmRleAAAAAAEAAAAAQAAA+gAAAfQAAAAEFVzZXJFbWlzc2lvbkRhdGE=',
      // Struct FlashLoan
      'AAAAAQAAAAAAAAAAAAAACUZsYXNoTG9hbgAAAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAhjb250cmFjdAAAABM=',
      // Struct Reserve
      'AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAABAAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZjb25maWcAAAAAB9AAAAANUmVzZXJ2ZUNvbmZpZwAAAAAAAAAAAAAEZGF0YQAAB9AAAAALUmVzZXJ2ZURhdGEAAAAAAAAAAAZzY2FsYXIAAAAAAAs=',
      // Struct Errors
      'AAAABAAAAJlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgY29udHJhY3QuIENvbW1vbiBlcnJvcnMgYXJlIGNvZGVzIHRoYXQgbWF0Y2ggdXAgd2l0aCB0aGUgYnVpbHQtaW4KY29udHJhY3RzIGVycm9yIHJlcG9ydGluZy4gUG9vbCBzcGVjaWZpYyBlcnJvcnMgc3RhcnQgYXQgMTIwMC4AAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAAB4AAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAABLAAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAEsQAAAAAAAAAWSW52YWxpZFJlc2VydmVNZXRhZGF0YQAAAAAEsgAAAAAAAAAPSW5pdE5vdFVubG9ja2VkAAAABLMAAAAAAAAAEFN0YXR1c05vdEFsbG93ZWQAAAS0AAAAAAAAAAlJbnZhbGlkSGYAAAAAAAS1AAAAAAAAABFJbnZhbGlkUG9vbFN0YXR1cwAAAAAABLYAAAAAAAAAD0ludmFsaWRVdGlsUmF0ZQAAAAS3AAAAAAAAABRNYXhQb3NpdGlvbnNFeGNlZWRlZAAABLgAAAAAAAAAF0ludGVybmFsUmVzZXJ2ZU5vdEZvdW5kAAAABLkAAAAAAAAAClN0YWxlUHJpY2UAAAAABLoAAAAAAAAAEkludmFsaWRMaXF1aWRhdGlvbgAAAAAEuwAAAAAAAAARQXVjdGlvbkluUHJvZ3Jlc3MAAAAAAAS8AAAAAAAAABJJbnZhbGlkTGlxVG9vTGFyZ2UAAAAABL0AAAAAAAAAEkludmFsaWRMaXFUb29TbWFsbAAAAAAEvgAAAAAAAAAQSW50ZXJlc3RUb29TbWFsbAAABL8AAAAAAAAAF0ludmFsaWRCVG9rZW5NaW50QW1vdW50AAAABMAAAAAAAAAAF0ludmFsaWRCVG9rZW5CdXJuQW1vdW50AAAABMEAAAAAAAAAF0ludmFsaWREVG9rZW5NaW50QW1vdW50AAAABMIAAAAAAAAAF0ludmFsaWREVG9rZW5CdXJuQW1vdW50AAAABMMAAAAAAAAAFUV4Y2VlZGVkQ29sbGF0ZXJhbENhcAAAAAAABMQAAAAAAAAACkludmFsaWRCaWQAAAAABMUAAAAAAAAACkludmFsaWRMb3QAAAAABMYAAAAAAAAAD1Jlc2VydmVEaXNhYmxlZAAAAATH',
      // Struct ReserveConfig
      'AAAAAQAAADNUaGUgY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc2VydmUgYXNzZXQAAAAAAAAAAA1SZXNlcnZlQ29uZmlnAAAAAAAADQAAAAAAAAAIY19mYWN0b3IAAAAEAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAAB2VuYWJsZWQAAAAAAQAAAAAAAAAFaW5kZXgAAAAAAAAEAAAAAAAAAAhsX2ZhY3RvcgAAAAQAAAAAAAAACG1heF91dGlsAAAABAAAAAAAAAAGcl9iYXNlAAAAAAAEAAAAAAAAAAVyX29uZQAAAAAAAAQAAAAAAAAAB3JfdGhyZWUAAAAABAAAAAAAAAAFcl90d28AAAAAAAAEAAAAAAAAAApyZWFjdGl2aXR5AAAAAAAEAAAAAAAAAApzdXBwbHlfY2FwAAAAAAALAAAAAAAAAAR1dGlsAAAABA==',
      // Struct ReserveEmissionData
      'AAAAAQAAAC5UaGUgZW1pc3Npb24gZGF0YSBmb3IgdGhlIHJlc2VydmUgYiBvciBkIHRva2VuAAAAAAAAAAAAE1Jlc2VydmVFbWlzc2lvbkRhdGEAAAAABAAAAAAAAAADZXBzAAAAAAYAAAAAAAAACmV4cGlyYXRpb24AAAAAAAYAAAAAAAAABWluZGV4AAAAAAAACwAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
      // Struct PoolConfig
      'AAAAAQAAABFUaGUgcG9vbCdzIGNvbmZpZwAAAAAAAAAAAAAKUG9vbENvbmZpZwAAAAAABQAAAAAAAAAKYnN0b3BfcmF0ZQAAAAAABAAAAAAAAAANbWF4X3Bvc2l0aW9ucwAAAAAAAAQAAAAAAAAADm1pbl9jb2xsYXRlcmFsAAAAAAALAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAABnN0YXR1cwAAAAAABA==',
    ]).entries,
  ]);

  static readonly parsers = {
    ...PoolContract.parsers,
    deploy: (result: string): string => scValToNative(xdr.ScVal.fromXDR(result, 'base64')),
    submitWithAllowance: (result: string): Positions => Positions.fromScVal(result),
    flashLoan: (result: string): Positions => Positions.fromScVal(result),
    gulp: (result: string): i128 => PoolContract.spec.funcResToNative('gulp', result),
    newAuction: (result: string): AuctionData => AuctionData.fromScVal(result),
    proposeAdmin: () => {},
    acceptAdmin: () => {},
    getConfig: (result: string): PoolConfig => PoolConfig.fromScVal(result),
    getAdmin: (result: string): string => PoolContract.spec.funcResToNative('get_admin', result),
    getReserve: (result: string): ContractReserve => ContractReserve.fromScVal(result),
    getReserveEmissions: (result: string): EmissionDataV2 | undefined =>
      PoolContractV2.spec.funcResToNative('get_reserve_emissions', result),
    getUserEmissions: (result: string): UserEmissions | undefined =>
      PoolContractV2.spec.funcResToNative('get_user_emissions', result),
    getReserveList: (result: string): string[] =>
      PoolContractV2.spec.funcResToNative('get_reserve_list', result),
    delAuction: () => {},
  };

  /**
   * Deploys a new instance of the Pool V2 contract.
   *
   * @param deployer - The address of the deployer.
   * @param wasmHash - The hash of the WASM contract code.
   * @param args - The constructor arguments for the contract.
   * @param args.admin - The address for the admin.
   * @param args.name - The name of the pool.
   * @param args.oracle - The contract address of the oracle.
   * @param args.bstop_rate - The take rate for the backstop (7 decimals).
   * @param args.max_positions - The maximum number of positions a user is permitted to have.
   * @param args.min_collateral - The minimum collateral required to open a borrow position, specified in the oracle's base asset decimals.
   * @param args.backstop_id - The contract address of the pool's backstop module.
   * @param args.blnd_id - The contract ID of the BLND token.
   * @param salt - Optional salt for the contract deployment.
   * @param format - Optional format for the WASM hash (hex or base64).
   *
   * @returns A base64-encoded string representing the operation.
   */
  static deploy(
    deployer: string,
    wasmHash: Buffer | string,
    args: PoolConstructorArgsV2,
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
   * Updates the pool configuration. Only callable by the admin.
   *
   * @param contractArgs - The arguments required to update the pool.
   * @param contractArgs.backstop_take_rate - The new take rate for the backstop (7 decimals).
   * @param contractArgs.max_positions - The new maximum number of allowed positions for a single user's account.
   * @param contractArgs.min_collateral - The new minimum collateral required to open a borrow position,
   *                                      specified in the oracle's base asset decimals.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  updatePool(contractArgs: UpdatePoolV2Args): string {
    return this.call(
      'update_pool',
      ...PoolContract.spec.funcArgsToScVals('update_pool', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Queues setting data for a reserve in the pool. Only callable by the admin.
   *
   * @param contractArgs - The arguments required for queuing a reserve.
   * @param contractArgs.asset - The underlying asset to add as a reserve.
   * @param contractArgs.metadata - The ReserveConfig for the reserve.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  queueSetReserve(contractArgs: SetReserveV2Args): string {
    return this.call(
      'queue_set_reserve',
      ...PoolContractV2.spec.funcArgsToScVals('queue_set_reserve', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Submits a set of requests to the pool using transfer_from for allowances.
   *
   * @param contractArgs - The arguments required for the submit operation.
   * @param contractArgs.from - The address of the user whose positions are being modified.
   * @param contractArgs.spender - The address of the user who is sending tokens to the pool.
   * @param contractArgs.to - The address of the user who is receiving tokens from the pool.
   * @param contractArgs.requests - A list of requests to be processed.
   *
   * @throws Will throw an error if the request cannot be completed due to insufficient funds, insufficient allowance, or invalid health factor.
   *
   * @returns A base64-encoded string representing the operation.
   */
  submitWithAllowance(contractArgs: SubmitArgs): string {
    return this.call(
      'submit_with_allowance',
      ...PoolContractV2.spec.funcArgsToScVals('submit_with_allowance', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Executes a flash loan and submits a set of requests to the pool.
   *
   * @param contractArgs - The arguments required for the flash loan.
   * @param contractArgs.from - The address of the user executing the flash loan and whose positions will be modified.
   * @param contractArgs.contract - The contract that will receive the flash loan callback.
   * @param contractArgs.asset - The asset to be borrowed in the flash loan.
   * @param contractArgs.amount - The amount to be borrowed in the flash loan.
   *
   * @returns A base64-encoded string representing the operation.
   */
  flashLoan(contractArgs: FlashLoanArgs): string {
    return this.call(
      'flash_loan',
      ...PoolContractV2.spec.funcArgsToScVals('flash_loan', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Gulps unaccounted for tokens to the backstop credit so they aren't lost.
   * This is most relevant for rebasing tokens where the token balance can increase without any corresponding transfer.
   *
   * @param asset - The address of the asset to gulp.
   *
   * @returns A base64-encoded string representing the operation.
   */
  gulp(asset: string): string {
    return this.call('gulp', ...PoolContractV2.spec.funcArgsToScVals('gulp', { asset })).toXDR(
      'base64'
    );
  }

  /**
   * Creates a new auction. Auctions are used to process liquidations, bad debt, and interest.
   *
   * @param contractArgs - The arguments required to create an auction.
   * @param contractArgs.auction_type - The type of auction: 0 (liquidation), 1 (bad debt), or 2 (interest).
   * @param contractArgs.user - The address involved in the auction.
   * @param contractArgs.bid - The set of assets to include in the auction bid.
   * @param contractArgs.lot - The set of assets to include in the auction lot.
   * @param contractArgs.percent - The percent of the assets to be auctioned off as a percentage (15 => 15%).
   *
   * @returns A base64-encoded string representing the operation.
   */
  newAuction(contractArgs: NewAuctionArgs): string {
    return this.call(
      'new_auction',
      ...PoolContractV2.spec.funcArgsToScVals('new_auction', contractArgs)
    ).toXDR('base64');
  }

  /**
   * Deletes a stale auction. A stale auction is one that has been running for 500 blocks without being filled.
   *
   * @param auction_type - The type of auction: 0 (liquidation), 1 (bad debt), or 2 (interest).
   * @param user - The address involved in the auction.
   *
   * @throws Will throw an error if the auction does not exist or if the auction is not stale.
   *
   * @returns A base64-encoded string representing the operation.
   */
  delAuction(auction_type: number, user: Address | string): string {
    return this.call(
      'del_auction',
      ...PoolContractV2.spec.funcArgsToScVals('del_auction', { auction_type, user })
    ).toXDR('base64');
  }

  /**
   * Proposes a new admin for the pool. Only callable by the current admin.
   *
   * @param new_admin - The new admin address.
   *
   * @throws Will throw an error if the caller is not the admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  proposeAdmin(new_admin: Address | string): string {
    return this.call(
      'propose_admin',
      ...PoolContractV2.spec.funcArgsToScVals('propose_admin', { new_admin })
    ).toXDR('base64');
  }

  /**
   * Accepts the admin role. Only callable by the proposed admin.
   *
   * @throws Will throw an error if the caller is not the proposed admin.
   *
   * @returns A base64-encoded string representing the operation.
   */
  acceptAdmin(): string {
    return this.call(
      'accept_admin',
      ...PoolContractV2.spec.funcArgsToScVals('accept_admin', {})
    ).toXDR('base64');
  }

  /**
   * Fetches the pool configuration.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getConfig(): string {
    return this.call('get_config', ...PoolContractV2.spec.funcArgsToScVals('get_config', {})).toXDR(
      'base64'
    );
  }

  /**
   * Fetches the admin address of the pool.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getAdmin(): string {
    return this.call('get_admin', ...PoolContractV2.spec.funcArgsToScVals('get_admin', {})).toXDR(
      'base64'
    );
  }

  /**
   * Fetches information about a reserve, updated to the current ledger.
   *
   * @param asset - The address of the reserve asset.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getReserve(asset: Address | string): string {
    return this.call(
      'get_reserve',
      ...PoolContractV2.spec.funcArgsToScVals('get_reserve', { asset })
    ).toXDR('base64');
  }

  /**
   * Fetches the emissions data for a reserve token.
   *
   * @param reserve_token_id - The reserve token ID.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getReserveEmissions(reserve_token_id: number): string {
    return this.call(
      'get_reserve_emissions',
      ...PoolContractV2.spec.funcArgsToScVals('get_reserve_emissions', { reserve_token_id })
    ).toXDR('base64');
  }

  /**
   * Fetches the emissions data for a user's position in a reserve.
   *
   * @param user - The address of the user.
   * @param reserve_token_id - The reserve token ID.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getUserEmissions(user: Address | string, reserve_token_id: number): string {
    return this.call(
      'get_user_emissions',
      ...PoolContractV2.spec.funcArgsToScVals('get_user_emissions', { user, reserve_token_id })
    ).toXDR('base64');
  }

  /**
   * Fetches the list of all reserve addresses in the pool.
   *
   * @returns A base64-encoded string representing the operation.
   */
  getReserveList(): string {
    return this.call(
      'get_reserve_list',
      ...PoolContractV2.spec.funcArgsToScVals('get_reserve_list', {})
    ).toXDR('base64');
  }
}
