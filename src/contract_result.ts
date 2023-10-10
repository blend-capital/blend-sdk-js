import { SorobanRpc } from 'soroban-client';
import { SorobanResponse } from './index.js';

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
   * Create a ContractResult from a SorobanResponse.
   *
   * @param hash - The hash of the transaction.
   * @param response - The Soroban RPC response.
   * @param parse - The XDR parsing function to unwrap the result.
   * @returns - A ContractResult containing the result of the response.
   */
  static fromResponse<T>(
    hash: string,
    response: SorobanResponse,
    parse: (value: string | undefined) => T | undefined
  ): ContractResult<T> {
    // response is a SimulateTransactionResponse
    if ('id' in response) {
      const simulated = response as SorobanRpc.SimulateTransactionResponse;
      if (SorobanRpc.isSimulationSuccess(simulated)) {
        const xdr_str = simulated.result?.retval.toXDR('base64');
        return ContractResult.success<T>(hash, parse(xdr_str));
      } else if (SorobanRpc.isSimulationError(simulated)) {
        return ContractResult.error(hash, new Error(simulated.error));
      } else {
        return ContractResult.error(
          hash,
          new Error(`invalid simulation: no result in ${simulated}`)
        );
      }
    }

    // response is a GetTransactionResponse
    if ('resultXdr' in response) {
      // if `sendTx` awaited the inclusion of the tx in the ledger, it used
      // `getTransaction`, which has a `resultXdr` field
      const getResult = response as SorobanRpc.GetTransactionResponse;
      if (getResult.status === SorobanRpc.GetTransactionStatus.SUCCESS) {
        const xdr_str = getResult.returnValue?.toXDR('base64');
        return ContractResult.success<T>(hash, parse(xdr_str));
      } else {
        return ContractResult.error(hash, new Error(`Transaction failed: ${getResult}`));
      }
    }

    // otherwise, it returned the result of `sendTransaction`
    if ('errorResultXdr' in response) {
      const sendResult = response as SorobanRpc.SendTransactionResponse;
      return ContractResult.error(
        hash,
        new Error(`Failed to send transaction: ${sendResult.errorResultXdr}`)
      );
    }

    // if neither of these are present, something went wrong
    return ContractResult.error(hash, new Error(`Unable to parse response: ${response}`));
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
