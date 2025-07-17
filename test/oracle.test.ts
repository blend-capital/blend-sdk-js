import { TransactionBuilder, xdr, Networks, Address, Transaction } from '@stellar/stellar-sdk';
import { addReflectorEntries } from '../src/oracle';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Copied from src/oracle.ts
const REFLECTOR_ORACLE_ADDRESSES = [
  'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
  'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
  'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
];

describe('addReflectorEntries', () => {
  let baseTransaction: Transaction;
  // the pool contract used in the base transaction
  const NON_ORACLE_CONTRACT_ADDRESS = 'CCCCIQSDILITHMM7PBSLVDT5MISSY7R26MNZXCX4H7J5JQ5FPIYOGYFS';

  beforeEach(() => {
    // Load the base transaction from XDR
    // This XDR is a sample with all price entries removed. Only the CALI instance entry remains.
    baseTransaction = new Transaction(
      xdr.TransactionEnvelope.fromXDR(
        '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',
        'base64'
      ),
      Networks.PUBLIC
    );
  });

  function createReflectorEntry(index: number, timestamp: bigint, oracle: string): xdr.LedgerKey {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(oracle).toScAddress(),
        key: xdr.ScVal.scvU128(
          new xdr.UInt128Parts({
            hi: xdr.Uint64.fromString(timestamp.toString()),
            lo: xdr.Uint64.fromString(index.toString()),
          })
        ),
        durability: xdr.ContractDataDurability.temporary(),
      })
    );
  }

  function appendEntriesToTx(baseTx: Transaction, readOnly: xdr.LedgerKey[], readWrite: xdr.LedgerKey[], extraReadBytes: number = 0): Transaction {
    const sorobanData = baseTx.toEnvelope().v1().tx().ext().sorobanData();
    const footprint = sorobanData.resources().footprint();

    // Append new read-only and read-write entries
    footprint.readOnly([...footprint.readOnly(), ...readOnly]);
    footprint.readWrite([...footprint.readWrite(), ...readWrite]);

    if (extraReadBytes > 0 ) {
      const curReadBytes = sorobanData.resources().diskReadBytes();
      sorobanData.resources().diskReadBytes(curReadBytes + extraReadBytes);
    }

    // Clone and build the transaction
    return TransactionBuilder.cloneFrom(baseTx, {
      sorobanData: sorobanData,
      fee: baseTx.fee,
    }).build();
  }

  it('should process a transaction with no reflector entries unchanged', () => {
    const result = addReflectorEntries(baseTransaction.toXDR());

    // We expect no changes to the transaction
    expect(result).toEqual(baseTransaction.toXDR());
  });

  it('should add future timestamp entries for each reflector oracle entry', () => {
    const mockTimestamp = Date.now();
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    const extraROEntries: xdr.LedgerKey[] = [
      createReflectorEntry(0, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(1, currRoundTimestamp, NON_ORACLE_CONTRACT_ADDRESS),
      createReflectorEntry(3, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
    ];
    const textTx = appendEntriesToTx(baseTransaction, extraROEntries, []);
    const resultTx = addReflectorEntries(textTx.toXDR());

    const nextRoundTimestamp = currRoundTimestamp + 300_000n;
    const expectedExtraROEntries: xdr.LedgerKey[] = [
      ...extraROEntries,
      createReflectorEntry(0, nextRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(3, nextRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
    ];
    const expectedTx = appendEntriesToTx(baseTransaction, expectedExtraROEntries, [], 100 * 2);

    expect(resultTx).toEqual(expectedTx.toXDR());
  });

  it('should respect the 100 entry limit', () => {
    const mockTimestamp = Date.now();
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    const baseFootprint = baseTransaction.toEnvelope().v1().tx().ext().sorobanData().resources().footprint();
    const baseEntryCount = baseFootprint.readOnly().length + baseFootprint.readWrite().length;

    const extraROEntries: xdr.LedgerKey[] = [
      createReflectorEntry(0, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(1, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(3, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(2, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(0, currRoundTimestamp - 300_000n, NON_ORACLE_CONTRACT_ADDRESS),
      createReflectorEntry(0, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(1, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
    ];

    // leave space for only 3 new reflector entries
    const entriesToAdd = 97 - baseEntryCount - extraROEntries.length;
    const extraRWEntries: xdr.LedgerKey[] = [];
    for (let i = 0; i < entriesToAdd; i++) {
      extraRWEntries.push(
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(
              NON_ORACLE_CONTRACT_ADDRESS
            ).toScAddress(),
            key: xdr.ScVal.scvU32(i),
            durability: xdr.ContractDataDurability.temporary(),
          })
        )
      );
    }

    const textTx = appendEntriesToTx(baseTransaction, extraROEntries, extraRWEntries);
    const resultTx = addReflectorEntries(textTx.toXDR());

    const nextRoundTimestamp = currRoundTimestamp + 300_000n;
    // due to seeing oracle 0 first, the expected addition entries will be:
    // - index 0, nextRoundTimestamp, oracle 0
    // - index 3, nextRoundTimestamp, oracle 0
    // - index 1, nextRoundTimestamp, oracle 1
    // -> limit hit
    const expectedExtraROEntries: xdr.LedgerKey[] = [
      ...extraROEntries,
      createReflectorEntry(0, nextRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(3, nextRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(1, nextRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[1]),
    ];
    const expectedTx = appendEntriesToTx(baseTransaction, expectedExtraROEntries, extraRWEntries, 100 * 3);


    const resultFootprint = expectedTx.toEnvelope().v1().tx().ext().sorobanData().resources().footprint();
    const totalEntries = resultFootprint.readOnly().length + resultFootprint.readWrite().length;
    expect(totalEntries).toBeLessThanOrEqual(100);
    expect(resultTx).toEqual(expectedTx.toXDR());
  });

  it('should skip entries with non-U128 key types', () => {
    const mockTimestamp = Date.now();
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    const extraROEntries: xdr.LedgerKey[] = [
      createReflectorEntry(2, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[2]),
    ];
    // Add some reflector entries with non-U128 keys
    for (let i = 0; i < 3; i++) {
      extraROEntries.push(
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(REFLECTOR_ORACLE_ADDRESSES[2]).toScAddress(),
            key: xdr.ScVal.scvSymbol('not_u128_' + i),
            durability: xdr.ContractDataDurability.temporary(),
          })
        )
      );
    }

    const textTx = appendEntriesToTx(baseTransaction, extraROEntries, []);
    const resultTx = addReflectorEntries(textTx.toXDR());

    const nextRoundTimestamp = currRoundTimestamp + 300_000n;
    const expectedExtraROEntries: xdr.LedgerKey[] = [
      ...extraROEntries,
      createReflectorEntry(2, nextRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[2]),
    ];
    const expectedTx = appendEntriesToTx(baseTransaction, expectedExtraROEntries, [], 100);

    expect(resultTx).toEqual(expectedTx.toXDR());
  });

  it('should handle multiple reflector oracle addresses', () => {
    const mockTimestamp = Date.now();
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    const extraROEntries: xdr.LedgerKey[] = [
      createReflectorEntry(0, currRoundTimestamp - 600_000n, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(0, currRoundTimestamp - 600_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(0, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(0, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(0, currRoundTimestamp, NON_ORACLE_CONTRACT_ADDRESS),
      createReflectorEntry(0, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[1]),
    ];
    const textTx = appendEntriesToTx(baseTransaction, extraROEntries, []);

    const resultTx = addReflectorEntries(textTx.toXDR());

    // oracle 0 stops the round before currRoundTimestamp
    const expectedExtraROEntries: xdr.LedgerKey[] = [
      ...extraROEntries,
      createReflectorEntry(0, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(0, currRoundTimestamp + 300_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
    ];
    const expectedTx = appendEntriesToTx(baseTransaction, expectedExtraROEntries, [], 100 * 2);

    expect(resultTx).toEqual(expectedTx.toXDR());
  });

  it('should only add entries for the most current unique oracle-index pair', () => {
    const mockTimestamp = Date.now();
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    // Create 5 entries:
    // 1. Index 0, Oracle 1 with current round timestamp (should add new entry)
    // 2. Index 0, Oracle 1 with previous round timestamp (should NOT add new entry)
    // 3. Index 1, Oracle 1 with previous round timestamp (should add new entry)
    // 4. Index 0, Oracle 0 with future round timestamp (should add new entry)
    // 5. Index 0, Oracle 0 with previous round timestamp (should NOT add new entry)
    const extraROEntries: xdr.LedgerKey[] = [
      createReflectorEntry(0, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(0, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(1, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(0, currRoundTimestamp + 300_000n, REFLECTOR_ORACLE_ADDRESSES[0]),
      createReflectorEntry(0, currRoundTimestamp - 300_000n, REFLECTOR_ORACLE_ADDRESSES[0]),
    ];
    const textTx = appendEntriesToTx(baseTransaction, extraROEntries, []);

    const resultTx = addReflectorEntries(textTx.toXDR());

    const expectedExtraROEntries: xdr.LedgerKey[] = [
      ...extraROEntries,
      createReflectorEntry(0, currRoundTimestamp + 300_000n, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(1, currRoundTimestamp, REFLECTOR_ORACLE_ADDRESSES[1]),
      createReflectorEntry(0, currRoundTimestamp + 600_000n, REFLECTOR_ORACLE_ADDRESSES[0]),
    ];
    const expectedTx = appendEntriesToTx(baseTransaction, expectedExtraROEntries, [], 100 * 3);

    expect(resultTx).toEqual(expectedTx.toXDR());
  });
});
