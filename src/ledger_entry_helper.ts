import { xdr } from '@stellar/stellar-sdk';

export function decodeEntryKey(entryKey: xdr.ScVal): string {
  let key: string | undefined;
  switch (entryKey.type) {
    // Key is a ScVec[ScvSym, ScVal]
    case 'scvVec':
      key = xdr.expectUnionVariant(entryKey.vec.at(0), 'scvSymbol').sym.toString();
      break;
    case 'scvSymbol':
      key = entryKey.sym.toString();
      break;
    case 'scvLedgerKeyContractInstance':
      key = 'ContractInstance';
      break;
    default:
      throw Error(`Invalid ledger entry key type: should not contain type ${entryKey.type}`);
  }
  return key;
}
