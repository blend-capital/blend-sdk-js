import { Horizon } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

export * from './backstop/index.js';
export * from './emitter/index.js';
export * from './pool/index.js';
export * from './pool_factory/index.js';

export * from './base_event.js';
export * from './emissions.js';
export * as FixedMath from './math.js';
export * from './oracle.js';
export * from './response_parser.js';
export { TokenMetadata } from './token.js';

export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type Option<T> = T | undefined;

export const I128MAX = BigInt('170141183460469231731687303715884105727');

export enum Version {
  V1 = 'v1',
  V2 = 'v2',
}

export interface Network {
  rpc: string;
  passphrase: string;
  maxConcurrentRequests?: number;
  opts?: Horizon.Server.Options;
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}
