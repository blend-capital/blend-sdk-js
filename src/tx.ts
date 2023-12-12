import { SorobanRpc, Transaction, TransactionBuilder, xdr } from 'stellar-sdk';
import { ContractResult, Network, Resources, SorobanResponse, TxOptions } from './index.js';

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
  const rpc = new SorobanRpc.Server(network.rpc, network.opts);
  const source_account = await rpc.getAccount(source);
  const tx_builder = new TransactionBuilder(source_account, txOptions.builderOptions);
  tx_builder.addOperation(operation);
  const tx = tx_builder.build();

  // simulate the TX
  const simulation_resp = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simulation_resp)) {
    // No resource estimation available from a simulation error. Allow the response formatter
    // to fetch the error.
    const empty_resources = new Resources(0, 0, 0, 0, 0, 0, 0);
    return ContractResult.fromResponse(
      tx.hash().toString('hex'),
      empty_resources,
      simulation_resp,
      parse
    );
  } else if (txOptions.sim) {
    // Only simulate the TX. Assemble the TX to borrow the resource estimation algorithm in
    // `assembleTransaction` and return the simulation results.
    const prepped_tx = SorobanRpc.assembleTransaction(tx, simulation_resp).build();
    const resources = Resources.fromTransaction(prepped_tx.toXDR());
    return ContractResult.fromResponse(
      prepped_tx.hash().toString('hex'),
      resources,
      simulation_resp,
      parse
    );
  }

  // assemble and sign the TX
  // TODO: Patch this once simulation for brand new accounts is working
  const txResources = simulation_resp.transactionData.build().resources();
  simulation_resp.minResourceFee = (Number(simulation_resp.minResourceFee) + 100000).toString();
  const sim_tx_data = simulation_resp.transactionData
    .setResources(
      txResources.instructions() == 0 ? 0 : txResources.instructions() + 100000,
      txResources.readBytes() + 500,
      txResources.writeBytes() + 200
    )
    .build();
  const assemble_tx = SorobanRpc.assembleTransaction(tx, simulation_resp);
  sim_tx_data.resourceFee(
    xdr.Int64.fromString((Number(sim_tx_data.resourceFee().toString()) + 50000).toString())
  );
  const prepped_tx_xdr = assemble_tx.setSorobanData(sim_tx_data).build().toXDR();
  const signed_xdr_string = await sign(prepped_tx_xdr);
  const signed_tx = new Transaction(signed_xdr_string, network.passphrase);
  const tx_hash = signed_tx.hash().toString('hex');
  const resources = Resources.fromTransaction(prepped_tx_xdr);

  // submit the TX
  let response: SorobanResponse = await rpc.sendTransaction(signed_tx);
  let status: string = response.status;
  // Poll this until the status is not "NOT_FOUND"
  const pollingStartTime = Date.now();
  while (status === 'PENDING' || status === 'NOT_FOUND') {
    if (pollingStartTime + txOptions.timeout < Date.now()) {
      return ContractResult.error(
        tx_hash,
        resources,
        new Error(`Transaction timed out with status ${status}`)
      );
    }
    await new Promise((resolve) => setTimeout(resolve, txOptions.pollingInterval));
    // See if the transaction is complete
    response = await rpc.getTransaction(tx_hash);
    status = response.status;
  }
  return ContractResult.fromResponse(tx_hash, resources, response, parse);
}
