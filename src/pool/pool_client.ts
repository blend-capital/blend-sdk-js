import { Address, Contract, ContractSpec, xdr } from 'stellar-sdk';
import { ContractResult, Network, TxOptions, i128, u32, u64 } from '../index.js';
import { invokeOperation } from '../tx.js';
import {
  AuctionData,
  Positions,
  Request,
  ReserveConfig,
  ReserveEmissionMetadata,
} from './index.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface SubmitArgs {
  from: Address | string;
  spender: Address | string;
  to: Address | string;
  requests: Array<Request>;
}

export interface PoolInitializeArgs {
  admin: Address | string;
  name: string;
  oracle: Address | string;
  bstop_rate: u32;
  max_positions: u32;
  backstop_id: Address | string;
  blnd_id: Address | string;
  usdc_id: Address | string;
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

export class PoolClient {
  address: string;
  private contract: Contract;
  spec: ContractSpec;

  constructor(address: string) {
    this.address = address;
    this.contract = new Contract(address);
    // @dev: Generated from soroban-cli Typescript bindings
    this.spec = new ContractSpec([
      'AAAAAQAAAAAAAAAAAAAAC0F1Y3Rpb25EYXRhAAAAAAMAAAAAAAAAA2JpZAAAAAPsAAAAEwAAAAsAAAAAAAAABWJsb2NrAAAAAAAABAAAAAAAAAADbG90AAAAA+wAAAATAAAACw==',
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAACAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARuYW1lAAAAEQAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAApic3RvcF9yYXRlAAAAAAAEAAAAAAAAAAxtYXhfcG9zdGlvbnMAAAAEAAAAAAAAAAtiYWNrc3RvcF9pZAAAAAATAAAAAAAAAAdibG5kX2lkAAAAABMAAAAAAAAAB3VzZGNfaWQAAAAAEwAAAAA=',
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
      'AAAAAAAAAAAAAAAXbmV3X2xpcXVpZGF0aW9uX2F1Y3Rpb24AAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAAEnBlcmNlbnRfbGlxdWlkYXRlZAAAAAAABgAAAAEAAAfQAAAAC0F1Y3Rpb25EYXRhAA==',
      'AAAAAAAAAAAAAAALZ2V0X2F1Y3Rpb24AAAAAAgAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAABAAAH0AAAAAtBdWN0aW9uRGF0YQA=',
      'AAAAAAAAAAAAAAALbmV3X2F1Y3Rpb24AAAAAAQAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAEAAAfQAAAAC0F1Y3Rpb25EYXRhAA==',
      'AAAAAQAAADRNZXRhZGF0YSBmb3IgYSBwb29sJ3MgcmVzZXJ2ZSBlbWlzc2lvbiBjb25maWd1cmF0aW9uAAAAAAAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAADAAAAAAAAAAlyZXNfaW5kZXgAAAAAAAAEAAAAAAAAAAhyZXNfdHlwZQAAAAQAAAAAAAAABXNoYXJlAAAAAAAABg==',
      'AAAABAAAAJlFcnJvciBjb2RlcyBmb3IgdGhlIHBvb2wgY29udHJhY3QuIENvbW1vbiBlcnJvcnMgYXJlIGNvZGVzIHRoYXQgbWF0Y2ggdXAgd2l0aCB0aGUgYnVpbHQtaW4KY29udHJhY3RzIGVycm9yIHJlcG9ydGluZy4gUG9vbCBzcGVjaWZpYyBlcnJvcnMgc3RhcnQgYXQgMTIwMC4AAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAABYAAAAAAAAADUludGVybmFsRXJyb3IAAAAAAAABAAAAAAAAABdBbHJlYWR5SW5pdGlhbGl6ZWRFcnJvcgAAAAADAAAAAAAAABFVbmF1dGhvcml6ZWRFcnJvcgAAAAAAAAQAAAAAAAAAE05lZ2F0aXZlQW1vdW50RXJyb3IAAAAACAAAAAAAAAAMQmFsYW5jZUVycm9yAAAACgAAAAAAAAANT3ZlcmZsb3dFcnJvcgAAAAAAAAwAAAAAAAAACkJhZFJlcXVlc3QAAAAABLAAAAAAAAAAE0ludmFsaWRQb29sSW5pdEFyZ3MAAAAEsQAAAAAAAAAWSW52YWxpZFJlc2VydmVNZXRhZGF0YQAAAAAEsgAAAAAAAAAPSW5pdE5vdFVubG9ja2VkAAAABLMAAAAAAAAAEFN0YXR1c05vdEFsbG93ZWQAAAS0AAAAAAAAAAlJbnZhbGlkSGYAAAAAAAS1AAAAAAAAABFJbnZhbGlkUG9vbFN0YXR1cwAAAAAABLYAAAAAAAAAD0ludmFsaWRVdGlsUmF0ZQAAAAS3AAAAAAAAABRNYXhQb3NpdGlvbnNFeGNlZWRlZAAABLgAAAAAAAAAF0ludGVybmFsUmVzZXJ2ZU5vdEZvdW5kAAAABLkAAAAAAAAAClN0YWxlUHJpY2UAAAAABLoAAAAAAAAAEkludmFsaWRMaXF1aWRhdGlvbgAAAAAEuwAAAAAAAAARQXVjdGlvbkluUHJvZ3Jlc3MAAAAAAAS8AAAAAAAAABJJbnZhbGlkTGlxVG9vTGFyZ2UAAAAABL0AAAAAAAAAEkludmFsaWRMaXFUb29TbWFsbAAAAAAEvgAAAAAAAAAQSW50ZXJlc3RUb29TbWFsbAAABL8=',
      'AAAAAQAAACdBIHJlcXVlc3QgYSB1c2VyIG1ha2VzIGFnYWluc3QgdGhlIHBvb2wAAAAAAAAAAAdSZXF1ZXN0AAAAAAMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAxyZXF1ZXN0X3R5cGUAAAAE',
      'AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAADQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAACGNfZmFjdG9yAAAABAAAAAAAAAAGZF9yYXRlAAAAAAALAAAAAAAAAAhkX3N1cHBseQAAAAsAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAGaXJfbW9kAAAAAAALAAAAAAAAAAhsX2ZhY3RvcgAAAAQAAAAAAAAACWxhc3RfdGltZQAAAAAAAAYAAAAAAAAACG1heF91dGlsAAAABAAAAAAAAAAGc2NhbGFyAAAAAAAL',
      'AAAAAQAAAE1BIHVzZXIgLyBjb250cmFjdHMgcG9zaXRpb24ncyB3aXRoIHRoZSBwb29sLCBzdG9yZWQgaW4gdGhlIFJlc2VydmUncyBkZWNpbWFscwAAAAAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAwAAAAAAAAAKY29sbGF0ZXJhbAAAAAAD7AAAAAQAAAALAAAAAAAAAAtsaWFiaWxpdGllcwAAAAPsAAAABAAAAAsAAAAAAAAABnN1cHBseQAAAAAD7AAAAAQAAAAL',
      'AAAAAQAAABFUaGUgcG9vbCdzIGNvbmZpZwAAAAAAAAAAAAAKUG9vbENvbmZpZwAAAAAABAAAAAAAAAAKYnN0b3BfcmF0ZQAAAAAABAAAAAAAAAANbWF4X3Bvc2l0aW9ucwAAAAAAAAQAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAAE',
      'AAAAAQAAABpUaGUgcG9vbCdzIGVtaXNzaW9uIGNvbmZpZwAAAAAAAAAAABJQb29sRW1pc3Npb25Db25maWcAAAAAAAIAAAAAAAAABmNvbmZpZwAAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
      'AAAAAQAAADNUaGUgY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc2VydmUgYXNzZXQAAAAAAAAAAA1SZXNlcnZlQ29uZmlnAAAAAAAACgAAAAAAAAAIY19mYWN0b3IAAAAEAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAIbF9mYWN0b3IAAAAEAAAAAAAAAAhtYXhfdXRpbAAAAAQAAAAAAAAABXJfb25lAAAAAAAABAAAAAAAAAAHcl90aHJlZQAAAAAEAAAAAAAAAAVyX3R3bwAAAAAAAAQAAAAAAAAACnJlYWN0aXZpdHkAAAAAAAQAAAAAAAAABHV0aWwAAAAE',
      'AAAAAQAAAAAAAAAAAAAAEVF1ZXVlZFJlc2VydmVJbml0AAAAAAAAAgAAAAAAAAAKbmV3X2NvbmZpZwAAAAAH0AAAAA1SZXNlcnZlQ29uZmlnAAAAAAAAAAAAAAt1bmxvY2tfdGltZQAAAAAG',
      'AAAAAQAAABxUaGUgZGF0YSBmb3IgYSByZXNlcnZlIGFzc2V0AAAAAAAAAAtSZXNlcnZlRGF0YQAAAAAHAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAABmRfcmF0ZQAAAAAACwAAAAAAAAAIZF9zdXBwbHkAAAALAAAAAAAAAAZpcl9tb2QAAAAAAAsAAAAAAAAACWxhc3RfdGltZQAAAAAAAAY=',
      'AAAAAQAAAIFUaGUgY29uZmlndXJhdGlvbiBvZiBlbWlzc2lvbnMgZm9yIHRoZSByZXNlcnZlIGIgb3IgZCB0b2tlbgoKYEBkZXZgIElmIHRoaXMgaXMgdXBkYXRlZCwgUmVzZXJ2ZUVtaXNzaW9uc0RhdGEgTVVTVCBhbHNvIGJlIHVwZGF0ZWQAAAAAAAAAAAAAFlJlc2VydmVFbWlzc2lvbnNDb25maWcAAAAAAAIAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAG',
      'AAAAAQAAAC5UaGUgZW1pc3Npb24gZGF0YSBmb3IgdGhlIHJlc2VydmUgYiBvciBkIHRva2VuAAAAAAAAAAAAFFJlc2VydmVFbWlzc2lvbnNEYXRhAAAAAgAAAAAAAAAFaW5kZXgAAAAAAAALAAAAAAAAAAlsYXN0X3RpbWUAAAAAAAAG',
      'AAAAAQAAADNUaGUgdXNlciBlbWlzc2lvbiBkYXRhIGZvciB0aGUgcmVzZXJ2ZSBiIG9yIGQgdG9rZW4AAAAAAAAAABBVc2VyRW1pc3Npb25EYXRhAAAAAgAAAAAAAAAHYWNjcnVlZAAAAAALAAAAAAAAAAVpbmRleAAAAAAAAAs=',
      'AAAAAQAAAAAAAAAAAAAADlVzZXJSZXNlcnZlS2V5AAAAAAACAAAAAAAAAApyZXNlcnZlX2lkAAAAAAAEAAAAAAAAAAR1c2VyAAAAEw==',
      'AAAAAQAAAAAAAAAAAAAACkF1Y3Rpb25LZXkAAAAAAAIAAAAAAAAACWF1Y3RfdHlwZQAAAAAAAAQAAAAAAAAABHVzZXIAAAAT',
      'AAAAAgAAAAAAAAAAAAAAC1Bvb2xEYXRhS2V5AAAAAAkAAAABAAAAAAAAAAlSZXNDb25maWcAAAAAAAABAAAAEwAAAAEAAAAAAAAAB1Jlc0luaXQAAAAAAQAAABMAAAABAAAAAAAAAAdSZXNEYXRhAAAAAAEAAAATAAAAAQAAAAAAAAAKRW1pc0NvbmZpZwAAAAAAAQAAAAQAAAABAAAAAAAAAAhFbWlzRGF0YQAAAAEAAAAEAAAAAQAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAQAAABMAAAABAAAAAAAAAAhVc2VyRW1pcwAAAAEAAAfQAAAADlVzZXJSZXNlcnZlS2V5AAAAAAABAAAAAAAAAAdBdWN0aW9uAAAAAAEAAAfQAAAACkF1Y3Rpb25LZXkAAAAAAAEAAAAAAAAACEF1Y3REYXRhAAAAAQAAABM=',
      'AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==',
      'AAAAAgAAAApBc3NldCB0eXBlAAAAAAAAAAAABUFzc2V0AAAAAAAAAgAAAAEAAAAAAAAAB1N0ZWxsYXIAAAAAAQAAABMAAAABAAAAAAAAAAVPdGhlcgAAAAAAAAEAAAAR',
    ]);
  }

  async initialize(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: PoolInitializeArgs
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('initialize', ...this.spec.funcArgsToScVals('initialize', contractArgs))
    );
  }

  async setAdmin(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    new_admin: Address | string
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('set_admin', ...this.spec.funcArgsToScVals('set_admin', { new_admin }))
    );
  }

  async updatePool(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: UpdatePoolArgs
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('update_pool', ...this.spec.funcArgsToScVals('update_pool', contractArgs))
    );
  }

  async queueSetReserve(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: SetReserveArgs
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'queue_set_reserve',
        ...this.spec.funcArgsToScVals('queue_set_reserve', contractArgs)
      )
    );
  }

  async cancelSetReserve(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    asset: Address | string
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'cancel_set_reserve',
        ...this.spec.funcArgsToScVals('cancel_set_reserve', { asset })
      )
    );
  }

  async setReserve(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    asset: Address | string
  ): Promise<ContractResult<u32>> {
    return await invokeOperation<u32>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): u32 | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('set_reserve', value);
      },
      this.contract.call('set_reserve', ...this.spec.funcArgsToScVals('set_reserve', { asset }))
    );
  }

  async submit(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: SubmitArgs
  ): Promise<ContractResult<Positions>> {
    return await invokeOperation<Positions>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): Positions | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('submit', value);
      },
      this.contract.call('submit', ...this.spec.funcArgsToScVals('submit', contractArgs))
    );
  }

  async badDebt(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    user: Address | string
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('bad_debt', ...this.spec.funcArgsToScVals('bad_debt', { user }))
    );
  }

  async updateStatus(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions
  ): Promise<ContractResult<u32>> {
    return await invokeOperation<u32>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): u32 | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('update_status', value);
      },
      this.contract.call('update_status', ...this.spec.funcArgsToScVals('update_status', {}))
    );
  }

  async setStatus(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    pool_status: u32
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('set_status', ...this.spec.funcArgsToScVals('set_status', { pool_status }))
    );
  }

  async gulpEmissions(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions
  ): Promise<ContractResult<i128>> {
    return await invokeOperation<i128>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): i128 | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('gulp_emissions', value);
      },
      this.contract.call('gulp_emissions', ...this.spec.funcArgsToScVals('gulp_emissions', {}))
    );
  }

  async setEmissionsConfig(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    res_emission_metadata: Array<ReserveEmissionMetadata>
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'set_emissions_config',
        ...this.spec.funcArgsToScVals('set_emissions_config', { res_emission_metadata })
      )
    );
  }

  async claim(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: PoolClaimArgs
  ): Promise<ContractResult<i128>> {
    return await invokeOperation<i128>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): i128 | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('claim', value);
      },
      this.contract.call('claim', ...this.spec.funcArgsToScVals('claim', contractArgs))
    );
  }

  async newLiquidationAuction(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: NewLiqudiationAuctionArgs
  ): Promise<ContractResult<AuctionData>> {
    return await invokeOperation<AuctionData>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): AuctionData | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('new_liquidation_auction', value);
      },
      this.contract.call(
        'new_liquidation_auction',
        ...this.spec.funcArgsToScVals('new_liquidation_auction', contractArgs)
      )
    );
  }

  async delLiquidationAuction(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    user: Address | string
  ): Promise<ContractResult<AuctionData>> {
    return await invokeOperation<AuctionData>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'del_liquidation_auction',
        ...this.spec.funcArgsToScVals('del_liquidation_auction', { user })
      )
    );
  }

  async newAuction(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    auction_type: u32
  ): Promise<ContractResult<AuctionData>> {
    return await invokeOperation<AuctionData>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): AuctionData | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('new_auction', value);
      },
      this.contract.call(
        'new_auction',
        ...this.spec.funcArgsToScVals('new_auction', { auction_type })
      )
    );
  }
}
