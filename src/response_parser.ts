import { rpc } from '@stellar/stellar-sdk';

export class ContractError extends Error {
  /**
   * The type of the error
   */
  public type: ContractErrorType;

  constructor(type: ContractErrorType) {
    super();
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
  OperationNotSupportedError = 2,
  AlreadyInitializedError = 3,

  UnauthorizedError = 4,
  AuthenticationError = 5,
  AccountMissingError = 6,
  AccountIsNotClassic = 7,

  NegativeAmountError = 8,
  AllowanceError = 9,
  BalanceError = 10,
  BalanceDeauthorizedError = 11,
  OverflowError = 12,
  TrustlineMissingError = 13,

  // Potential Comet Errors
  CometErrFreezeOnlyWithdrawals = 14,
  CometErrMaxInRatio = 17,
  CometErrMathApprox = 18,
  CometErrLimitIn = 19,
  CometErrLimitOut = 20,
  CometErrMaxOutRatio = 21,
  CometErrBadLimitPrice = 22,
  CometErrLimitPrice = 23,
  CometErrTokenAmountIsNegative = 25,
  CometErrInsufficientAllowance = 27,
  CometErrInsufficientBalance = 29,
  CometErrAddOverflow = 30,
  CometErrSubUnderflow = 31,
  CometErrDivInternal = 32,
  CometErrMulOverflow = 33,
  CometErrCPowBaseTooLow = 34,
  CometErrCPowBaseTooHigh = 35,
  CometErrInvalidExpirationLedger = 36,
  CometErrNegativeOrZero = 37,
  CometErrTokenInvalid = 38,

  // Backstop
  BackstopBadRequest = 1000,
  NotExpired = 1001,
  InvalidRewardZoneEntry = 1002,
  InsufficientFunds = 1003,
  NotPool = 1004,
  InvalidShareMintAmount = 1005,
  InvalidTokenWithdrawAmount = 1006,
  TooManyQ4WEntries = 1007,
  NotInRewardZone = 1008,
  RewardZoneFull = 1009,
  MaxBackfillEmissions = 1010,

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
  InvalidBTokenMintAmount = 1216,
  InvalidBTokenBurnAmount = 1217,
  InvalidDTokenMintAmount = 1218,
  InvalidDTokenBurnAmount = 1219,
  ExceededCollateralCap = 1220,
  ReserveDisabled = 1223,

  // Oracle Errors
  StalePrice = 1210,

  // Auction Errors
  InvalidLiquidation = 1211,
  AuctionInProgress = 1212,
  InvalidLiqTooLarge = 1213,
  InvalidLiqTooSmall = 1214,
  InterestTooSmall = 1215,
  InvalidBid = 1221,
  InvalidLot = 1222,

  // Pool Factory
  InvalidPoolFactoryInitArgs = 1300,
}

export function parseError(
  errorResponse:
    | rpc.Api.GetFailedTransactionResponse
    | rpc.Api.SendTransactionResponse
    | rpc.Api.SimulateTransactionErrorResponse
): ContractError {
  // Simulation Error
  if ('id' in errorResponse) {
    const match = errorResponse.error.match(/Error\(Contract, #(\d+)\)/);
    if (match) {
      const errorValue = parseInt(match[1], 10);
      if (errorValue in ContractErrorType)
        return new ContractError(errorValue as ContractErrorType);
    }
    return new ContractError(ContractErrorType.UnknownError);
  }

  // Send Transaction Error
  if ('errorResult' in errorResponse) {
    const txErrorName = errorResponse.errorResult.result().switch().name;
    if (txErrorName == 'txFailed') {
      // Transaction should only contain one operation
      if (errorResponse.errorResult.result().results().length == 1) {
        const hostFunctionError = errorResponse.errorResult
          .result()
          .results()[0]
          .tr()
          .invokeHostFunctionResult()
          .switch().value;
        if (hostFunctionError in ContractErrorType)
          return new ContractError(hostFunctionError as ContractErrorType);
      }
    } else {
      const txErrorValue = errorResponse.errorResult.result().switch().value - 7;
      if (txErrorValue in ContractErrorType) {
        return new ContractError(txErrorValue as ContractErrorType);
      }
    }
  }

  // Get Transaction Error
  if ('resultXdr' in errorResponse) {
    // Transaction submission failed
    const txResult = errorResponse.resultXdr.result();
    const txErrorName = txResult.switch().name;

    // Use invokeHostFunctionErrors in case of generic `txFailed` error
    if (txErrorName == 'txFailed') {
      // Transaction should only contain one operation
      if (errorResponse.resultXdr.result().results().length == 1) {
        const hostFunctionError = txResult
          .results()[0]
          .tr()
          .invokeHostFunctionResult()
          .switch().value;
        if (hostFunctionError in ContractErrorType)
          return new ContractError(hostFunctionError as ContractErrorType);
      }
    }

    // Shift the error value to avoid collision with invokeHostFunctionErrors
    const txErrorValue = txResult.switch().value - 7;
    // Use TransactionResultCode with more specific errors
    if (txErrorValue in ContractErrorType) {
      return new ContractError(txErrorValue as ContractErrorType);
    }
  }

  // If the error is not recognized, return an unknown error
  return new ContractError(ContractErrorType.UnknownError);
}

export function parseResult<T>(
  response: rpc.Api.SimulateTransactionSuccessResponse | rpc.Api.GetSuccessfulTransactionResponse,
  parser: (xdr: string) => T
): T | undefined {
  if ('result' in response) {
    return parser(response.result.retval.toXDR('base64'));
  } else if ('returnValue' in response && response.returnValue) {
    return parser(response.returnValue.toXDR('base64'));
  } else {
    return undefined;
  }
}
