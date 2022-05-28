// https://madfish.crunch.help/quipu-swap/quipu-swap-list-of-token-contracts
// token lists

// https://api.tzkt.io/#operation/Tokens_GetTokenBalances

import axios from 'axios';
import { BigNumber } from 'ethers';
import { getTezosConfig } from './tezos.config';
import { logger } from '../../services/logger';
import { IncomingMessage, IncomingHttpHeaders } from 'http';
import https, { RequestOptions } from 'https';
import { TokenValue } from '../../services/base';

export interface Account {
  address: string;
  alias?: string;
}

export interface Metadata {
  name: string;
  symbol: string;
  decimals: string;
}

export interface Token {
  id: number; // internal to tzkt
  contract: Account;
  tokenId: string; // FA1.2 = 0, FA2 is 0 or greater
  standard: string;
  metadata: Metadata;
}

export interface TokenResponse {
  id: number;
  account: Account;
  token: Token;
  balance: string; // BigNumber?
}

export interface Response {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: any;
}

export interface TransactionResponse {
  id: number;
  level: number;
  timestamp: string;
  block: string;
  hash: string;
  counter: number;
  sender: Account;
  gasLimit: number;
  gasUsed: number;
  storageLimit: number;
  storageUsed: number;
  bakerFee: number;
  storageFee: number;
  allocationFee: number;
  target: Account;
  amount: number;
  parameter: any;
  storage: any;
  status: string;
  hasInternals: boolean;
}

export interface BlockHead {
  chain?: string;
  chainId?: string;
  level: number;
}

// approve
// getTokenBySymbol
// getCurrentBLockNumber
// cancel

// function request(options: RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;

//  type RequestOptions = http.RequestOptions & tls.SecureContextOptions & {
//        rejectUnauthorized?: boolean; // Defaults to true
//        servername?: string; // SNI TLS Extension
//    };

// function request(options: RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
//    function request(url: string | URL, options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;

export const requestPromise = (
  options: RequestOptions,
  data?: any
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: IncomingMessage) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk.toString()));
      res.on('error', reject);
      res.on('end', () => {
        if (
          res.statusCode != null &&
          res.statusCode >= 200 &&
          res.statusCode <= 299
        ) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body),
          });
        } else {
          reject(
            'Request failed. status: ' + res.statusCode + ', body: ' + body
          );
        }
      });
    });
    req.on('error', reject);
    req.write(data, 'binary');
    req.end();
  });
};

export class Tezos {
  private static _instances: { [name: string]: Tezos };
  public chainId: string;
  public tzktURL: string;
  public nativeTokenSymbol: string;

  private constructor(network: string) {
    const config = getTezosConfig('tezos', network);
    this.chainId = config.network.chainId;
    this.tzktURL = config.network.tzktURL;
    this.nativeTokenSymbol = config.network.nativeTokenSymbol;
  }

  public static getInstance(network: string): Tezos {
    logger.info('yo');
    if (Tezos._instances === undefined) {
      Tezos._instances = {};
    }
    if (!(network in Tezos._instances)) {
      Tezos._instances[network] = new Tezos(network);
    }

    return Tezos._instances[network];
  }

  public static getConnectedInstances(): { [name: string]: Tezos } {
    return Tezos._instances;
  }

  // supports FA1.2 and FA2
  async getTokenBalance(
    contractAddress: string,
    walletAddress: string,
    tokenId: number,
    decimals: number
  ): Promise<TokenValue> {
    // const response = await requestPromise({
    //   method: 'GET',
    //   host: 'api.tzkt.io',
    //   port: 443,
    //   path: `/v1/tokens/balances?account=${walletAddress}&token.contract=${contractAddress}&token.tokenId=${tokenId}`,
    // });
    //   const tokens: Array<TokenResponse> = response.body;
    const tokens: Array<TokenResponse> = await axios.get(
      `https://api.tzkt.io/v1/tokens/balances?account=${walletAddress}&token.contract=${contractAddress}&token.tokenId=${tokenId}`
    );
    let value = BigNumber.from(0);
    if (tokens.length > 0) {
      value = BigNumber.from(tokens[0].balance);
    }

    return { value, decimals }; // : parseInt(tokens[0].token.metadata.decimals)}
  }

  async getTokenAllowance(
    _contractAddress: string,
    walletAddress: string,
    spender: string,
    _tokenId: number,
    decimals: number
  ): Promise<TokenValue> {
    logger.info(
      'Requesting spender ' +
        spender +
        ' allowance for owner ' +
        walletAddress +
        '.'
    );
    // const allowance = await contract.allowance(wallet.address, spender);
    // logger.info(allowance);
    return { value: BigNumber.from(0), decimals: decimals };
  }

  // https://api.tzkt.io/v1/operations/transactions/{hash}
  async getTransaction(txHash: string): Promise<TransactionResponse> {
    return axios.get(
      `https://api.tzkt.io/v1/operations/transactions/${txHash}`
    );
  }

  // https://api.tzkt.io/v1/head
  // https://mainnet.smartpy.io/chains/main/blocks/head/header
  // get the current block number
  async getCurrentBlockNumber(): Promise<number> {
    const block: BlockHead = await axios.get(`https://api.tzkt.io/v1/head`);
    return block.level;
  }

  // async getFA2Balance(
  //   contract: Contract,
  //   wallet: Wallet,
  //   decimals: number
  // ): Promise<TokenValue> {
  //   logger.info('Requesting balance for owner ' + wallet.address + '.');
  //   const balance: BigNumber = await contract.balanceOf(wallet.address);
  //   logger.info(
  //     `Raw balance of ${contract.address} for ` +
  //       `${wallet.address}: ${balance.toString()}`
  //   );
  //   return { value: balance, decimals: decimals };
  // }

  // async loadTokens(
  //   tokenListSource: string,
  //   tokenListType: TokenListType
  // ): Promise<void> {
  //   this.tokenList = await this.getTokenList(tokenListSource, tokenListType);
  //   if (this.tokenList) {
  //     this.tokenList.forEach(
  //       (token: TokenInfo) => (this._tokenMap[token.symbol] = token)
  //     );
  //   }
  // }

  // public getTokenBySymbol(tokenSymbol: string): TokenInfo | undefined {
  //   return this.tokenList.find(
  //     (token: TokenInfo) =>
  //       token.symbol.toUpperCase() === tokenSymbol.toUpperCase()
  //   );
  // }
}

// import { TezosToolkit } from '@taquito/taquito';
// import { InMemorySigner, importKey } from '@taquito/signer';

// const Tezos = new TezosToolkit('https://YOUR_PREFERRED_RPC_URL');

// Tezos.setProvider({
//   signer: new InMemorySigner('YOUR_PRIVATE_KEY'),
// });
