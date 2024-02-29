import { Memo, MemoType, Operation, SorobanRpc, Transaction, xdr } from 'stellar-sdk';
import { ContractError, ContractErrorType, parseError } from './contract_error.js';
export interface Result<T, E extends ContractError> {
  unwrap(): T;
  unwrapErr(): E;
  isOk(): boolean;
  isErr(): boolean;
}

export class Ok<T, E extends ContractError> implements Result<T, E> {
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

export class Err<E extends ContractError = ContractError> implements Result<any, E> {
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
export class Resources {
  fee: number;
  refundableFee: number;
  cpuInst: number;
  readBytes: number;
  writeBytes: number;
  readOnlyEntries: number;
  readWriteEntries: number;

  constructor(
    fee: number,
    refundableFee: number,
    cpuInst: number,
    readBytes: number,
    writeBytes: number,
    readOnlyEntries: number,
    readWriteEntries: number
  ) {
    this.fee = fee;
    this.refundableFee = refundableFee;
    this.cpuInst = cpuInst;
    this.readBytes = readBytes;
    this.writeBytes = writeBytes;
    this.readOnlyEntries = readOnlyEntries;
    this.readWriteEntries = readWriteEntries;
  }

  /**
   * Builds a Resources object from TransactionEnvelope
   * @returns - Resources
   */
  static fromTransaction(tx: xdr.TransactionEnvelope | string): Resources {
    if (typeof tx === 'string') {
      tx = xdr.TransactionEnvelope.fromXDR(tx, 'base64');
    }
    const transaction = tx.v1().tx();
    const data = transaction.ext().sorobanData();
    const sorobanResources = data.resources();
    const footprint = sorobanResources.footprint();

    const fee = transaction.fee();
    const refundableFee = Number(data.resourceFee().toString());
    const cpuInst = sorobanResources.instructions();
    const readBytes = sorobanResources.readBytes();
    const writeBytes = sorobanResources.writeBytes();
    const readOnlyEntries = footprint.readOnly().length;
    const readWriteEntries = footprint.readWrite().length;

    return new Resources(
      fee,
      refundableFee,
      cpuInst,
      readBytes,
      writeBytes,
      readOnlyEntries,
      readWriteEntries
    );
  }
}

export class ContractResponse<T> {
  result: Result<T, ContractError>;
  hash: string;
  resources: Resources;

  private constructor(result?: Result<T, ContractError>) {
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
      response.resources = new Resources(0, 0, 0, 0, 0, 0, 0);
    } else if (SorobanRpc.Api.isSimulationRestore(simulation)) {
      response.result = new Err(
        new ContractError(ContractErrorType.InvokeHostFunctionEntryArchived)
      );
      response.resources = Resources.fromTransaction(transaction.toEnvelope());
    } else {
      if (!simulation.result) {
        response.result = new Err(new ContractError(ContractErrorType.UnknownError));
        response.resources = new Resources(0, 0, 0, 0, 0, 0, 0);
      } else {
        response.result = new Ok(parser(simulation.result.retval!.toXDR('base64')));
        response.resources = Resources.fromTransaction(transaction.toEnvelope());
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
    response.resources = Resources.fromTransaction(transaction.toEnvelope());
    response.hash = transaction.hash().toString('hex');

    if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      // getTransactionResponse has a `returnValue` field unless it failed
      if ('returnValue' in response) {
        response.result = new Ok(parser(txResponse.returnValue!.toXDR('base64')));
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
