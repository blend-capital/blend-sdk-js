import { Buffer } from 'buffer';
import { Horizon, SorobanRpc, TransactionBuilder } from 'stellar-sdk';

export * from './backstop/index.js';
export * from './emitter/index.js';
export * from './pool/index.js';
export * from './pool_factory/index.js';

export * from './contract_result.js';
export { Emissions } from './emissions.js';
export { TokenMetadata } from './token.js';
export * from './tx.js';

export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type Option<T> = T | undefined;

export type SorobanResponse =
  | SorobanRpc.Api.SimulateTransactionResponse
  | SorobanRpc.Api.SendTransactionResponse
  | SorobanRpc.Api.GetTransactionResponse;

export interface Network {
  rpc: string;
  passphrase: string;
  maxConcurrentRequests?: number;
  opts?: Horizon.Server.Options;
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
