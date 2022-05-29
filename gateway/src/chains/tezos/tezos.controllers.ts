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
import { TokenInfo, latency, tokenValueToString } from '../../services/base';
import {
  BalanceRequest,
  BalanceResponse,
} from '../../network/network.requests';
// import { logger } from '../../services/logger';

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
