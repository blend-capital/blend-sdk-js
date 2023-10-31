import { Address, Contract, ContractSpec } from 'soroban-client';
import { ContractResult, Network, TxOptions } from '../index.js';
import { invokeOperation } from '../tx.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface EmitterInitializeArgs {
  backstop: Address | string;
  blnd_token_id: Address | string;
}

export class EmitterClient {
  address: string;
  private contract: Contract;
  spec: ContractSpec;

  constructor(address: string) {
    this.address = address;
    this.contract = new Contract(address);
    // @dev: Generated from soroban-cli Typescript bindings
    this.spec = new ContractSpec([
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAgAAAAAAAAAIYmFja3N0b3AAAAATAAAAAAAAAA1ibG5kX3Rva2VuX2lkAAAAAAAAEwAAAAA=',
      'AAAAAAAAAAAAAAAKZGlzdHJpYnV0ZQAAAAAAAAAAAAEAAAAL',
      'AAAAAAAAAAAAAAAMZ2V0X2JhY2tzdG9wAAAAAAAAAAEAAAAT',
      'AAAAAAAAAAAAAAANc3dhcF9iYWNrc3RvcAAAAAAAAAEAAAAAAAAAD25ld19iYWNrc3RvcF9pZAAAAAATAAAAAA==',
      'AAAAAAAAAAAAAAAEZHJvcAAAAAAAAAAA',
      'AAAABAAAAAAAAAAAAAAADEVtaXR0ZXJFcnJvcgAAAAQAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAACgAAAAAAAAANTm90QXV0aG9yaXplZAAAAAAAABQAAAAAAAAAGEluc3VmZmljaWVudEJhY2tzdG9wU2l6ZQAAAB4AAAAAAAAAB0JhZERyb3AAAAAAKA==',
      'AAAAAgAAAAAAAAAAAAAADkVtaXR0ZXJEYXRhS2V5AAAAAAAGAAAAAAAAAAAAAAAIQmFja3N0b3AAAAAAAAAALlRPRE86IERlbGV0ZSBhZnRlciBhZGRyZXNzIDwtPiBieXRlc04gc3VwcG9ydCwAAAAAAAdCc3RvcElkAAAAAAAAAAAAAAAAB0JsZW5kSWQAAAAAAAAAAAAAAAAJQmxlbmRMUElkAAAAAAAAAAAAAAAAAAAKTGFzdERpc3RybwAAAAAAAAAAAAAAAAAKRHJvcFN0YXR1cwAA',
    ]);
  }

  async initialize(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: EmitterInitializeArgs
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

  async distribute(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('distribute', ...this.spec.funcArgsToScVals('distribute', {}))
    );
  }

  async swapBackstop(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    new_backstop_id: Address | string
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'swap_backstop',
        ...this.spec.funcArgsToScVals('swap_backstop', { new_backstop_id })
      )
    );
  }

  async drop(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    new_backstop_id: Address | string
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call('drop', ...this.spec.funcArgsToScVals('drop', { new_backstop_id }))
    );
  }
}
