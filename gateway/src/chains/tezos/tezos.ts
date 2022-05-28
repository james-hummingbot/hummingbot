// https://madfish.crunch.help/quipu-swap/quipu-swap-list-of-token-contracts
// token lists

// https://api.tzkt.io/#operation/Tokens_GetTokenBalances

import { getTezosConfig } from './tezos.config';
import { logger } from '../../services/logger';
import { IncomingMessage, IncomingHttpHeaders } from 'http';
import https, { RequestOptions } from 'https';

export interface Response {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
}

// function request(options: RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
//    function request(url: string | URL, options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;

export const requestPromise = (
  urlOptions: RequestOptions,
  data: any
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const req = https.request(urlOptions, (res: IncomingMessage) => {
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
            body: body,
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
  // async getTokenBalance(
  //   contractAddress: string,
  //   walletAddress: string,
  //   tokenId: number,
  // ): Promise<TokenValue> {
  //   logger.info('Requesting balance for owner ' + wallet.address + '.');
  //   const balance: BigNumber = await contract.balanceOf(wallet.address);
  //   logger.info(
  //     `Raw balance of ${contract.address} for ` +
  //       `${wallet.address}: ${balance.toString()}`
  //   );
  //   return { value: balance, decimals: decimals };
  // }

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
