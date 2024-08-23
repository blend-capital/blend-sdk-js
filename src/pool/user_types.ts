import { Address, SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { UserEmissions } from '../emissions.js';
import { Network, i128, u32 } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';
import { Reserve } from './reserve.js';

export class UserPositions {
  constructor(
    public liabilities: Map<u32, i128>,
    public collateral: Map<u32, i128>,
    public supply: Map<u32, i128>
  ) {}

  static ledgerKey(poolId: string, userId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('Positions'),
      Address.fromString(userId).toScVal(),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static async load(network: Network, poolId: string, userId: string): Promise<UserPositions> {
    const rpc = new SorobanRpc.Server(network.rpc, network.opts);
    const userPositionsKey = UserPositions.ledgerKey(poolId, userId);
    const positionResp = await rpc.getLedgerEntries(userPositionsKey);

    // if entry does not exist assume empty
    if (positionResp.entries == undefined || positionResp.entries.length == 0) {
      return new UserPositions(new Map<u32, i128>(), new Map<u32, i128>(), new Map<u32, i128>());
    }

    let userPositions: UserPositions | undefined = undefined;
    for (const entry of positionResp.entries ?? []) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'Positions':
          userPositions = UserPositions.fromLedgerEntryData(ledgerData);
          break;
        default:
          throw Error(`Invalid user positions key: should not contain: ${key}`);
      }
    }
    if (userPositions == undefined) {
      throw Error("Unable to load user's positions");
    }
    return userPositions;
  }

  static fromLedgerEntryData(ledger_entry_data: xdr.LedgerEntryData | string): UserPositions {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }

    const data_entry_map = ledger_entry_data.contractData().val().map();
    if (data_entry_map == undefined) {
      throw Error('UserPositions contract data value is not a map');
    }
    let liability_map: Map<u32, i128> | undefined;
    let collateral_map: Map<u32, i128> | undefined;
    let supply_map: Map<u32, i128> | undefined;

    for (const map_entry of data_entry_map) {
      const key = decodeEntryKey(map_entry.key());
      switch (key) {
        case 'liabilities': {
          liability_map = new Map<u32, i128>();
          const liabilities = map_entry.val().map();
          if (liabilities) {
            for (const liability of liabilities) {
              liability_map.set(liability.key().u32(), scValToNative(liability.val()));
            }
          }
          break;
        }
        case 'collateral': {
          collateral_map = new Map<u32, i128>();
          const collaterals = map_entry.val().map();
          if (collaterals) {
            for (const collateral of collaterals) {
              collateral_map.set(collateral.key().u32(), scValToNative(collateral.val()));
            }
          }
          break;
        }
        case 'supply': {
          supply_map = new Map<u32, i128>();
          const supplies = map_entry.val().map();
          if (supplies) {
            for (const supply of supplies) {
              supply_map.set(supply.key().u32(), scValToNative(supply.val()));
            }
          }
          break;
        }
        default:
          throw Error(`Invalid UserPositions key: should not contain ${key}`);
      }
    }

    if (!liability_map || !collateral_map || !supply_map) {
      throw Error('User positions xdr_string is malformed');
    }
    return new UserPositions(liability_map, collateral_map, supply_map);
  }

  /**
   * Get a non-collaterized supply position in bTokens
   * @param reserve
   * @returns
   */
  getSupplyBTokens(reserve: Reserve): bigint {
    const supply = this.supply.get(reserve.config.index);
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
    const supply = this.supply.get(reserve.config.index);
    return reserve.toAssetFromBToken(supply);
  }

  /**
   * Get the non-collaterized supply position for a given reserve as a floating point number
   * @param reserve - The reserve
   * @returns The supply, or 0 if the position does not have any supply
   */
  getSupplyFloat(reserve: Reserve): number {
    const supply = this.supply.get(reserve.config.index);
    return reserve.toAssetFromBTokenFloat(supply);
  }

  /**
   * Get the collaterized supply position in bTokens
   * @param reserve
   * @returns
   */
  getCollateralBTokens(reserve: Reserve): bigint {
    const collateral = this.collateral.get(reserve.config.index);
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
    const collateral = this.collateral.get(reserve.config.index);
    return reserve.toAssetFromBToken(collateral);
  }

  /**
   * Get the collateral position for a given reserve as a floating point number
   * @param reserve - The reserve
   * @returns The collateral, or 0 if the position does not have any collateral
   */
  getCollateralFloat(reserve: Reserve): number {
    const collateral = this.collateral.get(reserve.config.index);
    return reserve.toAssetFromBTokenFloat(collateral);
  }

  /**
   * Get the liability position in dTokens
   * @param reserve
   * @returns
   */
  getLiabilityDTokens(reserve: Reserve): bigint {
    const liability = this.liabilities.get(reserve.config.index);
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
    const liability = this.liabilities.get(reserve.config.index);
    return reserve.toAssetFromDToken(liability);
  }

  /**
   * Get the liabilities position for a given reserve as a floating point number
   * @param reserve - The reserve
   * @returns The liabilities, or 0 if the position does not have any liabilities
   */
  getLiabilitiesFloat(reserve: Reserve): number {
    const liability = this.liabilities.get(reserve.config.index);
    return reserve.toAssetFromDTokenFloat(liability);
  }
}

export class PoolUserEmissionData extends UserEmissions {
  static ledgerKey(poolId: string, userId: string, reserveTokenIndex: number): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('UserEmis'),
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('reserve_id'),
          val: xdr.ScVal.scvU32(reserveTokenIndex),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('user'),
          val: Address.fromString(userId).toScVal(),
        }),
      ]),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  static getEmissionIndexFromLedgerEntryData(
    ledger_entry_data: xdr.LedgerEntryData | string
  ): number {
    if (typeof ledger_entry_data == 'string') {
      ledger_entry_data = xdr.LedgerEntryData.fromXDR(ledger_entry_data, 'base64');
    }
    const emission_index = ledger_entry_data
      ?.contractData()
      ?.key()
      ?.vec()
      ?.at(1)
      ?.map()
      ?.at(0)
      ?.val()
      ?.u32();
    if (emission_index == undefined) {
      throw new Error("Invalid userEmissionData: should contain 'reserve_id'");
    }
    return emission_index;
  }
}
