import {
  Server,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  assembleTransaction,
  xdr,
} from 'soroban-client';
import { ContractResult, Network, SorobanResponse, TxOptions } from './index.js';

/**
 * Invoke a `InvokeHostFunction` operation against the Stellar network.
 *
 * @param source - The source of the transaction.
 * @param sign - The function for signing the transaction.
 * @param network - The network and rpc to invoke the transaction on.
 * @param txOptions - The options for the transaction.
 * @param parse - The function for parsing the result of the transaction.
 * @param operation - The invokeHostFunction operation to invoke.
 * @returns The result of the transaction as a ContractResult.
 */
export async function invokeOperation<T>(
  source: string,
  sign: (txXdr: string) => Promise<string>,
  network: Network,
  txOptions: TxOptions,
  parse: (value: string | xdr.ScVal | undefined) => T | undefined,
  operation: xdr.Operation
): Promise<ContractResult<T>> {
  // create TX
  const rpc = new Server(network.rpc, network.opts);
  const source_account = await rpc.getAccount(source);
  const tx_builder = new TransactionBuilder(source_account, txOptions.builderOptions);
  tx_builder.addOperation(operation);
  const tx = tx_builder.build();

  // sim TX
  const simulation_resp = await rpc.simulateTransaction(tx);
  if (txOptions.sim || SorobanRpc.isSimulationError(simulation_resp)) {
    // allow the response formatter to fetch the error or return the simulation results
    return responseToResult(tx.hash().toString('hex'), simulation_resp, parse);
  }

  // assemble and sign the TX
  const prepped_tx = assembleTransaction(tx, network.passphrase, simulation_resp).build();
  const signed_xdr_string = await sign(prepped_tx.toXDR());
  const signed_tx = new Transaction(signed_xdr_string, network.passphrase);
  const tx_hash = signed_tx.hash().toString('hex');

  // submit the TX
  let response: SorobanResponse = await rpc.sendTransaction(signed_tx);
  let status: string = response.status;
  // Poll this until the status is not "NOT_FOUND"
  const pollingStartTime = Date.now();
  while (status === 'PENDING' || status === 'NOT_FOUND') {
    if (pollingStartTime + txOptions.timeout < Date.now()) {
      return ContractResult.error(
        tx_hash,
        new Error(`Transaction timed out with status ${status}`)
      );
    }
    await new Promise((resolve) => setTimeout(resolve, txOptions.pollingInterval));
    // See if the transaction is complete
    response = await rpc.getTransaction(tx_hash);
    status = response.status;
  }
  return responseToResult(tx_hash, response, parse);
}

/**
 * Transforms a Soroban RPC response into a ContractResult.
 *
 * @param hash - The hash of the transaction.
 * @param response - The Soroban RPC response.
 * @param parseFn - The XDR parsing function to unwrap the result.
 * @returns - A ContractResult containing the result of the response.
 */
export function responseToResult<T>(
  hash: string,
  response: SorobanResponse,
  parse: (value: string | xdr.ScVal | undefined) => T | undefined
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
      return ContractResult.error(hash, new Error(`invalid simulation: no result in ${simulated}`));
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
