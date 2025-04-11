import { Api } from '@stellar/stellar-sdk/rpc';
import {
  BlendContractType,
  EmitterEventType,
  emitterEventFromEventResponse,
  EmitterDistributeEvent,
  EmitterQueueSwapEvent,
  EmitterDeleteSwapEvent,
  EmitterSwapEvent,
  EmitterDropEvent,
  Swap,
} from '../../src';
import { Keypair, nativeToScVal } from '@stellar/stellar-sdk';
import { createEventResponse } from '../utils/event_helpers';

describe('Emitter Event Parsing', () => {
  const emitterId = Keypair.random().publicKey();
  const backstopAddress = Keypair.random().publicKey();
  const newBackstopAddress = Keypair.random().publicKey();
  const newBackstopTokenAddress = Keypair.random().publicKey();

  // Mock Swap object
  const mockSwap: Swap = {
    new_backstop: newBackstopAddress,
    new_backstop_token: newBackstopTokenAddress,
    unlock_time: 1687458000n,
  };

  describe('Emitter Events', () => {
    it('should parse distribute event', () => {
      const event = createEventResponse(emitterId, [{ value: 'distribute', type: 'symbol' }], {
        value: [backstopAddress, 5000n],
        type: ['address', 'i128'],
      });

      const parsedEvent = emitterEventFromEventResponse(event) as EmitterDistributeEvent;

      expect(parsedEvent).toBeDefined();
      expect(parsedEvent?.contractType).toEqual(BlendContractType.Emitter);
      expect(parsedEvent?.eventType).toEqual(EmitterEventType.Distribute);
      expect(parsedEvent.backstop).toEqual(backstopAddress);
      expect(parsedEvent.amount.toString()).toEqual('5000');
    });

    it('should parse queue_swap event', () => {
      // Create a mock event with the appropriate Swap structure
      const event: Api.RawEventResponse = {
        contractId: emitterId,
        topic: [nativeToScVal('q_swap', { type: 'symbol' }).toXDR('base64')],
        value: nativeToScVal(mockSwap, {
          type: {
            new_backstop: ['symbol', 'address'],
            new_backstop_token: ['symbol', 'address'],
            unlock_time: ['symbol', 'i128'],
          },
        }).toXDR('base64'),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedEvent = emitterEventFromEventResponse(event) as EmitterQueueSwapEvent;

      expect(parsedEvent).toBeDefined();
      expect(parsedEvent?.contractType).toEqual(BlendContractType.Emitter);
      expect(parsedEvent?.eventType).toEqual(EmitterEventType.QueueSwap);
      expect(parsedEvent.swap).toBeDefined();
      expect(parsedEvent.swap.new_backstop).toEqual(mockSwap.new_backstop);
      expect(parsedEvent.swap.new_backstop_token).toEqual(mockSwap.new_backstop_token);
      expect(parsedEvent.swap.unlock_time).toEqual(mockSwap.unlock_time);
    });

    it('should parse delete_swap event', () => {
      // Create a mock event with the appropriate Swap structure
      const event: Api.RawEventResponse = {
        contractId: emitterId,
        topic: [nativeToScVal('del_swap', { type: 'symbol' }).toXDR('base64')],
        value: nativeToScVal(mockSwap, {
          type: {
            new_backstop: ['symbol', 'address'],
            new_backstop_token: ['symbol', 'address'],
            unlock_time: ['symbol', 'i128'],
          },
        }).toXDR('base64'),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedEvent = emitterEventFromEventResponse(event) as EmitterDeleteSwapEvent;

      expect(parsedEvent).toBeDefined();
      expect(parsedEvent?.contractType).toEqual(BlendContractType.Emitter);
      expect(parsedEvent?.eventType).toEqual(EmitterEventType.DeleteSwap);
      expect(parsedEvent.swap).toBeDefined();
      expect(parsedEvent.swap.new_backstop).toEqual(mockSwap.new_backstop);
      expect(parsedEvent.swap.new_backstop_token).toEqual(mockSwap.new_backstop_token);
      expect(parsedEvent.swap.unlock_time).toEqual(mockSwap.unlock_time);
    });

    it('should parse swap event', () => {
      // Create a mock event with the appropriate Swap structure
      const event: Api.RawEventResponse = {
        contractId: emitterId,
        topic: [nativeToScVal('swap', { type: 'symbol' }).toXDR('base64')],
        value: nativeToScVal(mockSwap, {
          type: {
            new_backstop: ['symbol', 'address'],
            new_backstop_token: ['symbol', 'address'],
            unlock_time: ['symbol', 'i128'],
          },
        }).toXDR('base64'),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedEvent = emitterEventFromEventResponse(event) as EmitterSwapEvent;

      expect(parsedEvent).toBeDefined();
      expect(parsedEvent?.contractType).toEqual(BlendContractType.Emitter);
      expect(parsedEvent?.eventType).toEqual(EmitterEventType.Swap);
      expect(parsedEvent.swap).toBeDefined();
      expect(parsedEvent.swap.new_backstop).toEqual(mockSwap.new_backstop);
      expect(parsedEvent.swap.new_backstop_token).toEqual(mockSwap.new_backstop_token);
      expect(parsedEvent.swap.unlock_time).toEqual(mockSwap.unlock_time);
    });

    it('should parse drop event', () => {
      // A mock drop list
      const dropList = [
        { address: Keypair.random().publicKey(), amount: 100n },
        { address: Keypair.random().publicKey(), amount: 200n },
      ];

      const event: Api.RawEventResponse = {
        contractId: emitterId,
        topic: [nativeToScVal('drop', { type: 'symbol' }).toXDR('base64')],
        value: nativeToScVal(dropList).toXDR('base64'),
        id: '1',
        type: 'contract',
        ledger: 123,
        ledgerClosedAt: '2025-04-08T12:34:56Z',
        pagingToken: 'test-token',
        inSuccessfulContractCall: true,
        txHash: 'txhash123',
      };

      const parsedEvent = emitterEventFromEventResponse(event) as EmitterDropEvent;

      expect(parsedEvent).toBeDefined();
      expect(parsedEvent?.contractType).toEqual(BlendContractType.Emitter);
      expect(parsedEvent?.eventType).toEqual(EmitterEventType.Drop);
      expect(parsedEvent.list).toBeDefined();
      expect(Array.isArray(parsedEvent.list)).toBe(true);
      expect(parsedEvent.list.length).toEqual(2);
      expect(parsedEvent.list[0]).toBeDefined();
      expect(parsedEvent.list[1]).toBeDefined();
      expect(parsedEvent.list[0].address).toEqual(dropList[0].address);
      expect(parsedEvent.list[0].amount.toString()).toEqual('100');
      expect(parsedEvent.list[1].address).toEqual(dropList[1].address);
      expect(parsedEvent.list[1].amount.toString()).toEqual('200');
    });
  });
});
