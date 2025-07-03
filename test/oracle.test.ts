import { TransactionBuilder, xdr, Networks, Address, Transaction } from '@stellar/stellar-sdk';
import { addReflectorEntries } from '../src/oracle';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the REFLECTOR_ORACLE_ADDRESSES constant
jest.mock('../src/oracle', () => {
  const originalModule = jest.requireActual('../src/oracle');
  return {
    ...originalModule,
    REFLECTOR_ORACLE_ADDRESSES: [
      'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
      'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
      'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
    ],
    addReflectorEntries: originalModule.addReflectorEntries,
  };
});

describe('addReflectorEntries', () => {
  let baseTransaction: Transaction;

  beforeEach(() => {
    // Load the base transaction from XDR
    baseTransaction = new Transaction(
      xdr.TransactionEnvelope.fromXDR(
        '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',
        'base64'
      ),
      Networks.PUBLIC
    );
    const sorobanData = baseTransaction.toEnvelope().v1().tx().ext().sorobanData();
    sorobanData.resources().footprint().readOnly([]); // Clear any existing read-only entries
    sorobanData.resources().footprint().readWrite([]); // Clear any existing read-write entries
    baseTransaction = TransactionBuilder.cloneFrom(baseTransaction, {
      sorobanData: sorobanData,
      fee: baseTransaction.fee,
    }).build();
  });

  // Helper to add reflector oracle entries to the transaction
  function addReflectorOracleEntries(
    tx: Transaction,
    count: number,
    timestamp = 1000000n
  ): Transaction {
    // Get the resources from the transaction
    const sorobanData = tx.toEnvelope().v1().tx().ext().sorobanData();
    const footprint = sorobanData.resources().footprint();

    // Create new read entries with the reflector oracle address
    const reflectorAddress = 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC';
    const existingReadOnly = footprint.readOnly();

    // Add new entries for testing
    const newEntries: xdr.LedgerKey[] = [];
    for (let i = 0; i < count; i++) {
      newEntries.push(
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(reflectorAddress).toScAddress(),
            key: xdr.ScVal.scvU128(
              new xdr.UInt128Parts({
                hi: xdr.Uint64.fromString(timestamp.toString()),
                lo: xdr.Uint64.fromString(BigInt(i).toString()),
              })
            ),
            durability: xdr.ContractDataDurability.temporary(),
          })
        )
      );
    }

    // Set the new read-only entries
    footprint.readOnly([...existingReadOnly, ...newEntries]);

    // Clone and build the transaction
    const newTx = TransactionBuilder.cloneFrom(tx, {
      sorobanData: sorobanData,
      fee: tx.fee,
    }).build();

    return newTx;
  }

  it('should process a transaction with no reflector entries unchanged', () => {
    // Act
    const result = addReflectorEntries(baseTransaction);

    // Assert
    // We expect no new entries in the result since the base transaction has no reflector entries
    const origFootprint = baseTransaction
      .toEnvelope()
      .v1()
      .tx()
      .ext()
      .sorobanData()
      .resources()
      .footprint();
    const resultFootprint = result
      .toEnvelope()
      .v1()
      .tx()
      .ext()
      .sorobanData()
      .resources()
      .footprint();

    expect(resultFootprint.readOnly().length).toBe(origFootprint.readOnly().length);
  });

  it('should add future timestamp entries for each reflector oracle entry', () => {
    // Arrange
    const realDateNow = Date.now;
    const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    try {
      // Mock Date.now to return our fixed timestamp
      global.Date.now = jest.fn(() => mockTimestamp);
      const count = 3;
      const txWithReflectors = addReflectorOracleEntries(
        baseTransaction,
        count,
        currRoundTimestamp
      );

      // Act
      const result = addReflectorEntries(txWithReflectors);

      // Assert
      const resultFootprint = result
        .toEnvelope()
        .v1()
        .tx()
        .ext()
        .sorobanData()
        .resources()
        .footprint();

      // Original entries plus one new entry for each reflector entry
      expect(resultFootprint.readOnly().length).toBe(
        txWithReflectors
          .toEnvelope()
          .v1()
          .tx()
          .ext()
          .sorobanData()
          .resources()
          .footprint()
          .readOnly().length + count
      );

      // Check that the new entries have future timestamps (original + 300,000)
      let foundFutureEntries = 0;
      for (const entry of resultFootprint.readOnly()) {
        if (entry.switch() === xdr.LedgerEntryType.contractData()) {
          const contractData = entry.contractData();
          const address = Address.fromScAddress(contractData.contract()).toString();

          if (
            address === 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC' &&
            contractData.key().switch() === xdr.ScValType.scvU128()
          ) {
            const u128Key = contractData.key().u128();
            const entryTimestamp = u128Key.hi().toBigInt();

            if (entryTimestamp === currRoundTimestamp + 300_000n) {
              foundFutureEntries++;
            }
          }
        }
      }

      expect(foundFutureEntries).toBe(count);
    } finally {
      // Restore the original Date.now
      global.Date.now = realDateNow;
    }
  });

  it('should respect the 100 entry limit', () => {
    // Arrange - create a transaction with many entries
    const realDateNow = Date.now;
    const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    try {
      // Mock Date.now to return our fixed timestamp
      global.Date.now = jest.fn(() => mockTimestamp);
      const reflectorCount = 40; // 40 reflector entries
      const txWithReflectors = addReflectorOracleEntries(
        baseTransaction,
        reflectorCount,
        currRoundTimestamp
      );

      // We need to ensure we approach but don't exceed 100 total entries
      // To do this, let's add a bunch of read/write entries too
      const sorobanData = txWithReflectors.toEnvelope().v1().tx().ext().sorobanData();
      const footprint = sorobanData.resources().footprint();

      // Add 55 read-write entries to push us near the limit
      const rwEntries: xdr.LedgerKey[] = [];
      for (let i = 0; i < 55; i++) {
        rwEntries.push(
          xdr.LedgerKey.contractData(
            new xdr.LedgerKeyContractData({
              contract: Address.fromString(
                'GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4'
              ).toScAddress(),
              key: xdr.ScVal.scvU32(i),
              durability: xdr.ContractDataDurability.temporary(),
            })
          )
        );
      }
      footprint.readWrite(rwEntries);

      const txNearLimit = TransactionBuilder.cloneFrom(txWithReflectors, {
        sorobanData: sorobanData,
        fee: txWithReflectors.fee,
      }).build();

      // Act
      const result = addReflectorEntries(txNearLimit);

      // Assert
      const resultFootprint = result
        .toEnvelope()
        .v1()
        .tx()
        .ext()
        .sorobanData()
        .resources()
        .footprint();
      const totalEntries = resultFootprint.readOnly().length + resultFootprint.readWrite().length;

      // We should have some new reflector entries, but not all
      expect(totalEntries).toBeLessThanOrEqual(100);
      expect(resultFootprint.readOnly().length).toBeGreaterThan(
        txNearLimit.toEnvelope().v1().tx().ext().sorobanData().resources().footprint().readOnly()
          .length
      );
      // But we shouldn't have added all possible reflector entries
      expect(resultFootprint.readOnly().length).toBeLessThan(
        txNearLimit.toEnvelope().v1().tx().ext().sorobanData().resources().footprint().readOnly()
          .length + reflectorCount
      );
    } finally {
      // Restore the original Date.now
      global.Date.now = realDateNow;
    }
  });

  it('should skip non-reflector oracle addresses', () => {
    // Arrange
    // Add entries for a non-reflector address
    const sorobanData = baseTransaction.toEnvelope().v1().tx().ext().sorobanData();
    const footprint = sorobanData.resources().footprint();

    const nonReflectorAddress = 'GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4';
    const origReadEntries = footprint.readOnly();

    // Add some non-reflector entries with the same structure
    const newEntries: xdr.LedgerKey[] = [];
    for (let i = 0; i < 3; i++) {
      newEntries.push(
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(nonReflectorAddress).toScAddress(),
            key: xdr.ScVal.scvU128(
              new xdr.UInt128Parts({
                hi: xdr.Uint64.fromString('1000000'),
                lo: xdr.Uint64.fromString(i.toString()),
              })
            ),
            durability: xdr.ContractDataDurability.temporary(),
          })
        )
      );
    }

    footprint.readOnly([...origReadEntries, ...newEntries]);

    const txWithNonReflectors = TransactionBuilder.cloneFrom(baseTransaction, {
      sorobanData: sorobanData,
      fee: baseTransaction.fee,
    }).build();

    // Act
    const result = addReflectorEntries(txWithNonReflectors);

    // Assert
    const resultFootprint = result
      .toEnvelope()
      .v1()
      .tx()
      .ext()
      .sorobanData()
      .resources()
      .footprint();

    // No new entries should be added since these aren't reflector oracle addresses
    expect(resultFootprint.readOnly().length).toBe(
      txWithNonReflectors
        .toEnvelope()
        .v1()
        .tx()
        .ext()
        .sorobanData()
        .resources()
        .footprint()
        .readOnly().length
    );
  });

  it('should skip entries with non-U128 key types', () => {
    // Arrange
    const reflectorAddress = 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC';
    const sorobanData = baseTransaction.toEnvelope().v1().tx().ext().sorobanData();
    const footprint = sorobanData.resources().footprint();

    const origReadEntries = footprint.readOnly();

    // Add some reflector entries with non-U128 keys
    const newEntries: xdr.LedgerKey[] = [];
    for (let i = 0; i < 3; i++) {
      newEntries.push(
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(reflectorAddress).toScAddress(),
            key: xdr.ScVal.scvSymbol('not_u128_' + i),
            durability: xdr.ContractDataDurability.temporary(),
          })
        )
      );
    }

    footprint.readOnly([...origReadEntries, ...newEntries]);

    const txWithNonU128Keys = TransactionBuilder.cloneFrom(baseTransaction, {
      sorobanData: sorobanData,
      fee: baseTransaction.fee,
    }).build();

    // Act
    const result = addReflectorEntries(txWithNonU128Keys);

    // Assert
    const resultFootprint = result
      .toEnvelope()
      .v1()
      .tx()
      .ext()
      .sorobanData()
      .resources()
      .footprint();

    // No new entries should be added since these don't have U128 keys
    expect(resultFootprint.readOnly().length).toBe(
      txWithNonU128Keys
        .toEnvelope()
        .v1()
        .tx()
        .ext()
        .sorobanData()
        .resources()
        .footprint()
        .readOnly().length
    );
  });

  it('should handle multiple reflector oracle addresses', () => {
    // Arrange
    const realDateNow = Date.now;
    const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    try {
      // Mock Date.now to return our fixed timestamp
      global.Date.now = jest.fn(() => mockTimestamp);

      const sorobanData = baseTransaction.toEnvelope().v1().tx().ext().sorobanData();
      const footprint = sorobanData.resources().footprint();

      const origReadEntries = footprint.readOnly();

      // Add entries for multiple reflector addresses
      const reflectorAddresses = [
        'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
        'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
      ];

      const newEntries: xdr.LedgerKey[] = [];
      for (let i = 0; i < reflectorAddresses.length; i++) {
        newEntries.push(
          xdr.LedgerKey.contractData(
            new xdr.LedgerKeyContractData({
              contract: Address.fromString(reflectorAddresses[i]).toScAddress(),
              key: xdr.ScVal.scvU128(
                new xdr.UInt128Parts({
                  hi: xdr.Uint64.fromString(currRoundTimestamp.toString()),
                  lo: xdr.Uint64.fromString(BigInt(i).toString()),
                })
              ),
              durability: xdr.ContractDataDurability.temporary(),
            })
          )
        );
      }

      footprint.readOnly([...origReadEntries, ...newEntries]);

      const txWithMultipleReflectors = TransactionBuilder.cloneFrom(baseTransaction, {
        sorobanData: sorobanData,
        fee: baseTransaction.fee,
      }).build();

      // Act
      const result = addReflectorEntries(txWithMultipleReflectors);

      // Assert
      const resultFootprint = result
        .toEnvelope()
        .v1()
        .tx()
        .ext()
        .sorobanData()
        .resources()
        .footprint();

      // Should add one entry for each reflector address
      expect(resultFootprint.readOnly().length).toBe(
        txWithMultipleReflectors
          .toEnvelope()
          .v1()
          .tx()
          .ext()
          .sorobanData()
          .resources()
          .footprint()
          .readOnly().length + reflectorAddresses.length
      );

      // Check that each reflector address has a corresponding future entry
      for (let i = 0; i < reflectorAddresses.length; i++) {
        let foundFutureEntry = false;
        for (const entry of resultFootprint.readOnly()) {
          if (entry.switch() === xdr.LedgerEntryType.contractData()) {
            const contractData = entry.contractData();
            const address = Address.fromScAddress(contractData.contract()).toString();

            if (
              address === reflectorAddresses[i] &&
              contractData.key().switch() === xdr.ScValType.scvU128()
            ) {
              const u128Key = contractData.key().u128();
              const entryTimestamp = u128Key.hi().toBigInt();
              const index = u128Key.lo().toBigInt();

              if (entryTimestamp === currRoundTimestamp + 300_000n && index === BigInt(i)) {
                foundFutureEntry = true;
                break;
              }
            }
          }
        }
        expect(foundFutureEntry).toBe(true);
      }
    } finally {
      // Restore the original Date.now
      global.Date.now = realDateNow;
    }
  });

  it('should only add entries for the most current unique oracle-index pair', () => {
    // We need to mock Date.now to ensure consistent behavior
    const realDateNow = Date.now;
    const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
    const currRoundTimestamp = BigInt(Math.floor(mockTimestamp / 1000 / 300_000) * 300_000);

    try {
      // Mock Date.now to return our fixed timestamp
      global.Date.now = jest.fn(() => mockTimestamp);

      // Arrange - create entries with different timestamps
      const sorobanData = baseTransaction.toEnvelope().v1().tx().ext().sorobanData();
      const footprint = sorobanData.resources().footprint();
      const reflectorAddress = 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC';

      // Create 4 entries:
      // 1. Index 0 with current round timestamp (should add new entry)
      // 2. Index 0 with previous round timestamp (should NOT add new entry)
      // 3. Index 1 with previous round timestamp (should add new entry)
      // 4. Index 2 with future round timestamp (should add new entry)
      const entries: xdr.LedgerKey[] = [
        // Entry with current round timestamp
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(reflectorAddress).toScAddress(),
            key: xdr.ScVal.scvU128(
              new xdr.UInt128Parts({
                hi: xdr.Uint64.fromString(currRoundTimestamp.toString()),
                lo: xdr.Uint64.fromString('0'),
              })
            ),
            durability: xdr.ContractDataDurability.temporary(),
          })
        ),
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(reflectorAddress).toScAddress(),
            key: xdr.ScVal.scvU128(
              new xdr.UInt128Parts({
                hi: xdr.Uint64.fromString((currRoundTimestamp - 300_000n).toString()),
                lo: xdr.Uint64.fromString('0'),
              })
            ),
            durability: xdr.ContractDataDurability.temporary(),
          })
        ),
        // Entry with previous round timestamp
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(reflectorAddress).toScAddress(),
            key: xdr.ScVal.scvU128(
              new xdr.UInt128Parts({
                hi: xdr.Uint64.fromString((currRoundTimestamp - 300_000n).toString()),
                lo: xdr.Uint64.fromString('1'),
              })
            ),
            durability: xdr.ContractDataDurability.temporary(),
          })
        ),
        // Entry with future round timestamp
        xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: Address.fromString(reflectorAddress).toScAddress(),
            key: xdr.ScVal.scvU128(
              new xdr.UInt128Parts({
                hi: xdr.Uint64.fromString((currRoundTimestamp + 300_000n).toString()),
                lo: xdr.Uint64.fromString('2'),
              })
            ),
            durability: xdr.ContractDataDurability.temporary(),
          })
        ),
      ];

      footprint.readOnly(entries);

      const tx = TransactionBuilder.cloneFrom(baseTransaction, {
        sorobanData: sorobanData,
        fee: baseTransaction.fee,
      }).build();

      // Act
      const result = addReflectorEntries(tx);

      // Assert
      const resultFootprint = result
        .toEnvelope()
        .v1()
        .tx()
        .ext()
        .sorobanData()
        .resources()
        .footprint();

      // Should have added exactly one new entry (original 3 + 1 new)
      expect(resultFootprint.readOnly().length).toBe(7);

      // Verify that the new entry has the expected future timestamp
      let foundNewTimestamp = false;
      for (const entry of resultFootprint.readOnly()) {
        if (entry.switch() === xdr.LedgerEntryType.contractData()) {
          const contractData = entry.contractData();
          if (contractData.key().switch() === xdr.ScValType.scvU128()) {
            const u128Key = contractData.key().u128();
            const timestamp = u128Key.hi().toBigInt();

            // Check for entry with timestamp = currRoundTimestamp + 300_000
            if (timestamp === currRoundTimestamp + 300_000n) {
              foundNewTimestamp = true;
              break;
            }
          }
        }
      }

      expect(foundNewTimestamp).toBe(true);
    } finally {
      // Restore the original Date.now
      global.Date.now = realDateNow;
    }
  });
});
