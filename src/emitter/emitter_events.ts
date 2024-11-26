import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { BaseBlendEvent, BlendContractType } from '../base_event.js';
import { Swap } from './index.js';

export enum EmitterEventType {
  Distribute = 'distribute',
  QueueSwap = 'q_swap',
  DeleteSwap = 'del_swap',
  Swap = 'swap',
  Drop = 'drop',
}

export interface BaseEmitterEvent extends BaseBlendEvent {
  contractType: BlendContractType.Emitter;
}

export interface EmitterDistributeEvent extends BaseEmitterEvent {
  eventType: EmitterEventType.Distribute;
  backstop: string;
  amount: bigint;
}

export interface EmitterQueueSwapEvent extends BaseEmitterEvent {
  eventType: EmitterEventType.QueueSwap;
  swap: Swap;
}

export interface EmitterDeleteSwapEvent extends BaseEmitterEvent {
  eventType: EmitterEventType.DeleteSwap;
  swap: Swap;
}

export interface EmitterSwapEvent extends BaseEmitterEvent {
  eventType: EmitterEventType.Swap;
  swap: Swap;
}

export interface EmitterDropEvent extends BaseEmitterEvent {
  eventType: EmitterEventType.Drop;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: any;
}

export type EmitterEvent =
  | EmitterDistributeEvent
  | EmitterQueueSwapEvent
  | EmitterDeleteSwapEvent
  | EmitterSwapEvent
  | EmitterDropEvent;

/**
 * Create an EmitterEvent from a RawEventResponse.
 * @param eventResponse - The RawEventResponse from the RPC to convert
 * @returns The EmitterEvent or undefined if the EventResponse is not an EmitterEvent
 */
export function emitterEventFromEventResponse(
  eventResponse: rpc.Api.RawEventResponse
): EmitterEvent | undefined {
  if (
    eventResponse.type !== 'contract' ||
    eventResponse.topic.length === 0 ||
    eventResponse.contractId === undefined
  ) {
    return undefined;
  }

  try {
    // NOTE: Decode RawEventResponse to ScVals. Do not update to `rpc.Api.EventResponse`. This
    // will cause failures in the conversion functions due to the requirement that the exact same
    // `js-xdr` code is used. (the same version from two different sources does not work)
    const topic_scval = eventResponse.topic.map((topic) => xdr.ScVal.fromXDR(topic, 'base64'));
    const value_scval = xdr.ScVal.fromXDR(eventResponse.value, 'base64');

    // The first topic is the event name as a symbol
    const eventString = scValToNative(topic_scval[0]) as string;

    const baseEvent = {
      id: eventResponse.id,
      contractId: eventResponse.contractId,
      contractType: BlendContractType.Emitter,
      eventType: eventString as EmitterEventType,
      ledger: eventResponse.ledger,
      ledgerClosedAt: eventResponse.ledgerClosedAt,
      txHash: eventResponse.txHash,
    };
    switch (eventString) {
      case EmitterEventType.Distribute: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 1 || valueAsVec.length !== 2) {
          return undefined;
        }
        const backstop = Address.fromScVal(valueAsVec[0]).toString();
        const amount = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: EmitterEventType.Distribute,
          backstop: backstop,
          amount: amount,
        } as EmitterDistributeEvent;
      }
      case EmitterEventType.QueueSwap: {
        if (topic_scval.length !== 1) {
          return undefined;
        }
        const swap = scValToNative(value_scval) as Swap;
        if (
          swap.new_backstop === undefined ||
          swap.new_backstop_token === undefined ||
          swap.unlock_time === undefined
        ) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: EmitterEventType.QueueSwap,
          swap: swap,
        } as EmitterQueueSwapEvent;
      }
      case EmitterEventType.DeleteSwap: {
        if (topic_scval.length !== 1) {
          return undefined;
        }
        const swap = scValToNative(value_scval) as Swap;
        if (
          swap.new_backstop === undefined ||
          swap.new_backstop_token === undefined ||
          swap.unlock_time === undefined
        ) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: EmitterEventType.DeleteSwap,
          swap: swap,
        } as EmitterDeleteSwapEvent;
      }
      case EmitterEventType.Swap: {
        if (topic_scval.length !== 1) {
          return undefined;
        }
        const swap = scValToNative(value_scval) as Swap;
        if (
          swap.new_backstop === undefined ||
          swap.new_backstop_token === undefined ||
          swap.unlock_time === undefined
        ) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: EmitterEventType.Swap,
          swap: swap,
        } as EmitterSwapEvent;
      }
      case EmitterEventType.Drop: {
        if (topic_scval.length !== 1) {
          return undefined;
        }
        const list = scValToNative(value_scval);
        return {
          ...baseEvent,
          eventType: EmitterEventType.Drop,
          list: list,
        } as EmitterDropEvent;
      }
      default:
        return undefined;
    }
  } catch (e) {
    // conversion functions throw on a malformed (or non-emitter) events
    // return undefined in this case
    return undefined;
  }
}
