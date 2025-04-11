import { Api } from '@stellar/stellar-sdk/rpc';
import {
  BlendContractType,
  PoolEventType,
  poolEventV1FromEventResponse,
  poolEventV2FromEventResponse,
  PoolSetAdminEvent,
  PoolCancelSetReserveEvent,
  PoolSetReserveEvent,
  PoolSetStatusEvent,
  PoolReserveEmissionUpdateEvent,
  PoolClaimEvent,
  PoolBadDebtEvent,
  PoolSupplyEvent,
  PoolWithdrawEvent,
  PoolSupplyCollateralEvent,
  PoolWithdrawCollateralEvent,
  PoolBorrowEvent,
  PoolRepayEvent,
  PoolUpdateEmissionsEvent,
  PoolNewLiquidationAuctionEvent,
  PoolNewAuctionV1Event,
  PoolFillAuctionV1Event,
  PoolDeleteLiquidationAuctionEvent,
  PoolGulpEmissionsEvent,
  PoolDefaultedDebtEvent,
  PoolGulpEvent,
  PoolNewAuctionV2Event,
  PoolFillAuctionV2Event,
  PoolDeleteAuctionEvent,
  PoolFlashLoanEvent,
  AuctionData,
  PoolQueueSetReserveV1Event,
  PoolUpdatePoolV1Event,
  PoolQueueSetReserveV2Event,
  PoolUpdatePoolV2Event,
} from '../../src';
import { Keypair, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { vecToScVal, auctionDataToScVal, createEventResponse } from '../utils/event_helpers';

describe('Pool Event Parsing', () => {
  const poolId = Keypair.random().publicKey();
  const from = Keypair.random().publicKey();
  const asset = Keypair.random().publicKey();
  const admin = Keypair.random().publicKey();
  const newAdmin = Keypair.random().publicKey();

  // Mock AuctionData
  const mockAuctionData: AuctionData = {
    bid: new Map([[Keypair.random().publicKey(), 123n]]),
    block: 123,
    lot: new Map([[Keypair.random().publicKey(), 123n]]),
  };
  const mockReserveConfigV2 = {
    index: 0,
    decimals: 7,
    l_factor: 90000000,
    c_factor: 90000000,
    util: 50000000,
    max_util: 80000000,
    r_base: 300000,
    r_one: 600000,
    r_two: 1200000,
    r_three: 50000000,
    reactivity: 20,
    supply_cap: BigInt(1000000000000),
    enabled: true,
  };

  const mockReserveConfigV1 = {
    index: 0,
    decimals: 7,
    l_factor: 90000000,
    c_factor: 90000000,
    util: 50000000,
    max_util: 80000000,
    r_base: 300000,
    r_one: 600000,
    r_two: 1200000,
    r_three: 50000000,
    reactivity: 20,
  };
  // Mock ReserveConfig

  describe('Base Pool Events', () => {
    it('should parse set_admin event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'set_admin', type: 'symbol' },
          { value: admin, type: 'address' },
        ],
        { value: newAdmin, type: 'address' }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolSetAdminEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolSetAdminEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.contractType).toEqual(BlendContractType.Pool);
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.SetAdmin);
      expect(parsedV1Event.oldAdmin).toEqual(admin);
      expect(parsedV1Event.newAdmin).toEqual(newAdmin);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse set_reserve event', () => {
      const event = createEventResponse(poolId, [{ value: 'set_reserve', type: 'symbol' }], {
        value: [asset, 3],
        type: ['address', 'u32'],
      });

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolSetReserveEvent;
      const parsedV2Event = poolEventV1FromEventResponse(event) as PoolSetReserveEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.SetReserve);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.assetIndex).toEqual(3);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse cancel_set_reserve event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'cancel_set_reserve', type: 'symbol' },
          { value: admin, type: 'address' },
        ],
        { value: asset, type: 'address' }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolCancelSetReserveEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolCancelSetReserveEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.CancelSetReserve);
      expect(parsedV1Event.admin).toEqual(admin);
      expect(parsedV1Event.assetId).toEqual(asset);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse set_status event (no admin)', () => {
      const event = createEventResponse(poolId, [{ value: 'set_status', type: 'symbol' }], {
        value: 2,
        type: 'u32',
      });

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolSetStatusEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolSetStatusEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event.eventType).toEqual(PoolEventType.SetStatus);
      expect(parsedV1Event.admin).toBeUndefined();
      expect(parsedV1Event.status).toEqual(2);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse set_status event (with admin)', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'set_status', type: 'symbol' },
          { value: admin, type: 'address' },
        ],
        {
          value: 1,
          type: 'u32',
        }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolSetStatusEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolSetStatusEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event.eventType).toEqual(PoolEventType.SetStatus);
      expect(parsedV1Event.admin).toEqual(admin);
      expect(parsedV1Event.status).toEqual(1);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse reserve_emission_update event', () => {
      const event = createEventResponse(
        poolId,
        [{ value: 'reserve_emission_update', type: 'symbol' }],
        {
          value: [5, 1000, 1687458000],
          type: ['u32', 'u64', 'u64'],
        }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolReserveEmissionUpdateEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolReserveEmissionUpdateEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.ReserveEmissionUpdate);
      expect(parsedV1Event.reserveTokenId).toEqual(5);
      expect(parsedV1Event.eps).toEqual(1000);
      expect(parsedV1Event.expiration).toEqual(1687458000);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse claim event', () => {
      // Need to create a vector of vectors
      const reserveTokenIds = [1, 2, 3];
      const innerVec = nativeToScVal(reserveTokenIds, { type: 'u32' });
      const value = vecToScVal({ value: [innerVec, 1000n], type: ['object', 'i128'] });

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('claim', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(from, { type: 'address' }).toXDR('base64'),
        ],
        value: value,
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolClaimEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolClaimEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event.eventType).toEqual(PoolEventType.Claim);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.reserveTokenIds).toEqual(reserveTokenIds);
      expect(parsedV1Event.amount.toString()).toEqual('1000');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse bad_debt event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'bad_debt', type: 'symbol' },
          { value: from, type: 'address' },
          { value: asset, type: 'address' },
        ],
        { value: 100n, type: 'i128' }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolBadDebtEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolBadDebtEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.BadDebt);
      expect(parsedV1Event.user).toEqual(from);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.dTokens.toString()).toEqual('100');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse supply_collateral event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'supply_collateral', type: 'symbol' },
          { value: asset, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [123n, 456n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolSupplyCollateralEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolSupplyCollateralEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.SupplyCollateral);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('123');
      expect(parsedV1Event.bTokensMinted.toString()).toEqual('456');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse withdraw_collateral event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'withdraw_collateral', type: 'symbol' },
          { value: asset, type: 'address' },
          { value: from, type: 'address' },
        ],

        { value: [500n, 450n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolWithdrawCollateralEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolWithdrawCollateralEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.WithdrawCollateral);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('500');
      expect(parsedV1Event.bTokensBurned.toString()).toEqual('450');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse supply event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'supply', type: 'symbol' },
          { value: asset, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [1000n, 980n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolSupplyEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolSupplyEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.Supply);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('1000');
      expect(parsedV1Event.bTokensMinted.toString()).toEqual('980');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse withdraw event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'withdraw', type: 'symbol' },
          { value: asset, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [750n, 760n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolWithdrawEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolWithdrawEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.Withdraw);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('750');
      expect(parsedV1Event.bTokensBurned.toString()).toEqual('760');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse borrow event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'borrow', type: 'symbol' },
          { value: asset, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [300n, 310n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolBorrowEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolBorrowEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.Borrow);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('300');
      expect(parsedV1Event.dTokensMinted.toString()).toEqual('310');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse repay event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'repay', type: 'symbol' },
          { value: asset, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [320n, 310n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolRepayEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolRepayEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.Repay);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('320');
      expect(parsedV1Event.dTokensBurned.toString()).toEqual('310');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse delete_liquidation_auction event', () => {
      const user = Keypair.random().publicKey();

      const event = createEventResponse(
        poolId,
        [
          { value: 'delete_liquidation_auction', type: 'symbol' },
          { value: user, type: 'address' },
        ],
        { value: null, type: null }
      );

      const parsedV1Event = poolEventV1FromEventResponse(
        event
      ) as PoolDeleteLiquidationAuctionEvent;
      const parsedV2Event = poolEventV2FromEventResponse(
        event
      ) as PoolDeleteLiquidationAuctionEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.DeleteLiquidationAuction);
      expect(parsedV1Event.user).toEqual(user);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });
  });

  describe('V1 Pool Events', () => {
    it('should parse update_pool event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'update_pool', type: 'symbol' },
          { value: admin, type: 'address' },
        ],
        { value: [5, 10], type: ['u32', 'u32'] }
      );

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolUpdatePoolV1Event;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolUpdatePoolV2Event;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.UpdatePool);
      expect(parsedV1Event.admin).toEqual(admin);
      expect(parsedV1Event.backstopTakeRate).toEqual(5);
      expect(parsedV1Event.maxPositions).toEqual(10);

      expect(parsedV2Event).toBeUndefined();
    });

    it('should parse queue_set_reserve event', () => {
      // For this test we need to manually create the ReserveConfig scVal
      const reserveConfig = nativeToScVal(mockReserveConfigV1, {
        type: {
          index: ['symbol', 'u32'],
          decimals: ['symbol', 'u32'],
          l_factor: ['symbol', 'u32'],
          c_factor: ['symbol', 'u32'],
          util: ['symbol', 'u32'],
          max_util: ['symbol', 'u32'],
          r_base: ['symbol', 'u32'],
          r_one: ['symbol', 'u32'],
          r_two: ['symbol', 'u32'],
          r_three: ['symbol', 'u32'],
          reactivity: ['symbol', 'u32'],
        },
      });
      const value = vecToScVal({
        value: [asset, reserveConfig],
        type: ['address', 'object'],
      });
      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('queue_set_reserve', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(admin, { type: 'address' }).toXDR('base64'),
        ],
        value: value,
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolQueueSetReserveV1Event;
      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolQueueSetReserveV2Event;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.QueueSetReserve);
      expect(parsedV1Event.admin).toEqual(admin);
      expect(parsedV1Event.assetId).toEqual(asset);
      expect(parsedV1Event.reserveConfig).toBeDefined();
      expect(parsedV1Event.reserveConfig.c_factor).toEqual(mockReserveConfigV1.c_factor);
      expect(parsedV1Event.reserveConfig.l_factor).toEqual(mockReserveConfigV1.l_factor);
      expect(parsedV1Event.reserveConfig.util).toEqual(mockReserveConfigV1.util);
      expect(parsedV1Event.reserveConfig.max_util).toEqual(mockReserveConfigV1.max_util);
      expect(parsedV1Event.reserveConfig.r_base).toEqual(mockReserveConfigV1.r_base);
      expect(parsedV1Event.reserveConfig.r_one).toEqual(mockReserveConfigV1.r_one);
      expect(parsedV1Event.reserveConfig.r_two).toEqual(mockReserveConfigV1.r_two);
      expect(parsedV1Event.reserveConfig.r_three).toEqual(mockReserveConfigV1.r_three);
      expect(parsedV1Event.reserveConfig.reactivity).toEqual(mockReserveConfigV1.reactivity);
      expect(parsedV1Event.reserveConfig.index).toEqual(mockReserveConfigV1.index);
      expect(parsedV1Event.reserveConfig.decimals).toEqual(mockReserveConfigV1.decimals);

      expect(parsedV2Event).toBeUndefined();
    });

    it('should parse update_emissions event', () => {
      const event = createEventResponse(poolId, [{ value: 'update_emissions', type: 'symbol' }], {
        value: 5000n,
        type: 'i128',
      });

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolUpdateEmissionsEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event);

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.UpdateEmissions);
      expect(parsedV1Event.newBLND.toString()).toEqual('5000');

      expect(parsedV2Event).toBeUndefined();
    });

    it('should parse new_liquidation_auction event', () => {
      // For this test we need to manually create the AuctionData scVal
      const auctionData = auctionDataToScVal(mockAuctionData);

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('new_liquidation_auction', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(from, { type: 'address' }).toXDR('base64'),
        ],
        value: auctionData,
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolNewLiquidationAuctionEvent;
      const parsedV2Event = poolEventV2FromEventResponse(event);

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.NewLiquidationAuction);
      expect(parsedV1Event.user).toEqual(from);
      expect(parsedV1Event.auctionData).toBeDefined();
      expect(parsedV1Event.auctionData.lot).toEqual(mockAuctionData.lot);
      expect(parsedV1Event.auctionData.bid).toEqual(mockAuctionData.bid);
      expect(parsedV1Event.auctionData.block).toEqual(mockAuctionData.block);

      expect(parsedV2Event).toBeUndefined();
    });

    it('should parse new_auction event (V1)', () => {
      const auctionType = 1;
      // For this test we need to manually create the AuctionData scVal
      const auctionData = auctionDataToScVal(mockAuctionData);

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('new_auction', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(auctionType, { type: 'u32' }).toXDR('base64'),
        ],
        value: auctionData,
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolNewAuctionV1Event;
      const parsedV2Event = poolEventV2FromEventResponse(event);

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.NewAuction);
      expect(parsedV1Event.auctionType).toEqual(auctionType);
      expect(parsedV1Event.auctionData).toBeDefined();
      expect(parsedV1Event.auctionData.lot).toEqual(mockAuctionData.lot);
      expect(parsedV1Event.auctionData.bid).toEqual(mockAuctionData.bid);
      expect(parsedV1Event.auctionData.block).toEqual(mockAuctionData.block);

      expect(parsedV2Event).toBeUndefined();
    });

    it('should parse fill_auction event (V1)', () => {
      const auctionType = 2;
      const user = Keypair.random().publicKey();
      const filler = Keypair.random().publicKey();

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('fill_auction', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(user, { type: 'address' }).toXDR('base64'),
          nativeToScVal(auctionType, { type: 'u32' }).toXDR('base64'),
        ],
        value: vecToScVal({ value: [filler, 500n], type: ['address', 'i128'] }),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV1Event = poolEventV1FromEventResponse(event) as PoolFillAuctionV1Event;
      const parsedV2Event = poolEventV2FromEventResponse(event);

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(PoolEventType.FillAuction);
      expect(parsedV1Event.user).toEqual(user);
      expect(parsedV1Event.auctionType).toEqual(auctionType);
      expect(parsedV1Event.from).toEqual(filler);
      expect(parsedV1Event.fillAmount.toString()).toEqual('500');

      expect(parsedV2Event).toBeUndefined();
    });
  });

  describe('V2 Pool Events', () => {
    it('should parse update_pool event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'update_pool', type: 'symbol' },
          { value: admin, type: 'address' },
        ],
        { value: [5, 10, 123n], type: ['u32', 'u32', 'i128'] }
      );

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolUpdatePoolV2Event;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.UpdatePool);
      expect(parsedV2Event.admin).toEqual(admin);
      expect(parsedV2Event.backstopTakeRate).toEqual(5);
      expect(parsedV2Event.maxPositions).toEqual(10);
      expect(parsedV2Event.minCollateral.toString()).toEqual('123');

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse queue_set_reserve event', () => {
      // For this test we need to manually create the ReserveConfig scVal
      const reserveConfig = nativeToScVal(mockReserveConfigV2, {
        type: {
          index: ['symbol', 'u32'],
          decimals: ['symbol', 'u32'],
          l_factor: ['symbol', 'u32'],
          c_factor: ['symbol', 'u32'],
          util: ['symbol', 'u32'],
          max_util: ['symbol', 'u32'],
          r_base: ['symbol', 'u32'],
          r_one: ['symbol', 'u32'],
          r_two: ['symbol', 'u32'],
          r_three: ['symbol', 'u32'],
          reactivity: ['symbol', 'u32'],
          supply_cap: ['symbol', 'i128'],
          enabled: ['symbol', 'bool'],
        },
      });
      const value = vecToScVal({
        value: [asset, reserveConfig],
        type: ['address', 'object'],
      });
      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('queue_set_reserve', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(admin, { type: 'address' }).toXDR('base64'),
        ],
        value: value,
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolQueueSetReserveV2Event;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.QueueSetReserve);
      expect(parsedV2Event.admin).toEqual(admin);
      expect(parsedV2Event.assetId).toEqual(asset);
      expect(parsedV2Event.reserveConfig).toBeDefined();
      expect(parsedV2Event.reserveConfig.c_factor).toEqual(mockReserveConfigV2.c_factor);
      expect(parsedV2Event.reserveConfig.l_factor).toEqual(mockReserveConfigV2.l_factor);
      expect(parsedV2Event.reserveConfig.util).toEqual(mockReserveConfigV2.util);
      expect(parsedV2Event.reserveConfig.max_util).toEqual(mockReserveConfigV2.max_util);
      expect(parsedV2Event.reserveConfig.r_base).toEqual(mockReserveConfigV2.r_base);
      expect(parsedV2Event.reserveConfig.r_one).toEqual(mockReserveConfigV2.r_one);
      expect(parsedV2Event.reserveConfig.r_two).toEqual(mockReserveConfigV2.r_two);
      expect(parsedV2Event.reserveConfig.r_three).toEqual(mockReserveConfigV2.r_three);
      expect(parsedV2Event.reserveConfig.reactivity).toEqual(mockReserveConfigV2.reactivity);
      expect(parsedV2Event.reserveConfig.index).toEqual(mockReserveConfigV2.index);
      expect(parsedV2Event.reserveConfig.decimals).toEqual(mockReserveConfigV2.decimals);
      expect(parsedV2Event.reserveConfig.supply_cap.toString()).toEqual(
        mockReserveConfigV2.supply_cap.toString()
      );
      expect(parsedV2Event.reserveConfig.enabled).toEqual(mockReserveConfigV2.enabled);

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse gulp_emissions event', () => {
      const event = createEventResponse(poolId, [{ value: 'gulp_emissions', type: 'symbol' }], {
        value: 10000n,
        type: 'i128',
      });

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolGulpEmissionsEvent;

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.GulpEmissions);
      expect(parsedV2Event.newBLND.toString()).toEqual('10000');
    });

    it('should parse defaulted_debt event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'defaulted_debt', type: 'symbol' },
          { value: asset, type: 'address' },
        ],
        { value: 200n, type: 'i128' }
      );

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolDefaultedDebtEvent;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.DefaultedDebt);
      expect(parsedV2Event.assetId).toEqual(asset);
      expect(parsedV2Event.dTokens.toString()).toEqual('200');

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse gulp event', () => {
      const event = createEventResponse(
        poolId,
        [
          { value: 'gulp', type: 'symbol' },
          { value: asset, type: 'address' },
        ],
        { value: [300n, 1500n], type: ['i128', 'i128'] }
      );

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolGulpEvent;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.Gulp);
      expect(parsedV2Event.assetId).toEqual(asset);
      expect(parsedV2Event.tokenDelta.toString()).toEqual('300');
      expect(parsedV2Event.newBRate.toString()).toEqual('1500');

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse new_auction event (V2)', () => {
      const auctionType = 1;
      const user = Keypair.random().publicKey();
      const percent = 75;

      // For this test we need to manually create the AuctionData scVal
      const auctionData = auctionDataToScVal(mockAuctionData);

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('new_auction', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(auctionType, { type: 'u32' }).toXDR('base64'),
          nativeToScVal(user, { type: 'address' }).toXDR('base64'),
        ],
        value: vecToScVal({
          value: [percent, xdr.ScVal.fromXDR(auctionData, 'base64')],
          type: ['u32', 'object'],
        }),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolNewAuctionV2Event;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.NewAuction);
      expect(parsedV2Event.auctionType).toEqual(auctionType);
      expect(parsedV2Event.user).toEqual(user);
      expect(parsedV2Event.percent).toEqual(percent);
      expect(parsedV2Event.auctionData).toBeDefined();
      expect(parsedV2Event.auctionData.lot).toEqual(mockAuctionData.lot);
      expect(parsedV2Event.auctionData.bid).toEqual(mockAuctionData.bid);
      expect(parsedV2Event.auctionData.block).toEqual(mockAuctionData.block);

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse fill_auction event (V2)', () => {
      const auctionType = 2;
      const user = Keypair.random().publicKey();
      const filler = Keypair.random().publicKey();
      const fillAmount = 500n;

      // For this test we need to manually create the AuctionData scVal
      const auctionData = auctionDataToScVal(mockAuctionData);

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('fill_auction', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(auctionType, { type: 'u32' }).toXDR('base64'),
          nativeToScVal(user, { type: 'address' }).toXDR('base64'),
        ],
        value: vecToScVal({
          value: [filler, fillAmount, xdr.ScVal.fromXDR(auctionData, 'base64')],
          type: ['address', 'i128', 'object'],
        }),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolFillAuctionV2Event;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.FillAuction);
      expect(parsedV2Event.auctionType).toEqual(auctionType);
      expect(parsedV2Event.user).toEqual(user);
      expect(parsedV2Event.filler).toEqual(filler);
      expect(parsedV2Event.fillAmount.toString()).toEqual('500');
      expect(parsedV2Event.filledAuctionData).toBeDefined();
      expect(parsedV2Event.filledAuctionData.lot).toEqual(mockAuctionData.lot);
      expect(parsedV2Event.filledAuctionData.bid).toEqual(mockAuctionData.bid);
      expect(parsedV2Event.filledAuctionData.block).toEqual(mockAuctionData.block);

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse delete_auction event', () => {
      const auctionType = 3;
      const user = Keypair.random().publicKey();
      const event = createEventResponse(
        poolId,
        [
          { value: 'delete_auction', type: 'symbol' },
          { value: auctionType, type: 'u32' },
          { value: user, type: 'address' },
        ],
        { value: null, type: null }
      );

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolDeleteAuctionEvent;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.DeleteAuction);
      expect(parsedV2Event.auctionType).toEqual(auctionType);
      expect(parsedV2Event.user).toEqual(user);

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse flash_loan event', () => {
      const assetAddress = Keypair.random().publicKey();
      const fromAddress = Keypair.random().publicKey();
      const contractAddress = Keypair.random().publicKey();

      const event: Api.RawEventResponse = {
        contractId: poolId,
        topic: [
          nativeToScVal('flash_loan', { type: 'symbol' }).toXDR('base64'),
          nativeToScVal(assetAddress, { type: 'address' }).toXDR('base64'),
          nativeToScVal(fromAddress, { type: 'address' }).toXDR('base64'),
          nativeToScVal(contractAddress, { type: 'address' }).toXDR('base64'),
        ],
        value: nativeToScVal([1000n, 1010n], { type: 'i128' }).toXDR('base64'),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV2Event = poolEventV2FromEventResponse(event) as PoolFlashLoanEvent;
      const parsedV1Event = poolEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(PoolEventType.FlashLoan);
      expect(parsedV2Event.asset).toEqual(assetAddress);
      expect(parsedV2Event.from).toEqual(fromAddress);
      expect(parsedV2Event.contract).toEqual(contractAddress);
      expect(parsedV2Event.tokensOut.toString()).toEqual('1000');
      expect(parsedV2Event.dTokensMinted.toString()).toEqual('1010');

      expect(parsedV1Event).toBeUndefined();
    });
  });
});
