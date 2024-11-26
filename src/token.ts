//! Utilities for interacting with token contracts

import {
  Account,
  Address,
  Asset,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Network } from './index.js';
import { decodeEntryKey } from './ledger_entry_helper.js';

/**
 * TokenMetadata contains information about a token
 *
 * @property name - The name of the token
 * @property symbol - The symbol of the token
 * @property decimals - The number of decimals the token uses
 * @property asset - The Stellar Asset if the token is a Stellar Asset Contract, undefined otherwise
 */
export class TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  asset: Asset | undefined;

  constructor(name: string, symbol: string, decimals: number, asset: Asset | undefined) {
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals;
    this.asset = asset;
  }

  /**
   * Create the ledgerKey for the token contract instance
   * @param assetId - The contractId for the asset
   * @returns The ledgerKey for the contract instance
   */
  static ledgerKey(assetId: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(assetId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  /**
   * Create a TokenMetadata object from the XDR LedgerEntryData
   * @param ledger_entry_data - A XDR LedgerEntryData object or it's base64 string representation
   */
  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): TokenMetadata {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }
    const instance_val = ledger_entry_data.contractData().val().instance();
    let name: string | undefined;
    let symbol: string | undefined;
    let decimal: number | undefined;
    instance_val.storage()?.map((entry) => {
      const key = decodeEntryKey(entry.key());
      if (key == 'METADATA') {
        entry
          .val()
          .map()
          ?.forEach((meta_entry) => {
            const metadataKey = decodeEntryKey(meta_entry.key());
            switch (metadataKey) {
              case 'name':
                name = scValToNative(meta_entry.val());
                return;
              case 'symbol':
                symbol = scValToNative(meta_entry.val());
                if (symbol == 'native') {
                  symbol = 'XLM';
                }
                return;
              case 'decimal':
                decimal = scValToNative(meta_entry.val());
                return;
            }
          });
      }
    });

    if (name == undefined || symbol == undefined || decimal == undefined) {
      throw Error('Token metadata malformed');
    }

    let asset: Asset | undefined;
    if (
      instance_val.executable().toXDR().toString() ==
        xdr.ContractExecutable.contractExecutableStellarAsset().toXDR().toString() &&
      name
    ) {
      if (name == 'native') {
        asset = Asset.native();
      } else {
        const code_issuer = name.split(':');
        asset = new Asset(code_issuer[0], code_issuer[1]);
      }
    }

    return new TokenMetadata(name, symbol, decimal, asset);
  }
}

/**
 * Fetch the token balance for a given address
 *
 * @param network - The Network to use
 * @param token_id - The token contract address
 * @param address - The address to fetch the balance for
 * @returns - The balance
 */
export async function getTokenBalance(
  network: Network,
  token_id: string,
  address: Address
): Promise<bigint> {
  // account does not get validated during simulateTx
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: network.passphrase,
  });
  tx_builder.addOperation(new Contract(token_id).call('balance', address.toScVal()));
  const stellarRpc = new rpc.Server(network.rpc, network.opts);
  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result)) {
    const val = scValToNative(scval_result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
}
