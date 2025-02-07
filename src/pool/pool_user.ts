import { rpc, xdr } from '@stellar/stellar-sdk';
import { Network, Reserve } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { PoolUserEmissionData, Positions } from './user_types.js';
import { Pool } from './pool.js';

export class PoolUser {
  constructor(
    public userId: string,
    public positions: Positions,
    public emissions: Map<number, PoolUserEmissionData>
  ) {}

  public static async load(network: Network, pool: Pool, userId: string): Promise<PoolUser> {
    const ledgerKeys: xdr.LedgerKey[] = [Positions.ledgerKey(pool.id, userId)];
    for (const reserve of pool.reserves.values()) {
      if (reserve.borrowEmissions) {
        ledgerKeys.push(
          PoolUserEmissionData.ledgerKey(pool.id, userId, reserve.getDTokenEmissionIndex())
        );
      }
      if (reserve.supplyEmissions) {
        ledgerKeys.push(
          PoolUserEmissionData.ledgerKey(pool.id, userId, reserve.getBTokenEmissionIndex())
        );
      }
    }
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const ledgerEntries = await stellarRpc.getLedgerEntries(...ledgerKeys);

    let positions: Positions = new Positions(new Map(), new Map(), new Map());
    const emissions: Map<number, PoolUserEmissionData> = new Map();
    for (const entry of ledgerEntries.entries) {
      const ledgerEntry = entry.val;
      const key = decodeEntryKey(ledgerEntry.contractData().key());
      switch (key) {
        case 'Positions':
          positions = Positions.fromLedgerEntryData(ledgerEntry);
          break;
        case `UserEmis`: {
          const reserve_emis_id =
            PoolUserEmissionData.getEmissionIndexFromLedgerEntryData(ledgerEntry);
          const reserve_data = PoolUserEmissionData.fromLedgerEntryData(ledgerEntry);
          emissions.set(reserve_emis_id, reserve_data);
          break;
        }
        default:
          throw Error(`Invalid reserve key: should not contain ${key}`);
      }
    }

    return new PoolUser(userId, positions, emissions);
  }

  /**
   * Get a non-collaterized supply position in bTokens
   * @param reserve
   * @returns
   */
  getSupplyBTokens(reserve: Reserve): bigint {
    const supply = this.positions.supply.get(reserve.config.index);
    if (supply == undefined) {
      return BigInt(0);
    }
    return supply;
  }

  /**
   * Get the non-collaterized supply position for a given reserve
   * @param reserve - The reserve
   * @returns The supply, or 0 if the position does not have any supply
   */
  getSupply(reserve: Reserve): bigint {
    const supply = this.positions.supply.get(reserve.config.index);
    return reserve.toAssetFromBToken(supply);
  }

  /**
   * Get the non-collaterized supply position for a given reserve as a floating point number
   * @param reserve - The reserve
   * @returns The supply, or 0 if the position does not have any supply
   */
  getSupplyFloat(reserve: Reserve): number {
    const supply = this.positions.supply.get(reserve.config.index);
    return reserve.toAssetFromBTokenFloat(supply);
  }

  /**
   * Get the collaterized supply position in bTokens
   * @param reserve
   * @returns
   */
  getCollateralBTokens(reserve: Reserve): bigint {
    const collateral = this.positions.collateral.get(reserve.config.index);
    if (collateral == undefined) {
      return BigInt(0);
    }
    return collateral;
  }

  /**
   * Get the collateral position for a given reserve
   * @param reserve - The reserve
   * @returns The collateral, or 0 if the position does not have any collateral
   */
  getCollateral(reserve: Reserve): bigint {
    const collateral = this.positions.collateral.get(reserve.config.index);
    return reserve.toAssetFromBToken(collateral);
  }

  /**
   * Get the collateral position for a given reserve as a floating point number
   * @param reserve - The reserve
   * @returns The collateral, or 0 if the position does not have any collateral
   */
  getCollateralFloat(reserve: Reserve): number {
    const collateral = this.positions.collateral.get(reserve.config.index);
    return reserve.toAssetFromBTokenFloat(collateral);
  }

  /**
   * Get the liability position in dTokens
   * @param reserve
   * @returns
   */
  getLiabilityDTokens(reserve: Reserve): bigint {
    const liability = this.positions.liabilities.get(reserve.config.index);
    if (liability == undefined) {
      return BigInt(0);
    }
    return liability;
  }

  /**
   * Get the liabilities position for a given reserve
   * @param reserve - The reserve
   * @returns The liabilities, or 0 if the position does not have any liabilities
   */
  getLiabilities(reserve: Reserve): bigint {
    const liability = this.positions.liabilities.get(reserve.config.index);
    return reserve.toAssetFromDToken(liability);
  }

  /**
   * Get the liabilities position for a given reserve as a floating point number
   * @param reserve - The reserve
   * @returns The liabilities, or 0 if the position does not have any liabilities
   */
  getLiabilitiesFloat(reserve: Reserve): number {
    const liability = this.positions.liabilities.get(reserve.config.index);
    return reserve.toAssetFromDTokenFloat(liability);
  }

  /**
   * Estimate the total emissions for the user as a floating point number
   * @returns The estimated emissions
   */
  public estimateEmissions(pool: Pool): { emissions: number; claimedTokens: number[] } {
    let totalEmissions = 0;
    const claimedTokens: number[] = [];
    for (const reserve of pool.reserves.values()) {
      // handle dToken emissions
      const d_token_id = reserve.getDTokenEmissionIndex();
      const d_token_data = this.emissions.get(d_token_id);
      const d_token_position = this.getLiabilityDTokens(reserve);
      if (reserve.borrowEmissions && (d_token_data || d_token_position > BigInt(0))) {
        let dTokenAccrual = 0;
        if (d_token_data) {
          dTokenAccrual = d_token_data.estimateAccrual(
            reserve.borrowEmissions,
            reserve.config.decimals,
            d_token_position
          );
        } else if (d_token_position > BigInt(0)) {
          // emissions began after user position was created, accrue all emissions
          const temp_d_token_data = new PoolUserEmissionData(BigInt(0), BigInt(0));
          dTokenAccrual = temp_d_token_data.estimateAccrual(
            reserve.borrowEmissions,
            reserve.config.decimals,
            d_token_position
          );
        }
        if (dTokenAccrual > 0) {
          claimedTokens.push(d_token_id);
          totalEmissions += dTokenAccrual;
        }
      }

      // handle bToken emissions
      const b_token_id = reserve.getBTokenEmissionIndex();
      const b_token_data = this.emissions.get(b_token_id);
      const b_token_position = this.getSupplyBTokens(reserve) + this.getCollateralBTokens(reserve);
      if (reserve.supplyEmissions && (b_token_data || b_token_position > BigInt(0))) {
        let bTokenAccrual = 0;
        if (b_token_data) {
          bTokenAccrual = b_token_data.estimateAccrual(
            reserve.supplyEmissions,
            reserve.config.decimals,
            b_token_position
          );
        } else if (b_token_position > BigInt(0)) {
          // emissions began after user position was created, accrue all emissions
          const temp_b_token_data = new PoolUserEmissionData(BigInt(0), BigInt(0));
          bTokenAccrual = temp_b_token_data.estimateAccrual(
            reserve.supplyEmissions,
            reserve.config.decimals,
            b_token_position
          );
        }
        if (bTokenAccrual > 0) {
          claimedTokens.push(b_token_id);
          totalEmissions += bTokenAccrual;
        }
      }
    }
    return {
      emissions: totalEmissions,
      claimedTokens,
    };
  }
}
