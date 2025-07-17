import {
  Account,
  Address,
  Contract,
  FeeBumpTransaction,
  Networks,
  rpc,
  scValToNative,
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
  /**
   * The price as a fixed point number with the oracle's decimals.
   */
  price: bigint;
  /**
   * The timestamp of the price in seconds
   */
  timestamp: number;
}

/**
 * Fetch the `lastprice` from an oracle contract for the given token.
 * @param network - The network to use
 * @param oracle_id - The oracle contract ID
 * @param token_id - The token contract ID to fetch the price for
 * @returns The PriceData
 * @throws Will throw an error if `None` is returned or if the simulation fails.
 */
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

/**
 * Fetch the `decimals` from an oracle contract.
 * @param network - The network to use
 * @param oracle_id - The oracle contract ID
 * @returns The decimals and latest ledger number
 * @throws Will throw an error if the simulation fails.
 */
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
    console.log(`DECIMALS: Decimals value: ${val}`);
    return {
      decimals: val,
      latestLedger: result.latestLedger,
    };
  } else {
    throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
  }
}

/**
 * Add future Reflector oracle entries to the read-only footprint of a transaction.
 * This ensures that if a future oracle round occurs before the transaction is executed,
 * the future oracle round will still be included in the footprint.
 * 
 * This only works for Reflector based oracles as it makes assumptions based on how the 
 * oracle contracts keys are structured.
 * 
 * If more than 100 entries are added to the read-only footprint, it will stop adding. The priority
 * is given to the oracle contracts seen first, and the indexes for the contract that are seen first.
 * 
 * @param tx - The transaction XDR to add the reflector entries to.
 * @returns A base-64 transaction XDR string with the reflector entries added to the read-only footprint.
 */
export function addReflectorEntries(txXdr: string): string {
  // network passphrase not relevant as TX XDR is returned, which
  // does not include a network passphrase.
  const tx = TransactionBuilder.fromXDR(txXdr, Networks.PUBLIC);
  if (tx instanceof FeeBumpTransaction) {
    return tx.toXDR();
  }

  const sorobanData = tx.toEnvelope().v1().tx().ext().sorobanData();
  const readEntries = sorobanData.resources().footprint().readOnly();
  const readWriteEntries = sorobanData.resources().footprint().readWrite();
  let bytes_read = sorobanData.resources().diskReadBytes();
  // Key: the reflector oracle contract address
  // Value: a map of index to the most recent timestamp for that index
  const mostRecentEntries: Map<string, Map<bigint, bigint>> = new Map();
  const newReadEntries = [];
  for (const entry of readEntries) {
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
              if (
                !mostRecentEntries.has(Address.fromScAddress(contractData.contract()).toString())
              ) {
                mostRecentEntries.set(
                  Address.fromScAddress(contractData.contract()).toString(),
                  new Map()
                );
              }
              const contractEntries = mostRecentEntries.get(
                Address.fromScAddress(contractData.contract()).toString()
              );

              if (contractEntries.has(index)) {
                const mostRecentTimestamp = contractEntries.get(index);
                if (mostRecentTimestamp < roundTimestamp) {
                  contractEntries.set(index, roundTimestamp);
                }
              } else {
                contractEntries.set(index, roundTimestamp);
              }
            }
          }
        }
        break;
      }
    }
  }

  for (const [contract, entries] of mostRecentEntries.entries()) {
    for (const [index, roundTimestamp] of entries.entries()) {
      if (readWriteEntries.length + readEntries.length + newReadEntries.length + 1 > 100) {
        break;
      }
      // Create a new entry for the reflector oracle
      const newRoundTimestamp = roundTimestamp + 300_000n;
      newReadEntries.push(
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(contract).toScAddress(),
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
      // Reading the additional ledger key+entry adds 96 bytes to the bytes_read count.
      // Add 100 bytes to be safe.
      bytes_read += 100;
    }
  }

  sorobanData
    .resources()
    .footprint()
    .readOnly([...readEntries, ...newReadEntries]);
  sorobanData.resources().diskReadBytes(bytes_read);
  return TransactionBuilder.cloneFrom(tx, {
    sorobanData: sorobanData,
    fee: tx.fee,
  }).build().toXDR();
}
