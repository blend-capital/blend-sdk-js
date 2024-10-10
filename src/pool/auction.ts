import { BackstopToken, FixedMath, i128, Pool, PoolOracle } from '../index.js';
import { AuctionData, PoolEvent, PoolEventType } from './index.js';
export enum AuctionType {
  Liquidation = 0,
  BadDebt = 1,
  Interest = 2,
}
export interface AuctionValue {
  lot: number;
  bid: number;
  effectiveLot: number;
  effectiveBid: number;
}

export class Auction {
  user: string;
  type: AuctionType;
  auctionData: AuctionData;
  // the timestamp of the auction creation
  timestamp: string | undefined;

  constructor(user: string, type: AuctionType, auctionData: AuctionData, timestamp?: string) {
    this.user = user;
    this.type = type;
    this.auctionData = auctionData;
    this.timestamp = timestamp;
  }

  /**
   * Scale the auction to a given block and percentage filled
   * @param scaleBlock - The block to scale the auction to
   * @param scalePercent - The percentage of the auction to scale to
   * @param filled - Whether the auction is filled
   * @returns The scaled auction
   */
  scale(scaleBlock: number, scalePercent: number, filled: boolean): ScaledAuction {
    const scaledAuction: AuctionData = {
      block: this.auctionData.block,
      bid: new Map(),
      lot: new Map(),
    };
    let lotModifier: bigint;
    let bidModifier: bigint;
    const fillBlockDelta = BigInt(scaleBlock - this.auctionData.block);
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
    for (const [assetId, amount] of Array.from(this.auctionData.lot)) {
      const scaledLot = FixedMath.mulFloor(
        FixedMath.mulFloor(amount, percentFillScaled, FixedMath.SCALAR_7),
        lotModifier,
        FixedMath.SCALAR_7
      );
      if (scaledLot > 0n) {
        scaledAuction.lot.set(assetId, BigInt(scaledLot));
      }
    }

    for (const [assetId, amount] of Array.from(this.auctionData.bid)) {
      const scaledBid = FixedMath.mulCeil(
        FixedMath.mulCeil(amount, percentFillScaled, FixedMath.SCALAR_7),
        bidModifier,
        FixedMath.SCALAR_7
      );
      if (scaledBid > 0) {
        scaledAuction.bid.set(assetId, BigInt(scaledBid));
      }
    }
    return new ScaledAuction(
      this.user,
      this.type,
      scaledAuction.bid,
      scaledAuction.lot,
      this.auctionData.block,
      scaleBlock,
      filled
    );
  }
}

export class ScaledAuction {
  type: AuctionType;
  user: string;
  bid: Map<string, i128>;
  lot: Map<string, i128>;
  startBlock: number;
  scaleBlock: number;
  filled: boolean;
  // the hash of the transaction that filled the auction
  hash: string | undefined;
  // the timestamp of the auction creation
  timestamp: string | undefined;

  constructor(
    user: string,
    type: AuctionType,
    bid: Map<string, i128>,
    lot: Map<string, i128>,
    startBlock: number,
    scaleBlock: number,
    filled: boolean,
    hash?: string,
    timestamp?: string
  ) {
    this.user = user;
    this.type = type;
    this.bid = bid;
    this.lot = lot;
    this.startBlock = startBlock;
    this.scaleBlock = scaleBlock;
    this.filled = filled;
    this.hash = hash;
    this.timestamp = timestamp;
  }

  /**
   * Creates an array of scaled auctions from events representing the state of the auctions at the current ledger
   * @param events - The events to create the scaled auctions from
   * @param backstopId - The address of the backstop
   * @param currLedger - The current ledger
   * @returns An array of scaled auctions
   */
  static fromEvents(events: PoolEvent[], backstopId: string, currLedger: number): ScaledAuction[] {
    const auctions: Auction[] = [];
    const scaledAuctions: ScaledAuction[] = [];
    for (const event of events ?? []) {
      switch (event.eventType) {
        case PoolEventType.NewLiquidationAuction:
          auctions.unshift(
            new Auction(
              event.user,
              AuctionType.Liquidation,
              event.auctionData,
              event.ledgerClosedAt
            )
          );
          break;
        case PoolEventType.NewAuction:
          auctions.unshift(
            new Auction(backstopId, event.auctionType, event.auctionData, event.ledgerClosedAt)
          );
          break;
        case PoolEventType.FillAuction: {
          const index = auctions.findIndex(
            (auction) => auction.user === event.user && auction.type === event.auctionType
          );
          if (index !== -1) {
            const auction = auctions[index];
            let scaledAuction: ScaledAuction;
            if (event.fillAmount < BigInt(100)) {
              scaledAuction = auction.scale(event.ledger, Number(event.fillAmount), true);
              // Scale the auction to start block + 200 to get full auction
              const remainingAuction = auction.scale(
                auction.auctionData.block + 200,
                100 - Number(event.fillAmount),
                false
              );
              auction.auctionData.lot = remainingAuction.lot;
              auction.auctionData.bid = remainingAuction.bid;
            } else {
              scaledAuction = auction.scale(event.ledger, 0, true);
              // Remove the auction from the list
              auctions.splice(index, 1);
            }

            scaledAuction.hash = event.txHash;
            scaledAuction.timestamp = auction.timestamp;
            scaledAuctions.push(scaledAuction);
          }
          break;
        }
        case PoolEventType.DeleteLiquidationAuction: {
          const deleteIndex = auctions.findIndex((auction) => auction.user === event.user);
          if (deleteIndex !== -1) {
            auctions.splice(deleteIndex, 1);
          }
          break;
        }
      }
    }
    for (const auction of auctions) {
      const scaledAuction = auction.scale(currLedger, 100, false);
      scaledAuction.timestamp = auction.timestamp;
      scaledAuctions.push(scaledAuction);
    }
    return scaledAuctions;
  }

  /**
   * Calculate the effective and nominal value of the auction as floats
   * @param pool - The pool the auction is in
   * @param oracle - The oracle for the pool
   * @param backstopToken - The backstop token for the pool
   * @returns The effective and nominal value of the auction
   */
  oracleValue(pool: Pool, oracle: PoolOracle, backstopToken: BackstopToken): AuctionValue {
    let lotValue = 0;
    let bidValue = 0;
    let effectiveLotValue = 0;
    let effectiveBidValue = 0;

    for (const [asset, amount] of Array.from(this.lot.entries())) {
      if (this.type === AuctionType.BadDebt) {
        lotValue += FixedMath.toFloat(amount, 7) * backstopToken.lpTokenPrice;
      } else {
        const reserve = pool.reserves.get(asset);
        const price = oracle.getPriceFloat(asset);
        if (reserve === undefined) {
          throw Error(`Undefined reserve for asset: ${asset}`);
        } else if (price === undefined) {
          throw Error(`Undefined price for asset: ${asset}`);
        } else if (this.type === AuctionType.Interest) {
          lotValue += FixedMath.toFloat(amount, reserve.config.decimals) * price;
        } else {
          lotValue += reserve.toAssetFromBTokenFloat(amount) * price;
          effectiveLotValue += reserve.toEffectiveAssetFromBTokenFloat(amount) * price;
        }
      }
    }
    for (const [asset, amount] of Array.from(this.bid.entries())) {
      if (this.type === AuctionType.Interest) {
        bidValue += FixedMath.toFloat(amount, 7) * backstopToken.lpTokenPrice;
      } else {
        const reserve = pool.reserves.get(asset);
        const price = oracle.getPriceFloat(asset);
        if (reserve === undefined) {
          throw Error(`Undefined reserve for asset: ${asset}`);
        } else if (price === undefined) {
          throw Error(`Undefined price for asset: ${asset}`);
        } else {
          bidValue += reserve.toAssetFromDTokenFloat(amount) * price;
          effectiveBidValue += reserve.toEffectiveAssetFromBTokenFloat(amount) * price;
        }
      }
    }

    return {
      lot: lotValue,
      bid: bidValue,
      effectiveLot: effectiveLotValue,
      effectiveBid: effectiveBidValue,
    };
  }
}
