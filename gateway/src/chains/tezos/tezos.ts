// https://madfish.crunch.help/quipu-swap/quipu-swap-list-of-token-contracts
// token lists

// https://api.tzkt.io/#operation/Tokens_GetTokenBalances

import axios from 'axios';
import { promises as fs } from 'fs';
import { BigNumber } from 'ethers';
import { getTezosConfig } from './tezos.config';
import { logger } from '../../services/logger';
import { TokenInfo, TokenListType, TokenValue } from '../../services/base';

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

export class Tezos {
  private _type: string = 'ethereumish';
  private static _instances: { [name: string]: Tezos };
  public chainId: string;

  protected tokenList: TokenInfo[] = [];
  private _tokenMap: Record<string, TokenInfo> = {};

  public tokenListSource: string;
  public tokenListType: TokenListType;

  public nodeURL: string;
  public tzktURL: string;
  public nativeCurrencySymbol: string;

  private _ready: boolean = false;
  private _initializing: boolean = false;
  private _initPromise: Promise<void> = Promise.resolve();

  private constructor(network: string) {
    const config = getTezosConfig('tezos', network);
    this.chainId = config.network.chainId;
    //   this._gasPrice = config.manualGasPrice;
    // this._gasPriceRefreshInterval =
    //   config.network.gasPriceRefreshInterval !== undefined
    //     ? config.network.gasPriceRefreshInterval
    //     : null;
    (this.tokenListSource = config.network.tokenListSource),
      (this.tokenListType = config.network.tokenListType),
      (this.nativeCurrencySymbol = config.nativeCurrencySymbol);
    this.nodeURL = config.network.nodeURL;
    this.tzktURL = config.network.tzktURL;
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

  ready(): boolean {
    return this._ready;
  }

  public get type_(): string {
    return this._type;
  }

  async init(): Promise<void> {
    if (!this.ready() && !this._initializing) {
      this._initializing = true;
      this._initPromise = this.loadTokens(
        this.tokenListSource,
        this.tokenListType
      ).then(() => {
        this._ready = true;
        this._initializing = false;
      });
    }
    return this._initPromise;
  }

  async loadTokens(
    tokenListSource: string,
    tokenListType: TokenListType
  ): Promise<void> {
    this.tokenList = await this.getTokenList(tokenListSource, tokenListType);
    if (this.tokenList) {
      this.tokenList.forEach(
        (token: TokenInfo) => (this._tokenMap[token.symbol] = token)
      );
    }
  }

  // returns a Tokens for a given list source and list type
  async getTokenList(
    tokenListSource: string,
    tokenListType: TokenListType
  ): Promise<TokenInfo[]> {
    let tokens;
    if (tokenListType === 'URL') {
      ({
        data: { tokens },
      } = await axios.get(tokenListSource));
    } else {
      ({ tokens } = JSON.parse(await fs.readFile(tokenListSource, 'utf8')));
    }
    return tokens;
  }

  public get storedTokenList(): TokenInfo[] {
    return this.tokenList;
  }

  // return the Token object for a symbol
  getTokenForSymbol(symbol: string): TokenInfo | null {
    return this._tokenMap[symbol] ? this._tokenMap[symbol] : null;
  }

  // supports FA1.2 and FA2
  async getTokenBalance(
    contractAddress: string,
    walletAddress: string,
    tokenId: number,
    decimals: number
  ): Promise<TokenValue> {
    const tokens: Array<TokenResponse> = await axios.get(
      `https://api.tzkt.io/v1/tokens/balances?account=${walletAddress}&token.contract=${contractAddress}&token.tokenId=${tokenId}`
    );
    let value = BigNumber.from(0);
    if (tokens.length > 0) {
      value = BigNumber.from(tokens[0].balance);
    }

    return { value, decimals };
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
