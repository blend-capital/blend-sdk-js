import { Server, SorobanRpc, TransactionBuilder } from 'soroban-client';
import { Buffer } from 'buffer';

export * as Backstop from './backstop';
export * as Token from './token';
export * as Emitter from './emitter';
export * as Pool from './pool';
export * as PoolFactory from './pool_factory';
export * as Oracle from './oracle';

export * as scval_converter from './scval_converter';
export * as data_entry_converter from './data_entry_converter';

export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type Option<T> = T | undefined;

export class ContractResult<T> {
  hash: string;
  ok: boolean;
  value?: T;
  error?: Error;

  constructor(hash: string, ok: boolean, value?: T, error?: Error) {
    this.hash = hash;
    this.ok = ok;
    this.value = value;
    this.error = error;
  }

  /**
   * Create an Error ContractResult.
   * @param hash - The hash of the transaction.
   * @param error - The error
   * @returns - Contract Result
   */
  static error<T>(hash: string, error: Error): ContractResult<T> {
    return new ContractResult(hash, false, undefined, error);
  }

  /**
   * Create a Successful ContractResult.
   * @param hash - The hash of the transaction.
   * @param value - The return value, if any.
   * @returns - Contract Result
   */
  static success<T>(hash: string, value?: T): ContractResult<T> {
    return new ContractResult(hash, true, value, undefined);
  }

  /**
   * Unwrap a successful result, or throw an error.
   *
   * @returns The value of the result.
   */
  unwrap(): T {
    if (this.ok) {
      return this.value;
    } else if (this.error !== undefined) {
      throw this.error;
    } else {
      throw new Error('unable to unwrap ContractResult');
    }
  }

  toString(): string {
    if (this.ok) {
      return `Success: ${this.value}`;
    } else {
      return `Failure: ${this.error}`;
    }
  }
}

export type SorobanResponse =
  | SorobanRpc.SimulateTransactionResponse
  | SorobanRpc.SendTransactionResponse
  | SorobanRpc.GetTransactionResponse;

export interface Network {
  rpc: string;
  passphrase: string;
  opts?: Server.Options;
}

export interface TxOptions {
  sim: boolean;
  pollingInterval: number;
  timeout: number;
  builderOptions: TransactionBuilder.TransactionBuilderOptions;
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}
