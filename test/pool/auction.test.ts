import { Auction, ScaledAuction, AuctionType } from '../../src/pool/auction.js';
import {
  BackstopToken,
  BlendContractType,
  Pool,
  PoolEvent,
  PoolEventType,
  PoolOracle,
  Reserve,
} from '../../src/index.js';
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

    let scaledAuction = auction.scale(123, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(123);
    expect(scaledAuction.bid.size).toEqual(2);
    expect(scaledAuction.bid.get('asset1')).toEqual(100_0000000n);
    expect(scaledAuction.bid.get('asset2')).toEqual(200_0000001n);
    expect(scaledAuction.lot.size).toEqual(0);

    // 100 blocks -> 100 percent, validate lot is rounded down
    scaledAuction = auction.scale(223, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(223);
    expect(scaledAuction.bid.size).toEqual(2);
    expect(scaledAuction.bid.get('asset1')).toEqual(100_0000000n);
    expect(scaledAuction.bid.get('asset2')).toEqual(200_0000001n);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(5000000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(2_5000000n);

    // 100 blocks -> 50 percent, validate bid is rounded up
    scaledAuction = auction.scale(223, 50, false);
    expect(scaledAuction.scaleBlock).toEqual(223);
    expect(scaledAuction.bid.size).toEqual(2);
    expect(scaledAuction.bid.get('asset1')).toEqual(50_0000000n);
    expect(scaledAuction.bid.get('asset2')).toEqual(100_0000001n);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(2500000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(1_2500000n);

    // 200 blocks -> 100 percent (is same)
    scaledAuction = auction.scale(323, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(323);
    expect(scaledAuction.bid.size).toEqual(2);
    expect(scaledAuction.bid.get('asset1')).toEqual(100_0000000n);
    expect(scaledAuction.bid.get('asset2')).toEqual(200_0000001n);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(5_0000001n);

    // 200 blocks -> 75 percent, validate bid is rounded up and lot is rounded down
    scaledAuction = auction.scale(323, 75, false);
    expect(scaledAuction.scaleBlock).toEqual(323);
    expect(scaledAuction.bid.size).toEqual(2);
    expect(scaledAuction.bid.get('asset1')).toEqual(75_0000000n);
    expect(scaledAuction.bid.get('asset2')).toEqual(150_0000001n);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(7500000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(3_7500000n);

    // 300 blocks -> 100 percent
    scaledAuction = auction.scale(423, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(423);
    expect(scaledAuction.bid.size).toEqual(2);
    expect(scaledAuction.bid.get('asset1')).toEqual(50_0000000n);
    expect(scaledAuction.bid.get('asset2')).toEqual(100_0000001n);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(5_0000001n);

    // 400 blocks -> 100 percent
    scaledAuction = auction.scale(523, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(523);
    expect(scaledAuction.bid.size).toEqual(0);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(5_0000001n);

    // 500 blocks -> 100 percent (unchanged)
    scaledAuction = auction.scale(623, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(623);
    expect(scaledAuction.bid.size).toEqual(0);
    expect(scaledAuction.lot.size).toEqual(2);
    expect(scaledAuction.lot.get('asset2')).toEqual(1_0000000n);
    expect(scaledAuction.lot.get('asset3')).toEqual(5_0000001n);
  });

  it('test auction scaling with 1 stroop', () => {
    const auction = new Auction('user', AuctionType.Liquidation, {
      lot: new Map<string, bigint>([['asset2', 1n]]),
      bid: new Map<string, bigint>([['asset1', 1n]]),
      block: 123,
    });

    // 1 blocks -> 10 percent
    let scaledAuction = auction.scale(124, 10, false);
    expect(scaledAuction.scaleBlock).toEqual(124);
    expect(scaledAuction.bid.size).toEqual(1);
    expect(scaledAuction.bid.get('asset1')).toEqual(1n);
    expect(scaledAuction.lot.size).toEqual(0);

    // 399 blocks -> 10 percent
    scaledAuction = auction.scale(522, 10, false);
    expect(scaledAuction.scaleBlock).toEqual(522);
    expect(scaledAuction.bid.size).toEqual(1);
    expect(scaledAuction.bid.get('asset1')).toEqual(1n);
    expect(scaledAuction.lot.size).toEqual(0);

    // 399 blocks -> 100 percent
    scaledAuction = auction.scale(522, 100, false);
    expect(scaledAuction.scaleBlock).toEqual(522);
    expect(scaledAuction.bid.size).toEqual(1);
    expect(scaledAuction.bid.get('asset1')).toEqual(1n);
    expect(scaledAuction.lot.size).toEqual(1);
    expect(scaledAuction.lot.get('asset2')).toEqual(1n);
  });
});

describe('ScaledAuction', () => {
  const mockAsset_0_reserve = {
    toAssetFromBTokenFloat: jest.fn().mockReturnValue(123.456),
    toAssetFromDTokenFloat: jest.fn().mockReturnValue(123.456),
    toEffectiveAssetFromBTokenFloat: jest.fn().mockReturnValue(123.456),
    toEffectiveAssetFromDTokenFloat: jest.fn().mockReturnValue(123.456),
    config: { decimals: 7 },
  } as unknown as jest.Mocked<Reserve>;
  const mockAsset_1_reserve = {
    toAssetFromBTokenFloat: jest.fn().mockReturnValue(456.789),
    toAssetFromDTokenFloat: jest.fn().mockReturnValue(456.789),
    toEffectiveAssetFromBTokenFloat: jest.fn().mockReturnValue(456.789),
    toEffectiveAssetFromDTokenFloat: jest.fn().mockReturnValue(456.789),
    config: { decimals: 7 },
  } as unknown as jest.Mocked<Reserve>;
  const mockAsset_2_reserve = {
    toAssetFromBTokenFloat: jest.fn().mockReturnValue(789.123),
    toAssetFromDTokenFloat: jest.fn().mockReturnValue(789.123),
    toEffectiveAssetFromBTokenFloat: jest.fn().mockReturnValue(789.123),
    toEffectiveAssetFromDTokenFloat: jest.fn().mockReturnValue(789.123),
    config: { decimals: 7 },
  } as unknown as jest.Mocked<Reserve>;
  const mockPoolOracle = {
    getPriceFloat: jest.fn().mockImplementation((assetId: string) => {
      switch (assetId) {
        case 'asset0':
          return 1.234;
        case 'asset1':
          return 4.567;
        case 'asset2':
          return 8.912;
        default:
          return undefined;
      }
    }),
  } as unknown as jest.Mocked<PoolOracle>;
  const mockPool = {
    reserves: new Map([
      ['asset0', mockAsset_0_reserve],
      ['asset1', mockAsset_1_reserve],
      ['asset2', mockAsset_2_reserve],
    ]),
  } as unknown as jest.Mocked<Pool>;
  const mockBackstopToken = {
    lpTokenPrice: 1.234,
  } as unknown as jest.Mocked<BackstopToken>;
  it('should create ScaledAuction instances from events', () => {
    const events: PoolEvent[] = [
      {
        contractId: 'id',
        contractType: BlendContractType.Pool,
        id: 'id',
        ledgerClosedAt: '100',
        txHash: 'hash',
        ledger: 200,
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
    const scaledAuctions = ScaledAuction.fromEvents(events, 'backstopId', 300);
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
    const remainingAuctionScaled = {
      block: 100,
      bid: new Map<string, i128>([['asset2', 24_7500000n]]),
      lot: new Map<string, i128>([
        ['asset0', 2_4750000n],
        ['asset1', 2475000n],
      ]),
    };
    expect(scaledAuctions.length).toBe(3);

    for (let i = 1; i < 3; i++) {
      expect(scaledAuctions[i].user).toBe('user1');
      expect(scaledAuctions[i].type).toBe(AuctionType.Liquidation);
      expect(scaledAuctions[i].startBlock).toBe(100);
    }
    expect(scaledAuctions[0].bid).toEqual(expectedFill_1.bid);
    expect(scaledAuctions[0].lot).toEqual(expectedFill_1.lot);
    expect(scaledAuctions[0].scaleBlock).toBe(200);
    expect(scaledAuctions[0].hash).toBe('hash');
    expect(scaledAuctions[0].timestamp).toBe('100');
    expect(scaledAuctions[0].filled).toBe(true);

    expect(scaledAuctions[1].bid).toEqual(expectedFill_2.bid);
    expect(scaledAuctions[1].lot).toEqual(expectedFill_2.lot);
    expect(scaledAuctions[1].scaleBlock).toBe(300);
    expect(scaledAuctions[1].hash).toBe('hash');
    expect(scaledAuctions[1].timestamp).toBe('100');
    expect(scaledAuctions[1].filled).toBe(true);

    expect(scaledAuctions[2].bid).toEqual(remainingAuctionScaled.bid);
    expect(scaledAuctions[2].lot).toEqual(remainingAuctionScaled.lot);
    expect(scaledAuctions[2].scaleBlock).toBe(300);
    expect(scaledAuctions[2].hash).toBe(undefined);
    expect(scaledAuctions[2].timestamp).toBe('100');
    expect(scaledAuctions[2].filled).toBe(false);
  });

  it('calculates liquidation auction value correctly', () => {
    const scaledAuction = new ScaledAuction(
      'user',
      AuctionType.Liquidation,
      new Map<string, i128>([['asset2', 100_000_0000n]]),
      new Map<string, i128>([
        ['asset0', 10_000_0000n],
        ['asset1', 1_000_0000n],
      ]),
      100,
      300,
      false
    );
    const value = scaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken);
    expect(value.bid).toBeCloseTo(7032.66);
    expect(value.effectiveBid).toBeCloseTo(7032.66);
    expect(value.lot).toBeCloseTo(2238.5);
    expect(value.effectiveLot).toBeCloseTo(2238.5);
  });
  it('calculates interest auction value correctly', () => {
    const scaledAuction = new ScaledAuction(
      'user',
      AuctionType.Interest,
      new Map<string, i128>([['lpToken', 700_000_0000n]]),
      new Map<string, i128>([
        ['asset0', 10_000_0000n],
        ['asset1', 1_000_0000n],
        ['asset2', 100_000_0000n],
      ]),
      100,
      300,
      false
    );
    const value = scaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken);
    expect(value.lot).toBeCloseTo(908.11);
    expect(value.bid).toBeCloseTo(863.8);
    expect(value.effectiveBid).toBe(0);
    expect(value.effectiveLot).toBe(0);
  });
  it('calculates interest auction value correctly', () => {
    const scaledAuction = new ScaledAuction(
      'user',
      AuctionType.BadDebt,
      new Map<string, i128>([
        ['asset0', 10_000_0000n],
        ['asset1', 1_000_0000n],
        ['asset2', 100_000_0000n],
      ]),
      new Map<string, i128>([['lpToken', 700_000_0000n]]),
      100,
      300,
      false
    );
    const value = scaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken);
    expect(value.lot).toBeCloseTo(863.8);
    expect(value.bid).toBeCloseTo(9271.16);
    expect(value.effectiveBid).toBeCloseTo(9271.16);
    expect(value.effectiveLot).toBe(0);
  });
  it('oracleValue should throw an error if the reserve not found', () => {
    const invalidBidScaledAuction = new ScaledAuction(
      'user',
      AuctionType.Liquidation,
      new Map<string, i128>([
        ['asset4', 10_000_0000n],
        ['asset1', 1_000_0000n],
        ['asset2', 100_000_0000n],
      ]),
      new Map<string, i128>([['asset0', 700_000_0000n]]),
      100,
      300,
      false
    );
    const invalidLotScaledAuction = new ScaledAuction(
      'user',
      AuctionType.Liquidation,
      new Map<string, i128>([
        ['asset1', 1_000_0000n],
        ['asset2', 100_000_0000n],
      ]),
      new Map<string, i128>([['asset4', 700_000_0000n]]),
      100,
      300,
      false
    );
    expect(() =>
      invalidBidScaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken)
    ).toThrow('Undefined reserve for asset: asset4');
    expect(() =>
      invalidLotScaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken)
    ).toThrow('Undefined reserve for asset: asset4');
  });
  it('oracleValue should throw an error if the price is not found', () => {
    mockPoolOracle.getPriceFloat.mockImplementation((assetId: string) => {
      switch (assetId) {
        case 'asset0':
          return undefined;
        case 'asset1':
          return 1.234;
        case 'asset2':
          return 8.912;
        default:
          return undefined;
      }
    });
    const invalidBidScaledAuction = new ScaledAuction(
      'user',
      AuctionType.Liquidation,
      new Map<string, i128>([
        ['asset1', 1_000_0000n],
        ['asset2', 100_000_0000n],
      ]),
      new Map<string, i128>([['asset0', 700_000_0000n]]),
      100,
      300,
      false
    );

    expect(() =>
      invalidBidScaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken)
    ).toThrow('Undefined price for asset: asset0');
    mockPoolOracle.getPriceFloat.mockImplementation((assetId: string) => {
      switch (assetId) {
        case 'asset0':
          return 1.234;
        case 'asset1':
          return undefined;
        case 'asset2':
          return 8.912;
        default:
          return undefined;
      }
    });
    const invalidLotScaledAuction = new ScaledAuction(
      'user',
      AuctionType.Liquidation,
      new Map<string, i128>([
        ['asset1', 1_000_0000n],
        ['asset2', 100_000_0000n],
      ]),
      new Map<string, i128>([['asset0', 700_000_0000n]]),
      100,
      300,
      false
    );
    expect(() =>
      invalidLotScaledAuction.oracleValue(mockPool, mockPoolOracle, mockBackstopToken)
    ).toThrow('Undefined price for asset: asset1');
  });
});
