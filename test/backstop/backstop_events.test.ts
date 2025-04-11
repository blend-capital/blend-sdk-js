import { Api } from '@stellar/stellar-sdk/rpc';
import {
  BlendContractType,
  BackstopEventType,
  backstopEventV1FromEventResponse,
  backstopEventV2FromEventResponse,
  BackstopDepositEvent,
  BackstopQ4WEvent,
  BackstopDequeueEvent,
  BackstopWithdrawEvent,
  BackstopGulpEmissionsV1Event,
  BackstopRewardZoneEvent,
  BackstopClaimEvent,
  BackstopDrawEvent,
  BackstopDonateEvent,
  BackstopGulpEmissionsV2Event,
  BackstopDistributeEvent,
  BackstopRewardZoneAddEvent,
  BackstopRewardZoneRemoveEvent,
} from '../../src';
import { Keypair, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { vecToScVal, createEventResponse } from '../utils/event_helpers';

describe('Backstop Event Parsing', () => {
  const backstopId = Keypair.random().publicKey();
  const from = Keypair.random().publicKey();
  const poolAddress = Keypair.random().publicKey();
  const toAdd = Keypair.random().publicKey();
  const toRemove = Keypair.random().publicKey();
  const to = Keypair.random().publicKey();

  describe('Base Backstop Events', () => {
    it('should parse deposit event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'deposit', type: 'symbol' },
          { value: poolAddress, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [1000n, 950n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopDepositEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopDepositEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.contractType).toEqual(BlendContractType.Backstop);
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.Deposit);
      expect(parsedV1Event.poolAddress).toEqual(poolAddress);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('1000');
      expect(parsedV1Event.sharesMinted.toString()).toEqual('950');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse queue_withdrawal event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'queue_withdrawal', type: 'symbol' },
          { value: poolAddress, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [500n, 1687458000], type: ['i128', 'u64'] }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopQ4WEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopQ4WEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.QueueWithdrawal);
      expect(parsedV1Event.poolAddress).toEqual(poolAddress);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.shares.toString()).toEqual('500');
      expect(parsedV1Event.expiration).toEqual(1687458000);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse dequeue_withdrawal event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'dequeue_withdrawal', type: 'symbol' },
          { value: poolAddress, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: 300n, type: 'i128' }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopDequeueEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopDequeueEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.DequeueWithdrawal);
      expect(parsedV1Event.poolAddress).toEqual(poolAddress);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.shares.toString()).toEqual('300');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse withdraw event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'withdraw', type: 'symbol' },
          { value: poolAddress, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: [250n, 260n], type: ['i128', 'i128'] }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopWithdrawEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopWithdrawEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.Withdraw);
      expect(parsedV1Event.poolAddress).toEqual(poolAddress);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.shares.toString()).toEqual('250');
      expect(parsedV1Event.tokensWithdrawn.toString()).toEqual('260');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse claim event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'claim', type: 'symbol' },
          { value: from, type: 'address' },
        ],
        { value: 750n, type: 'i128' }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopClaimEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopClaimEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.Claim);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('750');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse draw event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'draw', type: 'symbol' },
          { value: poolAddress, type: 'address' },
        ],
        { value: [to, 800n], type: ['address', 'i128'] }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopDrawEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopDrawEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.Draw);
      expect(parsedV1Event.poolAddress).toEqual(poolAddress);
      expect(parsedV1Event.to).toEqual(to);
      expect(parsedV1Event.amount.toString()).toEqual('800');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });

    it('should parse donate event', () => {
      const event = createEventResponse(
        backstopId,
        [
          { value: 'donate', type: 'symbol' },
          { value: poolAddress, type: 'address' },
          { value: from, type: 'address' },
        ],
        { value: 100n, type: 'i128' }
      );

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopDonateEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopDonateEvent;

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.Donate);
      expect(parsedV1Event.poolAddress).toEqual(poolAddress);
      expect(parsedV1Event.from).toEqual(from);
      expect(parsedV1Event.amount.toString()).toEqual('100');

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event).toEqual(parsedV1Event);
    });
  });

  describe('V1 Backstop Events', () => {
    it('should parse gulp_emissions event (V1)', () => {
      const event = createEventResponse(backstopId, [{ value: 'gulp_emissions', type: 'symbol' }], {
        value: 5000n,
        type: 'i128',
      });

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopGulpEmissionsV1Event;
      const parsedV2Event = backstopEventV2FromEventResponse(event);

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.GulpEmissions);
      expect(parsedV1Event.newBLND.toString()).toEqual('5000');

      expect(parsedV2Event).toBeUndefined();
    });

    it('should parse reward_zone event', () => {
      const event = createEventResponse(backstopId, [{ value: 'rw_zone', type: 'symbol' }], {
        value: [toAdd, toRemove],
        type: ['address', 'address'],
      });

      const parsedV1Event = backstopEventV1FromEventResponse(event) as BackstopRewardZoneEvent;
      const parsedV2Event = backstopEventV2FromEventResponse(event);

      expect(parsedV1Event).toBeDefined();
      expect(parsedV1Event?.eventType).toEqual(BackstopEventType.RewardZone);
      expect(parsedV1Event.toAdd).toEqual(toAdd);
      expect(parsedV1Event.toRemove).toEqual(toRemove);

      expect(parsedV2Event).toBeUndefined();
    });
  });

  describe('V2 Backstop Events', () => {
    it('should parse gulp_emissions event (V2)', () => {
      const event = createEventResponse(backstopId, [{ value: 'gulp_emissions', type: 'symbol' }], {
        value: [3000n, 2000n],
        type: ['i128', 'i128'],
      });

      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopGulpEmissionsV2Event;
      const parsedV1Event = backstopEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(BackstopEventType.GulpEmissions);
      expect(parsedV2Event.newBackstopEmissions.toString()).toEqual('3000');
      expect(parsedV2Event.newPoolEmissions.toString()).toEqual('2000');

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse distribute event', () => {
      const event = createEventResponse(backstopId, [{ value: 'distribute', type: 'symbol' }], {
        value: 1500n,
        type: 'i128',
      });

      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopDistributeEvent;
      const parsedV1Event = backstopEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(BackstopEventType.Distribute);
      expect(parsedV2Event.newEmissions.toString()).toEqual('1500');

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse reward_zone_add event', () => {
      const event = createEventResponse(backstopId, [{ value: 'rw_zone_add', type: 'symbol' }], {
        value: [toAdd, toRemove],
        type: ['address', 'address'],
      });

      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopRewardZoneAddEvent;
      const parsedV1Event = backstopEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(BackstopEventType.RewardZoneAdd);
      expect(parsedV2Event.toAdd).toEqual(toAdd);
      expect(parsedV2Event.toRemove).toEqual(toRemove);

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse reward_zone_add event with undefined toRemove', () => {
      // Create an event where toRemove is null/undefined
      const event: Api.RawEventResponse = {
        contractId: backstopId,
        topic: [nativeToScVal('rw_zone_add', { type: 'symbol' }).toXDR('base64')],
        value: vecToScVal({
          value: [toAdd, xdr.ScVal.scvVoid()],
          type: ['address', null],
        }),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedV2Event = backstopEventV2FromEventResponse(event) as BackstopRewardZoneAddEvent;
      const parsedV1Event = backstopEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(BackstopEventType.RewardZoneAdd);
      expect(parsedV2Event.toAdd).toEqual(toAdd);
      expect(parsedV2Event.toRemove).toEqual(null);

      expect(parsedV1Event).toBeUndefined();
    });

    it('should parse reward_zone_remove event', () => {
      const event = createEventResponse(backstopId, [{ value: 'rw_zone_remove', type: 'symbol' }], {
        value: [toRemove],
        type: ['address'],
      });

      const parsedV2Event = backstopEventV2FromEventResponse(
        event
      ) as BackstopRewardZoneRemoveEvent;
      const parsedV1Event = backstopEventV1FromEventResponse(event);

      expect(parsedV2Event).toBeDefined();
      expect(parsedV2Event?.eventType).toEqual(BackstopEventType.RewardZoneRemove);
      expect(parsedV2Event.toRemove).toEqual(toRemove);

      expect(parsedV1Event).toBeUndefined();
    });
  });
});
