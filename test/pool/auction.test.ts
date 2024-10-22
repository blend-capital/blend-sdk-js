import { Auction, AuctionType, getAuctionsfromEvents } from '../../src/pool/auction.js';
import { BlendContractType, PoolEvent, PoolEventType } from '../../src/index.js';
import { i128 } from '../../src/index.js';

describe('Auction', () => {
  it('test auction scaling', () => {
    const auction = new Auction('user', AuctionType.Liquidation, {
      lot: new Map<string, bigint>([
        ['asset2', 1_0000000n],
        ['asset3', 5_0000001n],
      ]),
      bid: new Map<string, bigint>([
        ['asset1', 100_0000000n],
        ['asset2', 200_0000001n],
      ]),
      block: 123,
    });

    let [scaledAuction] = auction.scale(123, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(2);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(100_0000000n);
    expect(scaledAuction.data.bid.get('asset2')).toEqual(200_0000001n);
    expect(scaledAuction.data.lot.size).toEqual(0);

    // 100 blocks -> 100 percent, validate lot is rounded down
    [scaledAuction] = auction.scale(223, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(2);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(100_0000000n);
    expect(scaledAuction.data.bid.get('asset2')).toEqual(200_0000001n);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(5000000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(2_5000000n);

    // 100 blocks -> 50 percent, validate bid is rounded up
    [scaledAuction] = auction.scale(223, 50);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(2);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(50_0000000n);
    expect(scaledAuction.data.bid.get('asset2')).toEqual(100_0000001n);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(2500000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(1_2500000n);

    // 200 blocks -> 100 percent (is same)
    [scaledAuction] = auction.scale(323, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(2);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(100_0000000n);
    expect(scaledAuction.data.bid.get('asset2')).toEqual(200_0000001n);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(5_0000001n);

    // 200 blocks -> 75 percent, validate bid is rounded up and lot is rounded down
    [scaledAuction] = auction.scale(323, 75);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(2);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(75_0000000n);
    expect(scaledAuction.data.bid.get('asset2')).toEqual(150_0000001n);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(7500000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(3_7500000n);

    // 300 blocks -> 100 percent
    [scaledAuction] = auction.scale(423, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(2);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(50_0000000n);
    expect(scaledAuction.data.bid.get('asset2')).toEqual(100_0000001n);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(5_0000001n);

    // 400 blocks -> 100 percent
    [scaledAuction] = auction.scale(523, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(0);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(5_0000001n);

    // 500 blocks -> 100 percent (unchanged)
    [scaledAuction] = auction.scale(623, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(0);
    expect(scaledAuction.data.lot.size).toEqual(2);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.data.lot.get('asset3')).toEqual(5_0000001n);
  });

  it('test auction scaling with 1 stroop', () => {
    const auction = new Auction('user', AuctionType.Liquidation, {
      lot: new Map<string, bigint>([['asset2', 1n]]),
      bid: new Map<string, bigint>([['asset1', 1n]]),
      block: 123,
    });

    // 1 blocks -> 10 percent
    let [scaledAuction] = auction.scale(124, 10);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(1);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(1n);
    expect(scaledAuction.data.lot.size).toEqual(0);

    // 399 blocks -> 10 percent
    [scaledAuction] = auction.scale(522, 10);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(1);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(1n);
    expect(scaledAuction.data.lot.size).toEqual(0);

    // 399 blocks -> 100 percent
    [scaledAuction] = auction.scale(522, 100);
    expect(scaledAuction.data.block).toEqual(123);
    expect(scaledAuction.data.bid.size).toEqual(1);
    expect(scaledAuction.data.bid.get('asset1')).toEqual(1n);
    expect(scaledAuction.data.lot.size).toEqual(1);
    expect(scaledAuction.data.lot.get('asset2')).toEqual(1n);
  });
});

describe('getAuctionsFromEvents', () => {
  it('should create an array of auctions from events', () => {
    const events: PoolEvent[] = [
      {
        contractId: 'id',
        contractType: BlendContractType.Pool,
        id: 'id',
        ledgerClosedAt: '100',
        txHash: 'hash',
        ledger: 100,
        eventType: PoolEventType.NewLiquidationAuction,
        user: 'user1',
        auctionData: {
          block: 100,
          bid: new Map<string, i128>([['asset2', 100_000_0000n]]),
          lot: new Map<string, i128>([
            ['asset0', 10_000_0000n],
            ['asset1', 1_000_0000n],
          ]),
        },
      },
      {
        contractId: 'id',
        contractType: BlendContractType.Pool,
        id: 'id',
        ledgerClosedAt: '100',
        txHash: 'hash',
        eventType: PoolEventType.FillAuction,
        from: 'from',
        user: 'user1',
        auctionType: AuctionType.Liquidation as number,
        fillAmount: 25n,
        ledger: 200,
      },
      {
        contractId: 'id',
        contractType: BlendContractType.Pool,
        id: 'id',
        ledgerClosedAt: '100',
        txHash: 'hash',
        eventType: PoolEventType.FillAuction,
        from: 'from',
        user: 'user1',
        auctionType: AuctionType.Liquidation as number,
        fillAmount: 67n,
        ledger: 300,
      },
    ];
    const auctions = getAuctionsfromEvents(events, 'backstopId');
    const expectedFill_1 = {
      block: 100,
      bid: new Map<string, i128>([['asset2', 25_000_0000n]]),
      lot: new Map<string, i128>([
        ['asset0', 1_250_0000n],
        ['asset1', 1250000n],
      ]),
    };
    const expectedFill_2 = {
      block: 100,
      bid: new Map<string, i128>([['asset2', 50_250_0000n]]),
      lot: new Map<string, i128>([
        ['asset0', 5_025_0000n],
        ['asset1', 502_5000n],
      ]),
    };
    const expectedRemaining = {
      block: 100,
      bid: new Map<string, i128>([['asset2', 24_7500000n]]),
      lot: new Map<string, i128>([
        ['asset0', 2_4750000n],
        ['asset1', 2475000n],
      ]),
    };
    expect(auctions.filled.length).toBe(2);
    expect(auctions.ongoing.length).toBe(1);

    const remainingAuction = auctions.ongoing[0];
    expect(remainingAuction.data.bid).toEqual(expectedRemaining.bid);
    expect(remainingAuction.data.lot).toEqual(expectedRemaining.lot);
    expect(remainingAuction.type).toBe(AuctionType.Liquidation);
    expect(remainingAuction.user).toBe('user1');

    const firstFill = auctions.filled[0];
    expect(firstFill.type).toBe(AuctionType.Liquidation);
    expect(firstFill.user).toBe('user1');
    expect(firstFill.data.bid).toEqual(expectedFill_1.bid);
    expect(firstFill.data.lot).toEqual(expectedFill_1.lot);
    expect(firstFill.data.block).toBe(100);
    expect(firstFill.scaleBlock).toBe(200);
    expect(firstFill.fillHash).toBe('hash');
    expect(firstFill.filled).toBe(true);

    const secondFill = auctions.filled[1];
    expect(secondFill.type).toBe(AuctionType.Liquidation);
    expect(secondFill.user).toBe('user1');
    expect(secondFill.data.bid).toEqual(expectedFill_2.bid);
    expect(secondFill.data.lot).toEqual(expectedFill_2.lot);
    expect(secondFill.data.block).toBe(100);
    expect(secondFill.scaleBlock).toBe(300);
    expect(secondFill.fillHash).toBe('hash');
    expect(secondFill.filled).toBe(true);
  });
});
