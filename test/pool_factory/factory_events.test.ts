import {
  BlendContractType,
  PoolFactoryEventType,
  poolFactoryEventFromEventResponse,
  PoolFactoryDeployEvent,
} from '../../src';
import { Keypair } from '@stellar/stellar-sdk';
import { createEventResponse } from '../utils/event_helpers';

describe('Pool Factory Event Parsing', () => {
  const factoryId = Keypair.random().publicKey();
  const poolAddress = Keypair.random().publicKey();

  describe('Pool Factory Events', () => {
    it('should parse deploy event', () => {
      const event = createEventResponse(factoryId, [{ value: 'deploy', type: 'symbol' }], {
        value: poolAddress,
        type: 'address',
      });

      const parsedEvent = poolFactoryEventFromEventResponse(event) as PoolFactoryDeployEvent;

      expect(parsedEvent).toBeDefined();
      expect(parsedEvent?.contractType).toEqual(BlendContractType.PoolFactory);
      expect(parsedEvent?.eventType).toEqual(PoolFactoryEventType.Deploy);
      expect(parsedEvent.poolAddress).toEqual(poolAddress);
    });
  });
});
