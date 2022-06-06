import {
  validateTokenSymbols,
  mkValidator,
  mkRequestValidator,
  RequestValidator,
  Validator,
  validateToken,
  validateAmount,
} from '../../services/validators';

// invalid parameter errors

export const invalidAddressError: string =
  'The address param is not a valid Ethereum private key (64 hexidecimal characters).';

export const invalidSpenderError: string =
  'The spender param is not a valid Ethereum address (0x followed by 40 hexidecimal characters).';

export const invalidNonceError: string =
  'If nonce is included it must be a non-negative integer.';

export const invalidMaxFeePerGasError: string =
  'If maxFeePerGas is included it must be a string of a non-negative integer.';

export const invalidMaxPriorityFeePerGasError: string =
  'If maxPriorityFeePerGas is included it must be a string of a non-negative integer.';

export const invalidChainError: string = 'The chain param is not a string.';

export const invalidNetworkError: string = 'The network param is not a string.';

// test if a string matches the shape of an Tezos address
export const isAddress = (str: string): boolean => {
  return /^tz\d[1-9A-HJ-NP-Za-km-z]{33}$/.test(str);
};

// given a request, look for a key called address that is an Tezos wallet
export const validateAddress: Validator = mkValidator(
  'address',
  invalidAddressError,
  (val) => typeof val === 'string' && isAddress(val)
);

// given a request, look for a key called spender that is 'liquidity-baking' or an Tezos address
export const validateSpender: Validator = mkValidator(
  'spender',
  invalidSpenderError,
  (val) =>
    typeof val === 'string' && (val === 'liquidity-baking' || isAddress(val))
);

export const validateNonce: Validator = mkValidator(
  'nonce',
  invalidNonceError,
  (val) =>
    typeof val === 'undefined' ||
    (typeof val === 'number' && val >= 0 && Number.isInteger(val)),
  true
);

export const validateChain: Validator = mkValidator(
  'chain',
  invalidChainError,
  (val) => typeof val === 'string'
);

export const validateNetwork: Validator = mkValidator(
  'network',
  invalidNetworkError,
  (val) => typeof val === 'string'
);

// request types and corresponding validators
export const validateNonceRequest: RequestValidator = mkRequestValidator([
  validateAddress,
]);

export const validateAllowancesRequest: RequestValidator = mkRequestValidator([
  validateAddress,
  validateSpender,
  validateTokenSymbols,
]);

export const validateBalanceRequest: RequestValidator = mkRequestValidator([
  validateAddress,
  validateTokenSymbols,
]);

export const validateApproveRequest: RequestValidator = mkRequestValidator([
  validateAddress,
  validateSpender,
  validateToken,
  validateAmount,
  validateNonce,
]);
