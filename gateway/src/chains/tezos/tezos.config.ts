import { TokenListType } from '../../services/base';
import { ConfigManagerV2 } from '../../services/config-manager-v2';

export interface NetworkConfig {
  name: string;
  chainId: string;
  gasPriceRefreshInterval: number | undefined;
  nodeURL: string;
  tokenListType: TokenListType;
  tokenListSource: string;
  tzktURL: string;
}

export interface Config {
  network: NetworkConfig;
  nativeCurrencySymbol: string;
  manualGasPrice: number;
  gasLimit: number;
}

export function getTezosConfig(chainName: string, networkName: string): Config {
  const network = networkName;
  return {
    network: {
      chainId: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.chainId'
      ),
      gasPriceRefreshInterval: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.gasPriceRefreshInterval'
      ),

      name: network,
      nodeURL: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.nodeURL'
      ),
      tokenListType: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.tokenListType'
      ),
      tokenListSource: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.tokenListSource'
      ),
      tzktURL: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.tzktURL'
      ),
    },
    gasLimit: ConfigManagerV2.getInstance().get(chainName + '.gasLimit'),
    manualGasPrice: ConfigManagerV2.getInstance().get(
      chainName + '.manualGasPrice'
    ),
    nativeCurrencySymbol: ConfigManagerV2.getInstance().get(
      chainName + '.networks.' + network + '.nativeCurrencySymbol'
    ),
  };
}
