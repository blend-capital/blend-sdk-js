import {
  Account,
  Address,
  Contract,
  rpc,
  scValToNative,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Network } from './index.js';

const REFLECTOR_ORACLE_ADDRESSES = [
  'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
  'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
  'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
];

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

export function addReflectorEntries(tx: Transaction): Transaction {
  if (tx.toEnvelope().switch() !== xdr.EnvelopeType.envelopeTypeTx()) {
    return tx;
  }

  const sorobanData = tx.toEnvelope().v1().tx().ext().sorobanData();
  const readEntries = sorobanData.resources().footprint().readOnly();
  const readWriteEntries = sorobanData.resources().footprint().readWrite();

  const newReadEntries = [];
  for (const entry of readEntries) {
    if (readWriteEntries.length + readEntries.length + newReadEntries.length > 100) {
      break;
    }

    switch (entry.switch()) {
      case xdr.LedgerEntryType.contractData(): {
        const contractData = entry.contractData();
        const address = Address.fromScAddress(contractData.contract()).toString();

        if (REFLECTOR_ORACLE_ADDRESSES.includes(address)) {
          switch (contractData.key().switch()) {
            case xdr.ScValType.scvU128(): {
              const u128Key = contractData.key().u128();
              const roundTimestamp = u128Key.hi().toBigInt();
              const index = u128Key.lo().toBigInt();

              const newRoundTimestamp = roundTimestamp + 300_000n;

              newReadEntries.push(
                xdr.LedgerKey.contractData(
                  new xdr.LedgerKeyContractData({
                    contract: contractData.contract(),
                    key: xdr.ScVal.scvU128(
                      new xdr.UInt128Parts({
                        hi: xdr.Uint64.fromString(newRoundTimestamp.toString()),
                        lo: xdr.Uint64.fromString(index.toString()),
                      })
                    ),
                    durability: xdr.ContractDataDurability.temporary(),
                  })
                )
              );
            }
          }
        }
        break;
      }
    }
  }

  sorobanData
    .resources()
    .footprint()
    .readOnly([...readEntries, ...newReadEntries]);
  const newTx = TransactionBuilder.cloneFrom(tx, {
    sorobanData: sorobanData,
    fee: tx.fee,
  }).build();

  return newTx;
}
