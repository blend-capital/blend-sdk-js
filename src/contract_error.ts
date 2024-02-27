import { xdr } from 'stellar-sdk';
import { SorobanRpc } from 'stellar-sdk';
export class ContractError extends Error {
  /**
   * The type of the error
   */
  public type: ContractErrorType;

  constructor(type: ContractErrorType, message: string) {
    super(message);
    this.type = type;
  }
}

export enum ContractErrorType {
  UnknownError = -1000,

  // Transaction Submission Errors
  txSorobanInvalid = -24,
  txMalformed = -23,
  txBadMinSeqAgeOrGap = -22,
  txBadSponsorship = -21,
  txFeeBumpInnerFailed = -20,
  txNotSupported = -19,
  txInternalError = -18,
  txBadAuthExtra = -17,
  txInsufficientFee = -16,
  txNoAccount = -15,
  txInsufficientBalance = -14,
  txBadAuth = -13,
  txBadSeq = -12,
  txMissingOperation = -11,
  txTooLate = -10,
  txTooEarly = -9,

  // Host Function Errors
  InvokeHostFunctionInsufficientRefundableFee = -5,
  InvokeHostFunctionEntryArchived = -4,
  InvokeHostFunctionResourceLimitExceeded = -3,
  InvokeHostFunctionTrapped = -2,
  InvokeHostFunctionMalformed = -1,

  // Common Errors
  InternalError = 1,
  AlreadyInitializedError = 3,

  UnauthorizedError = 4,

  NegativeAmountError = 8,
  BalanceError = 10,
  OverflowError = 12,

  // Backstop
  BackstopBadRequest = 1000,
  NotExpired = 1001,
  InvalidRewardZoneEntry = 1002,
  InsufficientFunds = 1003,
  NotPool = 1004,
  InvalidShareMintAmount = 1005,
  InvalidTokenWithdrawAmount = 1006,

  // Pool Request Errors (start at 1200)
  PoolBadRequest = 1200,
  InvalidPoolInitArgs = 1201,
  InvalidReserveMetadata = 1202,
  InitNotUnlocked = 1203,
  StatusNotAllowed = 1204,

  // Pool State Errors
  InvalidHf = 1205,
  InvalidPoolStatus = 1206,
  InvalidUtilRate = 1207,
  MaxPositionsExceeded = 1208,
  InternalReserveNotFound = 1209,

  // Oracle Errors
  StalePrice = 1210,

  // Auction Errors
  InvalidLiquidation = 1211,
  AuctionInProgress = 1212,
  InvalidLiqTooLarge = 1213,
  InvalidLiqTooSmall = 1214,
  InterestTooSmall = 1215,

  // Pool Factory
  InvalidPoolFactoryInitArgs = 1300,
}

export function parseError(
  errorResult: xdr.TransactionResult | SorobanRpc.Api.SimulateTransactionErrorResponse
): ContractError {
  if ('id' in errorResult) {
    // Transaction simulation failed
    errorResult = errorResult as SorobanRpc.Api.SimulateTransactionErrorResponse;

    const match = errorResult.error.match(/Error\(Contract, #(\d+)\)/);
    if (match) {
      let errorValue = parseInt(match[1], 10);
      if (errorValue in ContractErrorType)
        return new ContractError(errorValue as ContractErrorType, errorResult.error);
    }
    return new ContractError(ContractErrorType.UnknownError, errorResult.error);
  } else {
    // Transaction submission failed
    const txErrorName = errorResult.result().switch().name;

    // Use invokeHostFunctionErrors in case of generic `txFailed` error
    if (txErrorName == 'txFailed') {
      // Transaction should only contain one operation
      if (errorResult.result().results().length == 1) {
        const hostFunctionError = errorResult
          .result()
          .results()[0]
          .tr()
          .invokeHostFunctionResult()
          .switch().value;
        if (hostFunctionError in ContractErrorType)
          return new ContractError(
            hostFunctionError as ContractErrorType,
            JSON.stringify(errorResult, null, 2)
          );
      }
    }

    // Shift the error value to avoid collision with invokeHostFunctionErrors
    const txErrorValue = errorResult.result().switch().value - 7;
    // Use TransactionResultCode with more specific errors
    if (txErrorValue in ContractErrorType) {
      return new ContractError(
        txErrorValue as ContractErrorType,
        JSON.stringify(errorResult, null, 2)
      );
    }

    // If the error is not recognized, return an unknown error
    return new ContractError(ContractErrorType.UnknownError, JSON.stringify(errorResult, null, 2));
  }
}
