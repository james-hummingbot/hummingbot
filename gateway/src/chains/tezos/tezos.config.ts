import { ConfigManagerV2 } from '../../services/config-manager-v2';

export interface NetworkConfig {
  name: string;
  chainId: string;
  tzktURL: string;
  nativeTokenSymbol: string;
}

export interface Config {
  network: NetworkConfig;
}

export function getTezosConfig(chainName: string, networkName: string): Config {
  const network = networkName;
  return {
    network: {
      name: network,
      chainId: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.chainId'
      ),
      tzktURL: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.tzktURL'
      ),
      nativeTokenSymbol: ConfigManagerV2.getInstance().get(
        chainName + '.networks.' + network + '.nativeTokenSymbol'
      ),
    },
  };
}
