import {
  Account,
  BASE_FEE,
  rpc,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Network } from './index.js';

export async function simulateAndParse<T>(
  network: Network,
  operation: string,
  parser: (result: string) => T
): Promise<{ result: T; latestLedger: number }> {
  const stellarRpc = new rpc.Server(network.rpc, network.opts);
  const account = new Account('GDMVSPSKEUOTRFSJH2SXVUNB2JGORKDTWBMOP5OZJZP4GKRQUQWFJO4Y', '123');
  const txBuilder = new TransactionBuilder(account, {
    networkPassphrase: network.passphrase,
    fee: BASE_FEE,
    timebounds: { maxTime: TimeoutInfinite, minTime: 0 },
  }).addOperation(xdr.Operation.fromXDR(operation, 'base64'));
  const transaction = txBuilder.build();
  const simulation = await stellarRpc.simulateTransaction(transaction);
  if (rpc.Api.isSimulationSuccess(simulation) && simulation.result.retval) {
    return {
      result: parser(simulation.result.retval.toXDR('base64')),
      latestLedger: simulation.latestLedger,
    };
  }
}
