import { BigNumber, constants, utils } from 'ethers';
import {
  HttpException,
  // OUT_OF_GAS_ERROR_CODE,
  // OUT_OF_GAS_ERROR_MESSAGE,
  LOAD_WALLET_ERROR_CODE,
  LOAD_WALLET_ERROR_MESSAGE,
  TOKEN_NOT_SUPPORTED_ERROR_CODE,
  TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
} from '../../services/error-handler';
import { Tezos } from './tezos';
import { TezosToolkit } from '@taquito/taquito';
import {
  TokenInfo,
  bigNumberWithDecimalToStr,
  latency,
  tokenValueToString,
} from '../../services/base';
import {
  BalanceRequest,
  BalanceResponse,
} from '../../network/network.requests';

import { CustomTransaction } from '../ethereum/ethereum.requests';

import {
  NonceRequest,
  NonceResponse,
  ApproveRequest,
  ApproveResponse,

  // AllowancesRequest,
  // AllowancesResponse,
  // ApproveRequest,
  // ApproveResponse,
  // CancelRequest,
  // CancelResponse,
} from '../../evm/evm.requests';
import { OperationContentsAndResultTransaction } from '@taquito/rpc';

export async function nonce(
  tezos: Tezos,
  req: NonceRequest
): Promise<NonceResponse> {
  const wallet = await tezos.getWallet(req.address);
  const nonce = await tezos.getNonce(wallet);
  return { nonce };
}

export const getTokenSymbolsToTokens = (
  tezos: Tezos,
  tokenSymbols: Array<string>
): Record<string, TokenInfo> => {
  const tokens: Record<string, TokenInfo> = {};

  for (let i = 0; i < tokenSymbols.length; i++) {
    const symbol = tokenSymbols[i];
    const token = tezos.getTokenBySymbol(symbol);
    if (token) tokens[symbol] = token;
  }

  return tokens;
};

export async function balances(
  tezos: Tezos,
  req: BalanceRequest
): Promise<BalanceResponse | string> {
  const initTime = Date.now();

  let wallet: TezosToolkit;
  try {
    wallet = await tezos.getWallet(req.address);
  } catch (err) {
    throw new HttpException(
      500,
      LOAD_WALLET_ERROR_MESSAGE + err,
      LOAD_WALLET_ERROR_CODE
    );
  }
  const tokens = getTokenSymbolsToTokens(tezos, req.tokenSymbols);
  const balances: Record<string, string> = {};
  if (req.tokenSymbols.includes(tezos.nativeCurrencySymbol)) {
    balances[tezos.nativeCurrencySymbol] = tokenValueToString(
      await tezos.getNativeBalance(wallet)
    );
  }
  await Promise.all(
    Object.keys(tokens).map(async (symbol) => {
      if (tokens[symbol] !== undefined) {
        const contractAddress = tokens[symbol].address;
        const tokenId = tokens[symbol].tokenId;
        const decimals = tokens[symbol].decimals;
        const walletAddress = await wallet.signer.publicKeyHash();
        // instantiate a contract and pass in provider for read-only access
        // const contract = tezos.getContract(address, tezos.provider);
        if (tokenId !== undefined) {
          const balance = await tezos.getTokenBalance(
            contractAddress,
            walletAddress,
            tokenId,
            decimals
          );
          balances[symbol] = tokenValueToString(balance);
        }
      }
    })
  );

  if (!Object.keys(balances).length) {
    throw new HttpException(
      500,
      TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
      TOKEN_NOT_SUPPORTED_ERROR_CODE
    );
  }

  return {
    network: tezos.chainName,
    timestamp: initTime,
    latency: latency(initTime, Date.now()),
    balances: balances,
  };
}

export async function approve(
  tezos: Tezos,
  req: ApproveRequest
): Promise<ApproveResponse | string> {
  const { amount, address, token } = req;

  const spender = req.spender;
  const initTime = Date.now();
  let wallet: TezosToolkit;
  try {
    wallet = await tezos.getWallet(address);
  } catch (err) {
    throw new HttpException(
      500,
      LOAD_WALLET_ERROR_MESSAGE + err,
      LOAD_WALLET_ERROR_CODE
    );
  }
  const fullToken = tezos.getTokenBySymbol(token);
  if (!fullToken) {
    throw new HttpException(
      500,
      TOKEN_NOT_SUPPORTED_ERROR_MESSAGE + token,
      TOKEN_NOT_SUPPORTED_ERROR_CODE
    );
  }
  const amountBigNumber = amount
    ? utils.parseUnits(amount, fullToken.decimals)
    : constants.MaxUint256;

  // instantiate a contract and pass in wallet, which act on behalf of that signer
  const contract = await wallet.contract.at(fullToken.address);

  // convert strings to BigNumber
  // call approve function
  const approvalOperation = await contract.methods
    .approve({ spender: spender, value: amountBigNumber })
    .send();
  const o = approvalOperation.operationResults;
  if (o.length > 0) {
    const op = o[0];
    return {
      network: tezos.chainName,
      timestamp: initTime,
      latency: latency(initTime, Date.now()),
      tokenAddress: fullToken.address,
      spender: spender,
      amount: bigNumberWithDecimalToStr(amountBigNumber, fullToken.decimals),
      nonce: parseInt(op.counter),
      approval: toTezosTransaction(approvalOperation.hash, op),
    };
  } else {
    throw new HttpException(
      500,
      TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
      TOKEN_NOT_SUPPORTED_ERROR_CODE
    );
  }
}

const toTezosTransaction = (
  hash: string,
  transaction: OperationContentsAndResultTransaction
): CustomTransaction => {
  return {
    hash,
    to: transaction.source,
    from: transaction.source,
    nonce: parseInt(transaction.counter),
    gasLimit: String(
      parseInt(transaction.gas_limit) + parseInt(transaction.storage_limit)
    ),
    gasPrice: BigNumber.from(0),
    maxFeePerGas: '0',
    value: '0',
    chainId: 0,
    r: '',
    s: '',
    v: 0,
    data: constants.HashZero,
    maxPriorityFeePerGas: null,
  };
};
