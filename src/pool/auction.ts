import { FixedMath } from '../index.js';
import { AuctionData, PoolEventType, PoolV1Event, PoolV2Event } from './index.js';
export enum AuctionType {
  Liquidation = 0,
  BadDebt = 1,
  Interest = 2,
}
export interface Auctions {
  /**
   * Represents the filled auctions
   */
  filled: ScaledAuction[];
  /**
   * Represents the ongoing auctions
   * @DEV The auctions must be scaled to the current block to accurately represent the ongoing auctions
   */
  ongoing: Auction[];
}

export interface ScaledAuction {
  type: AuctionType;
  user: string;
  data: AuctionData;
  scaleBlock: number;
  filled: boolean;
  fillHash: string | undefined;
}

/**
 * Creates an Auctions object from events representing the ongoing and filled auctions
 * @param events - The events to create the scaled auctions from
 * @param backstopId - The address of the backstop
 * @returns An array of scaled auctions sorted by filled status and block
 */
export function getAuctionsfromV1Events(events: PoolV1Event[], backstopId: string): Auctions {
  const auctions: Auctions = { filled: [], ongoing: [] };
  for (const event of events ?? []) {
    switch (event.eventType) {
      case PoolEventType.NewLiquidationAuction:
        auctions.ongoing.push(new Auction(event.user, AuctionType.Liquidation, event.auctionData));
        break;
      case PoolEventType.NewAuction:
        auctions.ongoing.push(new Auction(backstopId, event.auctionType, event.auctionData));
        break;
      case PoolEventType.FillAuction: {
        const index = auctions.ongoing.findIndex(
          (auction) => auction.user === event.user && auction.type === event.auctionType
        );
        if (index !== -1) {
          const auction = auctions.ongoing[index];
          const [filledAuction, remainingAuction] = auction.scale(
            event.ledger,
            Number(event.fillAmount)
          );
          filledAuction.filled = true;
          filledAuction.fillHash = event.txHash;
          auctions.filled.push(filledAuction);
          if (remainingAuction !== undefined) {
            auctions.ongoing[index] = remainingAuction;
          } else {
            auctions.ongoing.splice(index, 1);
          }
        }
        break;
      }
      case PoolEventType.DeleteLiquidationAuction: {
        const deleteIndex = auctions.ongoing.findIndex((auction) => auction.user === event.user);
        if (deleteIndex !== -1) {
          auctions.ongoing.splice(deleteIndex, 1);
        }
        break;
      }
    }
  }
  return auctions;
}

export function getAuctionsfromV2Events(events: PoolV2Event[]): Auctions {
  const auctions: Auctions = { filled: [], ongoing: [] };
  for (const event of events ?? []) {
    switch (event.eventType) {
      case PoolEventType.NewAuction:
        auctions.ongoing.push(new Auction(event.user, event.auctionType, event.auctionData));
        break;

      case PoolEventType.FillAuction: {
        const index = auctions.ongoing.findIndex(
          (auction) => auction.user === event.user && auction.type === event.auctionType
        );
        if (index !== -1) {
          const filledAuction: ScaledAuction = {
            type: event.auctionType,
            user: event.user,
            data: event.filledAuctionData,
            scaleBlock: event.ledger,
            filled: true,
            fillHash: event.txHash,
          };
          auctions.filled.push(filledAuction);

          if (event.fillAmount === 100n) {
            auctions.ongoing.splice(index, 1);
          } else {
            const auction = auctions.ongoing[index];
            for (const [asset, filledAmount] of event.filledAuctionData.lot) {
              const preFillAmount = auction.data.lot.get(asset) ?? 0n;
              auction.data.lot.set(asset, preFillAmount - filledAmount);
            }
            for (const [asset, filledAmount] of event.filledAuctionData.bid) {
              const preFillAmount = auction.data.bid.get(asset) ?? 0n;
              auction.data.bid.set(asset, preFillAmount - filledAmount);
            }
            auctions.ongoing[index] = auction;
          }
        }
        break;
      }
      case PoolEventType.DeleteAuction: {
        const deleteIndex = auctions.ongoing.findIndex((auction) => auction.user === event.user);
        if (deleteIndex !== -1) {
          auctions.ongoing.splice(deleteIndex, 1);
        }
        break;
      }
      case PoolEventType.DeleteLiquidationAuction: {
        const deleteIndex = auctions.ongoing.findIndex((auction) => auction.user === event.user);
        if (deleteIndex !== -1) {
          auctions.ongoing.splice(deleteIndex, 1);
        }
        break;
      }
    }
  }
  return auctions;
}

export class Auction {
  user: string;
  type: AuctionType;
  data: AuctionData;

  constructor(user: string, type: AuctionType, data: AuctionData) {
    this.user = user;
    this.type = type;
    this.data = data;
  }

  /**
   * Scale the auction to a given block and percentage filled
   * @dev Rescaling a scaled auction will result in incorrect values
   * @param scaleBlock - The block to scale the auction to
   * @param scalePercent - The percentage of the auction to scale to (default 100)
   * @returns Returns a tuple of the scaled auction and the remaining auction in that order
   */
  scale(scaleBlock: number, scalePercent = 100): [ScaledAuction, Auction | undefined] {
    const scaledAuctionData: AuctionData = {
      block: this.data.block,
      bid: new Map(),
      lot: new Map(),
    };
    const remainingAuctionData: AuctionData = {
      block: this.data.block,
      bid: new Map(),
      lot: new Map(),
    };
    let lotModifier: bigint;
    let bidModifier: bigint;
    const fillBlockDelta = BigInt(scaleBlock - this.data.block);
    const perBlockScaler = BigInt(50000);
    const percentFillScaled = BigInt(scalePercent * 100000);

    if (fillBlockDelta <= 200n) {
      lotModifier = fillBlockDelta * perBlockScaler;
      bidModifier = FixedMath.SCALAR_7;
    } else {
      lotModifier = FixedMath.SCALAR_7;
      if (fillBlockDelta < 400n) {
        bidModifier = FixedMath.SCALAR_7 - (fillBlockDelta - 200n) * perBlockScaler;
      } else {
        bidModifier = 0n;
      }
    }

    for (const [assetId, amount] of Array.from(this.data.lot)) {
      const baseFill = FixedMath.mulFloor(amount, percentFillScaled, FixedMath.SCALAR_7);
      const remainingBase = amount - baseFill;
      if (remainingBase > 0n) {
        remainingAuctionData.lot.set(assetId, remainingBase);
      }
      const scaledLot = FixedMath.mulFloor(baseFill, lotModifier, FixedMath.SCALAR_7);
      scaledAuctionData.lot.set(assetId, BigInt(scaledLot));
    }

    for (const [assetId, amount] of Array.from(this.data.bid)) {
      const baseFill = FixedMath.mulCeil(amount, percentFillScaled, FixedMath.SCALAR_7);
      const remainingBase = amount - baseFill;
      if (remainingBase > 0n) {
        remainingAuctionData.bid.set(assetId, remainingBase);
      }
      const scaledBid = FixedMath.mulCeil(baseFill, bidModifier, FixedMath.SCALAR_7);
      scaledAuctionData.bid.set(assetId, BigInt(scaledBid));
    }
    let remainingAuction: Auction | undefined = undefined;
    const scaledAuction: ScaledAuction = {
      type: this.type,
      user: this.user,
      data: scaledAuctionData,
      scaleBlock: scaleBlock,
      filled: false,
      fillHash: undefined,
    };
    if (remainingAuctionData.lot.size > 0 || remainingAuctionData.bid.size > 0) {
      remainingAuction = new Auction(this.user, this.type, remainingAuctionData);
    }
    return [scaledAuction, remainingAuction];
  }
}
