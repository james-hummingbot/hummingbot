// https://madfish.crunch.help/quipu-swap/quipu-swap-list-of-token-contracts
// token lists

// https://api.tzkt.io/#operation/Tokens_GetTokenBalances

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
  public chainId: number;

  private constructor(network: string) {
    const config = getTezosConfig('tezos', network);
    this.chainId = config.network.chainId;
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

  // supports FA1.2 and FA2
  async getTokenBalance(
    contractAddress: string,
    walletAddress: string,
    tokenId: number,
    decimals: number
  ): Promise<TokenValue> {
    const response = await requestPromise({
      method: 'GET',
      host: 'api.tzkt.io',
      port: 443,
      path: `/v1/tokens/balances?account=${walletAddress}&token.contract=${contractAddress}&token.tokenId=${tokenId}`,
    });
    const tokens: Array<TokenResponse> = response.body;

    return { value: BigNumber.from(tokens[0].balance), decimals }; // : parseInt(tokens[0].token.metadata.decimals)}
  }

  async getTokenAllowance(
    contractAddress: string,
    walletAddress: string,
    spender: string,
    tokenId: number,
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
  async getTransaction(txHash: string): Promise<providers.TransactionResponse> {
    return this._provider.getTransaction(txHash);
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
}

// import { TezosToolkit } from '@taquito/taquito';
// import { InMemorySigner, importKey } from '@taquito/signer';

// const Tezos = new TezosToolkit('https://YOUR_PREFERRED_RPC_URL');

// Tezos.setProvider({
//   signer: new InMemorySigner('YOUR_PRIVATE_KEY'),
// });
