import { Address, Contract, ContractSpec, xdr } from 'soroban-client';
import { ContractResult, Network, TxOptions, i128, u32, u64 } from '..';
import { ReserveEmissionMetadata, ReserveConfig, Request, AuctionData, Positions } from '.';
import { invokeOperation } from '../tx';

export interface SubmitArgs {
  from: Address | string;
  spender: Address | string;
  to: Address | string;
  requests: Array<Request>;
}

export interface InitializeArgs {
  admin: Address | string;
  name: string;
  oracle: Address | string;
  bstop_rate: u64;
  backstop_id: Address | string;
  blnd_id: Address | string;
  usdc_id: Address | string;
}

export interface UpdateReserveArgs {
  asset: Address | string;
  config: ReserveConfig;
}

export interface ClaimArgs {
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
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARuYW1lAAAAEQAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAApic3RvcF9yYXRlAAAAAAAGAAAAAAAAAAtiYWNrc3RvcF9pZAAAAAATAAAAAAAAAAdibG5kX2lkAAAAABMAAAAAAAAAB3VzZGNfaWQAAAAAEwAAAAA=',
      'AAAAAAAAAAAAAAALdXBkYXRlX3Bvb2wAAAAAAQAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAGAAAAAA==',
      'AAAAAAAAAAAAAAAMaW5pdF9yZXNlcnZlAAAAAgAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZjb25maWcAAAAAB9AAAAANUmVzZXJ2ZUNvbmZpZwAAAAAAAAA=',
      'AAAAAAAAAAAAAAAOdXBkYXRlX3Jlc2VydmUAAAAAAAIAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAAGY29uZmlnAAAAAAfQAAAADVJlc2VydmVDb25maWcAAAAAAAAA',
      'AAAAAAAAAAAAAAASZ2V0X3Jlc2VydmVfY29uZmlnAAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABMAAAABAAAH0AAAAA1SZXNlcnZlQ29uZmlnAAAA',
      'AAAAAAAAAAAAAAAQZ2V0X3Jlc2VydmVfZGF0YQAAAAEAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAEAAAfQAAAAC1Jlc2VydmVEYXRhAA==',
      'AAAAAAAAAAAAAAANZ2V0X3Bvc2l0aW9ucwAAAAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAEAAAfQAAAACVBvc2l0aW9ucwAAAA==',
      'AAAAAAAAAAAAAAAGc3VibWl0AAAAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAIcmVxdWVzdHMAAAPqAAAH0AAAAAdSZXF1ZXN0AAAAAAEAAAfQAAAACVBvc2l0aW9ucwAAAA==',
      'AAAAAAAAAAAAAAAIYmFkX2RlYnQAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAA=',
      'AAAAAAAAAAAAAAANdXBkYXRlX3N0YXR1cwAAAAAAAAAAAAABAAAABA==',
      'AAAAAAAAAAAAAAAKc2V0X3N0YXR1cwAAAAAAAQAAAAAAAAALcG9vbF9zdGF0dXMAAAAABAAAAAA=',
      'AAAAAAAAAAAAAAAPZ2V0X3Bvb2xfY29uZmlnAAAAAAAAAAABAAAH0AAAAApQb29sQ29uZmlnAAA=',
      'AAAAAAAAAAAAAAAUZ2V0X2VtaXNzaW9uc19jb25maWcAAAAAAAAAAQAAA+wAAAAEAAAABg==',
      'AAAAAAAAAAAAAAAQdXBkYXRlX2VtaXNzaW9ucwAAAAAAAAABAAAABg==',
      'AAAAAAAAAAAAAAAUc2V0X2VtaXNzaW9uc19jb25maWcAAAABAAAAAAAAABVyZXNfZW1pc3Npb25fbWV0YWRhdGEAAAAAAAPqAAAH0AAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAAA',
      'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAARcmVzZXJ2ZV90b2tlbl9pZHMAAAAAAAPqAAAABAAAAAAAAAACdG8AAAAAABMAAAABAAAACw==',
      'AAAAAAAAAAAAAAAVZ2V0X3Jlc2VydmVfZW1pc3Npb25zAAAAAAAAAgAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAp0b2tlbl90eXBlAAAAAAAEAAAAAQAAA+gAAAPtAAAAAgAAB9AAAAAWUmVzZXJ2ZUVtaXNzaW9uc0NvbmZpZwAAAAAH0AAAABRSZXNlcnZlRW1pc3Npb25zRGF0YQ==',
      'AAAAAAAAAAAAAAAXbmV3X2xpcXVpZGF0aW9uX2F1Y3Rpb24AAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAAEnBlcmNlbnRfbGlxdWlkYXRlZAAAAAAABgAAAAEAAAfQAAAAC0F1Y3Rpb25EYXRhAA==',
      'AAAAAAAAAAAAAAAXZGVsX2xpcXVpZGF0aW9uX2F1Y3Rpb24AAAAAAQAAAAAAAAAEdXNlcgAAABMAAAAA',
      'AAAAAAAAAAAAAAALZ2V0X2F1Y3Rpb24AAAAAAgAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAAAAAAEdXNlcgAAABMAAAABAAAH0AAAAAtBdWN0aW9uRGF0YQA=',
      'AAAAAAAAAAAAAAALbmV3X2F1Y3Rpb24AAAAAAQAAAAAAAAAMYXVjdGlvbl90eXBlAAAABAAAAAEAAAfQAAAAC0F1Y3Rpb25EYXRhAA==',
      'AAAAAQAAADRNZXRhZGF0YSBmb3IgYSBwb29sJ3MgcmVzZXJ2ZSBlbWlzc2lvbiBjb25maWd1cmF0aW9uAAAAAAAAABdSZXNlcnZlRW1pc3Npb25NZXRhZGF0YQAAAAADAAAAAAAAAAlyZXNfaW5kZXgAAAAAAAAEAAAAAAAAAAhyZXNfdHlwZQAAAAQAAAAAAAAABXNoYXJlAAAAAAAABg==',
      'AAAABAAAAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAABMAAAAAAAAADU5vdEF1dGhvcml6ZWQAAAAAAAABAAAAAAAAAApCYWRSZXF1ZXN0AAAAAAACAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAMAAAAAAAAADk5lZ2F0aXZlQW1vdW50AAAAAAAEAAAAAAAAABNJbnZhbGlkUG9vbEluaXRBcmdzAAAAAAUAAAAAAAAAFkludmFsaWRSZXNlcnZlTWV0YWRhdGEAAAAAAAYAAAAAAAAACUludmFsaWRIZgAAAAAAAAoAAAAAAAAAEUludmFsaWRQb29sU3RhdHVzAAAAAAAACwAAAAAAAAAPSW52YWxpZFV0aWxSYXRlAAAAAAwAAAAAAAAAD0VtaXNzaW9uRmFpbHVyZQAAAAAUAAAAAAAAAApTdGFsZVByaWNlAAAAAAAeAAAAAAAAABJJbnZhbGlkTGlxdWlkYXRpb24AAAAAAGQAAAAAAAAACkludmFsaWRMb3QAAAAAAGUAAAAAAAAAC0ludmFsaWRCaWRzAAAAAGYAAAAAAAAAEUF1Y3Rpb25JblByb2dyZXNzAAAAAAAAZwAAAAAAAAASSW52YWxpZEF1Y3Rpb25UeXBlAAAAAABoAAAAAAAAABJJbnZhbGlkTGlxVG9vTGFyZ2UAAAAAAGkAAAAAAAAAEkludmFsaWRMaXFUb29TbWFsbAAAAAAAagAAAAAAAAAQSW50ZXJlc3RUb29TbWFsbAAAAGs=',
      'AAAAAQAAAChBbiByZXF1ZXN0IGEgdXNlciBtYWtlcyBhZ2FpbnN0IHRoZSBwb29sAAAAAAAAAAdSZXF1ZXN0AAAAAAMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAxyZXF1ZXN0X3R5cGUAAAAE',
      'AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAADQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAACGNfZmFjdG9yAAAABAAAAAAAAAAGZF9yYXRlAAAAAAALAAAAAAAAAAhkX3N1cHBseQAAAAsAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAGaXJfbW9kAAAAAAALAAAAAAAAAAhsX2ZhY3RvcgAAAAQAAAAAAAAACWxhc3RfdGltZQAAAAAAAAYAAAAAAAAACG1heF91dGlsAAAABAAAAAAAAAAGc2NhbGFyAAAAAAAL',
      'AAAAAQAAAE1BIHVzZXIgLyBjb250cmFjdHMgcG9zaXRpb24ncyB3aXRoIHRoZSBwb29sLCBzdG9yZWQgaW4gdGhlIFJlc2VydmUncyBkZWNpbWFscwAAAAAAAAAAAAAJUG9zaXRpb25zAAAAAAAAAwAAAAAAAAAKY29sbGF0ZXJhbAAAAAAD7AAAAAQAAAALAAAAAAAAAAtsaWFiaWxpdGllcwAAAAPsAAAABAAAAAsAAAAAAAAABnN1cHBseQAAAAAD7AAAAAQAAAAL',
      'AAAAAQAAABFUaGUgcG9vbCdzIGNvbmZpZwAAAAAAAAAAAAAKUG9vbENvbmZpZwAAAAAAAwAAAAAAAAAKYnN0b3BfcmF0ZQAAAAAABgAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAAAQ=',
      'AAAAAQAAABpUaGUgcG9vbCdzIGVtaXNzaW9uIGNvbmZpZwAAAAAAAAAAABJQb29sRW1pc3Npb25Db25maWcAAAAAAAIAAAAAAAAABmNvbmZpZwAAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
      'AAAAAQAAADNUaGUgY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc2VydmUgYXNzZXQAAAAAAAAAAA1SZXNlcnZlQ29uZmlnAAAAAAAACgAAAAAAAAAIY19mYWN0b3IAAAAEAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAAIbF9mYWN0b3IAAAAEAAAAAAAAAAhtYXhfdXRpbAAAAAQAAAAAAAAABXJfb25lAAAAAAAABAAAAAAAAAAHcl90aHJlZQAAAAAEAAAAAAAAAAVyX3R3bwAAAAAAAAQAAAAAAAAACnJlYWN0aXZpdHkAAAAAAAQAAAAAAAAABHV0aWwAAAAE',
      'AAAAAQAAABxUaGUgZGF0YSBmb3IgYSByZXNlcnZlIGFzc2V0AAAAAAAAAAtSZXNlcnZlRGF0YQAAAAAHAAAAAAAAAAZiX3JhdGUAAAAAAAsAAAAAAAAACGJfc3VwcGx5AAAACwAAAAAAAAAPYmFja3N0b3BfY3JlZGl0AAAAAAsAAAAAAAAABmRfcmF0ZQAAAAAACwAAAAAAAAAIZF9zdXBwbHkAAAALAAAAAAAAAAZpcl9tb2QAAAAAAAsAAAAAAAAACWxhc3RfdGltZQAAAAAAAAY=',
      'AAAAAQAAAIFUaGUgY29uZmlndXJhdGlvbiBvZiBlbWlzc2lvbnMgZm9yIHRoZSByZXNlcnZlIGIgb3IgZCB0b2tlbgoKYEBkZXZgIElmIHRoaXMgaXMgdXBkYXRlZCwgUmVzZXJ2ZUVtaXNzaW9uc0RhdGEgTVVTVCBhbHNvIGJlIHVwZGF0ZWQAAAAAAAAAAAAAFlJlc2VydmVFbWlzc2lvbnNDb25maWcAAAAAAAIAAAAAAAAAA2VwcwAAAAAGAAAAAAAAAApleHBpcmF0aW9uAAAAAAAG',
      'AAAAAQAAAC5UaGUgZW1pc3Npb24gZGF0YSBmb3IgdGhlIHJlc2VydmUgYiBvciBkIHRva2VuAAAAAAAAAAAAFFJlc2VydmVFbWlzc2lvbnNEYXRhAAAAAgAAAAAAAAAFaW5kZXgAAAAAAAALAAAAAAAAAAlsYXN0X3RpbWUAAAAAAAAG',
      'AAAAAQAAADNUaGUgdXNlciBlbWlzc2lvbiBkYXRhIGZvciB0aGUgcmVzZXJ2ZSBiIG9yIGQgdG9rZW4AAAAAAAAAABBVc2VyRW1pc3Npb25EYXRhAAAAAgAAAAAAAAAHYWNjcnVlZAAAAAALAAAAAAAAAAVpbmRleAAAAAAAAAs=',
      'AAAAAQAAAAAAAAAAAAAADlVzZXJSZXNlcnZlS2V5AAAAAAACAAAAAAAAAApyZXNlcnZlX2lkAAAAAAAEAAAAAAAAAAR1c2VyAAAAEw==',
      'AAAAAQAAAAAAAAAAAAAACkF1Y3Rpb25LZXkAAAAAAAIAAAAAAAAACWF1Y3RfdHlwZQAAAAAAAAQAAAAAAAAABHVzZXIAAAAT',
      'AAAAAgAAAAAAAAAAAAAAC1Bvb2xEYXRhS2V5AAAAAAgAAAABAAAAAAAAAAlSZXNDb25maWcAAAAAAAABAAAAEwAAAAEAAAAAAAAAB1Jlc0RhdGEAAAAAAQAAABMAAAABAAAAAAAAAApFbWlzQ29uZmlnAAAAAAABAAAABAAAAAEAAAAAAAAACEVtaXNEYXRhAAAAAQAAAAQAAAABAAAAAAAAAAlQb3NpdGlvbnMAAAAAAAABAAAAEwAAAAEAAAAAAAAACFVzZXJFbWlzAAAAAQAAB9AAAAAOVXNlclJlc2VydmVLZXkAAAAAAAEAAAAAAAAAB0F1Y3Rpb24AAAAAAQAAB9AAAAAKQXVjdGlvbktleQAAAAAAAQAAAAAAAAAIQXVjdERhdGEAAAABAAAAEw==',
      'AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==',
    ]);
  }

  async initialize(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: InitializeArgs
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

  async updatePool(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    backstop_take_rate: u64
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'update_pool',
        ...this.spec.funcArgsToScVals('update_pool', { backstop_take_rate })
      )
    );
  }

  async initReserve(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: UpdateReserveArgs
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'init_reserve',
        ...this.spec.funcArgsToScVals('init_reserve', contractArgs)
      )
    );
  }

  async updateReserve(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: UpdateReserveArgs
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'update_reserve',
        ...this.spec.funcArgsToScVals('update_reserve', contractArgs)
      )
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

  async updateEmissions(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions
  ): Promise<ContractResult<u64>> {
    return await invokeOperation<u64>(
      source,
      sign,
      network,
      txOptions,
      (value: string | xdr.ScVal | undefined): u64 | undefined => {
        if (value == undefined) {
          return undefined;
        }
        return this.spec.funcResToNative('update_emissions', value);
      },
      this.contract.call('update_emissions', ...this.spec.funcArgsToScVals('update_emissions', {}))
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
    contractArgs: ClaimArgs
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
