// https://madfish.crunch.help/quipu-swap/quipu-swap-list-of-token-contracts
// token lists

// https://api.tzkt.io/#operation/Tokens_GetTokenBalances

import { promises as fs } from 'fs';
import { BigNumber } from 'ethers';
import { getTezosConfig } from './tezos.config';
import { logger } from '../../services/logger';
import {
  TokenInfo,
  TokenListType,
  TokenValue,
  walletPath,
} from '../../services/base';
import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';
import { ConfigManagerCertPassphrase } from '../../services/config-manager-cert-passphrase';
import {
  AccountStatusResponse,
  BlockHeadResponse,
  TokenResponse,
  TransactionResponse,
  TzktApiClient,
} from './tzkt.api.client';
import axios from 'axios';
import fse from 'fs-extra';
import crypto from 'crypto';

export interface WalletData {
  iv: string;
  encryptedPrivateKey: string;
}

export class Tezos {
  private _type: string = 'tezos';
  public chainName: string = 'tezos';
  private static _instances: { [name: string]: Tezos };
  public chainId: string;
  // public provider: TezosToolkit;

  protected tokenList: TokenInfo[] = [];
  private _tokenMap: Record<string, TokenInfo> = {};

  public tokenListSource: string;
  public tokenListType: TokenListType;

  public nodeURL: string;
  public tzktURL: string;
  public _tzktApiClient: TzktApiClient;
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
    this._tzktApiClient = new TzktApiClient(config.network.tzktURL);
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

  // returns the Native balance, convert BigNumber to string
  async getNativeBalance(wallet: TezosToolkit): Promise<TokenValue> {
    const address = await wallet.signer.publicKeyHash();
    const accountStatus: AccountStatusResponse =
      await this._tzktApiClient.getAccountStatus(address);

    return { value: BigNumber.from(accountStatus.balance), decimals: 6 };
  }

  async getNonce(wallet: TezosToolkit): Promise<number> {
    const address = await wallet.signer.publicKeyHash();
    const accountStatus: AccountStatusResponse =
      await this._tzktApiClient.getAccountStatus(address);
    return accountStatus.counter;
  }

  // supports FA1.2 and FA2
  async getTokenBalance(
    contractAddress: string,
    walletAddress: string,
    tokenId: number,
    decimals: number
  ): Promise<TokenValue> {
    const tokens: Array<TokenResponse> = await this._tzktApiClient.getTokens(
      walletAddress,
      contractAddress,
      tokenId
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

  async getTransaction(txHash: string): Promise<TransactionResponse> {
    return this._tzktApiClient.getTransaction(txHash);
  }

  public getTokenBySymbol(tokenSymbol: string): TokenInfo | undefined {
    return this.tokenList.find(
      (token: TokenInfo) =>
        token.symbol.toUpperCase() === tokenSymbol.toUpperCase()
    );
  }

  async getCurrentBlockNumber(): Promise<number> {
    const block: BlockHeadResponse = await this._tzktApiClient.getBlockHead();
    return block.level;
  }

  async getWalletFromPrivateKey(privateKey: string): Promise<TezosToolkit> {
    const wallet = new TezosToolkit(this.nodeURL);
    wallet.setProvider({
      signer: await InMemorySigner.fromSecretKey(privateKey),
    });
    return wallet;
  }

  async getWallet(address: string): Promise<TezosToolkit> {
    const path = `${walletPath}/${this.chainName}`;

    const rawData: string = await fse.readFile(
      `${path}/${address}.json`,
      'utf8'
    );

    const walletData: WalletData = JSON.parse(rawData);

    const passphrase = ConfigManagerCertPassphrase.readPassphrase();
    if (!passphrase) {
      throw new Error('missing passphrase');
    }
    return await this.decrypt(
      walletData.iv,
      walletData.encryptedPrivateKey,
      passphrase
    );
  }

  encrypt(privateKey: string, password: string): WalletData {
    const iv = crypto.randomBytes(16);
    const key = crypto
      .createHash('sha256')
      .update(String(password))
      .digest('base64')
      .substr(0, 32);
    const encrypter = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedPrivateKey =
      encrypter.update(privateKey, 'utf8', 'hex') + encrypter.final('hex');
    return { iv: iv.toString('hex').slice(0, 16), encryptedPrivateKey };
  }

  async decrypt(
    iv: string,
    encryptedPrivateKey: string,
    password: string
  ): Promise<TezosToolkit> {
    const key = crypto
      .createHash('sha256')
      .update(String(password))
      .digest('base64')
      .substr(0, 32);
    const decrypter = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decryptedPrivateKey =
      decrypter.update(encryptedPrivateKey, 'hex', 'utf8') +
      decrypter.final('utf8');

    const wallet = new TezosToolkit(this.nodeURL);
    wallet.setProvider({
      signer: await InMemorySigner.fromSecretKey(decryptedPrivateKey),
    });
    return wallet;
  }
}

// import { TezosToolkit } from '@taquito/taquito';
// import { InMemorySigner, importKey } from '@taquito/signer';

// const Tezos = new TezosToolkit('https://YOUR_PREFERRED_RPC_URL');

// Tezos.setProvider({
//   signer: new InMemorySigner('YOUR_PRIVATE_KEY'),
// });
