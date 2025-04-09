import { xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { AuctionData } from '../../src';
import { Api } from '@stellar/stellar-sdk/rpc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function vecToScVal(val: { value: any; type: any }): string {
  const scvals: xdr.ScVal[] = [];
  if (Array.isArray(val.value) && Array.isArray(val.type) && val.value.length === val.type.length) {
    for (let i = 0; i < val.value.length; i++) {
      scvals.push(nativeToScVal(val.value[i], { type: val.type[i] }));
    }
  }
  return xdr.ScVal.scvVec(scvals).toXDR('base64');
}

export function auctionDataToScVal(auction: AuctionData): string {
  const bidEntries: xdr.ScMapEntry[] = [];
  Array.from(auction.bid)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      bidEntries.push(
        new xdr.ScMapEntry({
          key: nativeToScVal(key, { type: 'address' }),
          val: nativeToScVal(value, { type: 'i128' }),
        })
      );
    });
  const lotEntries: xdr.ScMapEntry[] = [];
  Array.from(auction.lot)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      lotEntries.push(
        new xdr.ScMapEntry({
          key: nativeToScVal(key, { type: 'address' }),
          val: nativeToScVal(value, { type: 'i128' }),
        })
      );
    });

  const auctionData = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: nativeToScVal('bid', { type: 'symbol' }),
      val: xdr.ScVal.scvMap(bidEntries),
    }),
    new xdr.ScMapEntry({
      key: nativeToScVal('block', { type: 'symbol' }),
      val: nativeToScVal(auction.block, { type: 'u32' }),
    }),
    new xdr.ScMapEntry({
      key: nativeToScVal('lot', { type: 'symbol' }),
      val: xdr.ScVal.scvMap(lotEntries),
    }),
  ]);
  return auctionData.toXDR('base64');
}

// Common event response setup
export function createEventResponse(
  contractId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topics: { value: any; type: string }[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  val: { value: any; type: any }
): Api.RawEventResponse {
  return {
    contractId: contractId,
    topic: topics.map((t) =>
      Array.isArray(t.value)
        ? vecToScVal(t)
        : nativeToScVal(t.value, { type: t.type }).toXDR('base64')
    ),
    value: Array.isArray(val.value)
      ? vecToScVal(val)
      : nativeToScVal(val.value, { type: val.type }).toXDR('base64'),
    id: '1',
    type: 'contract',
    ledger: 123,
    ledgerClosedAt: '2025-04-08T12:34:56Z',
    pagingToken: 'test-token',
    inSuccessfulContractCall: true,
    txHash: 'txhash123',
  };
}
