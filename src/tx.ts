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
    return ContractResult.fromResponse(tx.hash().toString('hex'), simulation_resp, parse);
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
  return ContractResult.fromResponse(tx_hash, response, parse);
}
