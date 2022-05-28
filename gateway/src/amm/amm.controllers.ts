import {
  EstimateGasResponse,
  PriceRequest,
  PriceResponse,
  TradeRequest,
  TradeResponse,
} from './amm.requests';
import {
  price as uniswapPrice,
  trade as uniswapTrade,
  estimateGas as uniswapEstimateGas,
} from '../connectors/uniswap/uniswap.controllers';
import { getChain, getConnector } from '../services/connection-manager';
import {
  Ethereumish,
  NetworkSelectionRequest,
} from '../services/common-interfaces';

export async function price(req: PriceRequest): Promise<PriceResponse> {
  const chain = await getChain(req.chain, req.network);
  if (chain.type_ === 'ethereumish') {
    const connector = await getConnector(req.chain, req.network, req.connector);
    return uniswapPrice(chain as Ethereumish, connector, req);
  } else {
    throw new Error('');
  }
}

export async function trade(req: TradeRequest): Promise<TradeResponse> {
  const chain = await getChain(req.chain, req.network);
  if (chain.type_ === 'ethereumish') {
    const connector = await getConnector(req.chain, req.network, req.connector);
    return uniswapTrade(chain as Ethereumish, connector, req);
  } else {
    throw new Error('');
  }
}

export async function estimateGas(
  req: NetworkSelectionRequest
): Promise<EstimateGasResponse> {
  const chain = await getChain(req.chain, req.network);
  if (chain.type_ === 'ethereumish') {
    const connector = await getConnector(req.chain, req.network, req.connector);
    return uniswapEstimateGas(chain as Ethereumish, connector);
  } else {
    throw new Error('');
  }
}
