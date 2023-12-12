import { Address, Contract, ContractSpec } from 'stellar-sdk';
import { ContractResult, Network, TxOptions } from '../index.js';
import { invokeOperation } from '../tx.js';

// @dev ENCODING REQUIRES PROPERTY NAMES TO MATCH RUST NAMES

export interface EmitterInitializeArgs {
  blnd_token: Address | string;
  backstop: Address | string;
  backstop_token: Address | string;
}

export interface QueueSwapBackstopArgs {
  new_backstop: Address | string;
  new_backstop_token: Address | string;
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
      'AAAAAQAAAAAAAAAAAAAABFN3YXAAAAADAAAAAAAAAAxuZXdfYmFja3N0b3AAAAATAAAAAAAAABJuZXdfYmFja3N0b3BfdG9rZW4AAAAAABMAAAAAAAAAC3VubG9ja190aW1lAAAAAAY=',
      'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAwAAAAAAAAAKYmxuZF90b2tlbgAAAAAAEwAAAAAAAAAIYmFja3N0b3AAAAATAAAAAAAAAA5iYWNrc3RvcF90b2tlbgAAAAAAEwAAAAA=',
      'AAAAAAAAAAAAAAAKZGlzdHJpYnV0ZQAAAAAAAAAAAAEAAAAL',
      'AAAAAAAAAAAAAAAPZ2V0X2xhc3RfZGlzdHJvAAAAAAEAAAAAAAAAC2JhY2tzdG9wX2lkAAAAABMAAAABAAAABg==',
      'AAAAAAAAAAAAAAAMZ2V0X2JhY2tzdG9wAAAAAAAAAAEAAAAT',
      'AAAAAAAAAAAAAAATcXVldWVfc3dhcF9iYWNrc3RvcAAAAAACAAAAAAAAAAxuZXdfYmFja3N0b3AAAAATAAAAAAAAABJuZXdfYmFja3N0b3BfdG9rZW4AAAAAABMAAAAA',
      'AAAAAAAAAAAAAAAPZ2V0X3F1ZXVlZF9zd2FwAAAAAAAAAAABAAAD6AAAB9AAAAAEU3dhcA==',
      'AAAAAAAAAAAAAAAUY2FuY2VsX3N3YXBfYmFja3N0b3AAAAAAAAAAAA==',
      'AAAAAAAAAAAAAAANc3dhcF9iYWNrc3RvcAAAAAAAAAAAAAAA',
      'AAAAAAAAAAAAAAAEZHJvcAAAAAEAAAAAAAAABGxpc3QAAAPsAAAAEwAAAAsAAAAA',
      'AAAABAAAAAAAAAAAAAAADEVtaXR0ZXJFcnJvcgAAAAgAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAACgAAAAAAAAANTm90QXV0aG9yaXplZAAAAAAAABQAAAAAAAAAGEluc3VmZmljaWVudEJhY2tzdG9wU2l6ZQAAAB4AAAAAAAAAB0JhZERyb3AAAAAAKAAAAAAAAAANU3dhcE5vdFF1ZXVlZAAAAAAAADIAAAAAAAAAEVN3YXBBbHJlYWR5RXhpc3RzAAAAAAAAPAAAAAAAAAAPU3dhcE5vdFVubG9ja2VkAAAAAEYAAAAAAAAAFFN3YXBDYW5ub3RCZUNhbmNlbGVkAAAAUA==',
      'AAAAAgAAAAAAAAAAAAAADkVtaXR0ZXJEYXRhS2V5AAAAAAACAAAAAQAAAAAAAAAKTGFzdERpc3RybwAAAAAAAQAAABMAAAABAAAAAAAAAAdEcm9wcGVkAAAAAAEAAAAT',
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

  async queueSwapBackstop(
    source: string,
    sign: (txXdr: string) => Promise<string>,
    network: Network,
    txOptions: TxOptions,
    contractArgs: QueueSwapBackstopArgs
  ): Promise<ContractResult<undefined>> {
    return await invokeOperation<undefined>(
      source,
      sign,
      network,
      txOptions,
      () => undefined,
      this.contract.call(
        'queue_swap_backstop',
        ...this.spec.funcArgsToScVals('queue_swap_backstop', contractArgs)
      )
    );
  }

  async cancelSwapBackstop(
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
      this.contract.call(
        'cancel_swap_backstop',
        ...this.spec.funcArgsToScVals('cancel_swap_backstop', {})
      )
    );
  }

  async swapBackstop(
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
      this.contract.call('swap_backstop', ...this.spec.funcArgsToScVals('swap_backstop', {}))
    );
  }
}
