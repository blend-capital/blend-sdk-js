import { Memo, MemoType, Operation, SorobanRpc, Transaction, xdr } from 'stellar-sdk';
import {
  ContractError,
  ContractErrorType,
  TxError,
  RestoreError,
  parseError,
} from './contract_error.js';
export interface Result<T, E extends ContractError | TxError | RestoreError> {
  unwrap(): T;
  unwrapErr(): E;
  isOk(): boolean;
  isErr(): boolean;
}

export class Ok<T, E extends ContractError | TxError | RestoreError> implements Result<T, E> {
  constructor(readonly value: T) {}
  unwrapErr(): E {
    throw new Error('No error');
  }
  unwrap(): T {
    return this.value as T;
  }

  isOk(): boolean {
    return true;
  }

  isErr(): boolean {
    return !this.isOk();
  }
}

export class Err<E extends ContractError | TxError | RestoreError> implements Result<any, E> {
  constructor(readonly error: E) {}
  unwrapErr(): E {
    return this.error;
  }
  unwrap(): never {
    throw new Error(this.error.message);
  }

  isOk(): boolean {
    return false;
  }

  isErr(): boolean {
    return !this.isOk();
  }
}

export class ContractResponse<T> {
  result: Result<T, ContractError | RestoreError | TxError>;
  hash: string;

  private constructor(result?: Result<T, ContractError | RestoreError | TxError>) {
    if (result) {
      this.result = result;
    }
  }
  static fromSimulationResponse<T>(
    simulation: SorobanRpc.Api.SimulateTransactionResponse,
    transaction: Transaction<Memo<MemoType>, Operation[]> | string,
    network_passphrase: string,
    parser: (xdr: string) => T
  ): ContractResponse<T> {
    let response = new ContractResponse<T>();
    if (typeof transaction === 'string') {
      transaction = new Transaction(transaction, network_passphrase);
    }
    response.hash = transaction.hash().toString('hex');

    if (SorobanRpc.Api.isSimulationError(simulation)) {
      response.result = new Err(parseError(simulation));
    } else if (SorobanRpc.Api.isSimulationRestore(simulation)) {
      response.result = new Err(new RestoreError(simulation.restorePreamble));
    } else {
      if (!simulation.result) {
        response.result = new Ok(undefined as T);
      } else {
        response.result = new Ok(parser(simulation.result.retval.toXDR('base64')));
      }
    }
    return response;
  }

  static fromTransactionResponse<T>(
    txResponse: SorobanRpc.Api.GetTransactionResponse,
    transaction: Transaction<Memo<MemoType>, Operation[]> | string,
    network_passphrase: string,
    parser: (xdr: string) => T
  ): ContractResponse<T> {
    let response = new ContractResponse<T>();
    if (typeof transaction === 'string') {
      transaction = new Transaction(transaction, network_passphrase);
    }
    response.hash = transaction.hash().toString('hex');

    if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      // getTransactionResponse has a `returnValue` field unless it failed
      if ('returnValue' in txResponse) {
        response.result = new Ok(parser(txResponse.returnValue?.toXDR('base64')));
      }
      // if "returnValue" not present, the transaction failed; return without parsing the result
      else {
        response.result = new Ok(undefined as T);
      }
    } else if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
      response.result = new Err(new ContractError(ContractErrorType.UnknownError));
    } else {
      response.result = new Err(parseError(txResponse.resultXdr));
    }
    return response;
  }
}
