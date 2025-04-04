import {
  Account,
  Address,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Network } from './index.js';

export interface PriceData {
  price: bigint;
  timestamp: number;
}

export async function getOraclePrice(
  network: Network,
  oracle_id: string,
  token_id: string
): Promise<PriceData> {
  // account does not get validated during simulateTx
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: network.passphrase,
  });
  const asset = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Stellar'),
    Address.fromString(token_id).toScVal(),
  ]);
  tx_builder.addOperation(new Contract(oracle_id).call('lastprice', asset));
  const stellar_rpc = new rpc.Server(network.rpc, network.opts);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(result)) {
    const xdr_str = result.result?.retval.toXDR('base64');
    if (xdr_str) {
      const price_result = xdr.ScVal.fromXDR(xdr_str, 'base64')?.value();
      if (price_result) {
        return {
          // eslint-disable-next-line
          // @ts-ignore
          price: scValToNative(price_result[0]?.val()),
          timestamp: Number(scValToNative(price_result[1]?.val())),
        };
      }
    }
    throw new Error('Unable to decode oracle price result');
  } else {
    throw new Error(`Failed to fetch oralce price: ${result.error}`);
  }
}

export async function getOracleDecimals(
  network: Network,
  oracle_id: string
): Promise<{ decimals: number; latestLedger: number }> {
  // account does not get validated during simulateTx
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: network.passphrase,
  });
  tx_builder.addOperation(new Contract(oracle_id).call('decimals'));
  const stellar_rpc = new rpc.Server(network.rpc, network.opts);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(result)) {
    const val = scValToNative(result.result.retval);
    return {
      decimals: val,
      latestLedger: result.latestLedger,
    };
  } else {
    throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
  }
}
