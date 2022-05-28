/* eslint-disable @typescript-eslint/ban-types */
import { NextFunction, Router, Request, Response } from 'express';
import { asyncHandler } from '../services/error-handler';
import {
  balances as ethereumBalances,
  poll as ethereumPoll,
} from '../chains/ethereum/ethereum.controllers';
import { Ethereumish } from '../services/common-interfaces';
import { getChain } from '../services/connection-manager';
import {
  BalanceRequest,
  BalanceResponse,
  PollRequest,
  PollResponse,
  StatusRequest,
  StatusResponse,
  TokensRequest,
  TokensResponse,
} from './network.requests';
import {
  validateNetwork,
  validateChain,
  validateBalanceRequest,
} from '../chains/ethereum/ethereum.validators';
import { getStatus, getTokens } from './network.controllers';
import { ConfigManagerV2 } from '../services/config-manager-v2';
import {
  mkRequestValidator,
  RequestValidator,
  validateTxHash,
} from '../services/validators';

export const validatePollRequest: RequestValidator = mkRequestValidator([
  validateTxHash,
]);

export const validateTokensRequest: RequestValidator = mkRequestValidator([
  validateChain,
  validateNetwork,
]);

export namespace NetworkRoutes {
  export const router = Router();

  router.get(
    '/status',
    asyncHandler(
      async (
        req: Request<{}, {}, {}, StatusRequest>,
        res: Response<StatusResponse | StatusResponse[], {}>
      ) => {
        res.status(200).json(await getStatus(req.query));
      }
    )
  );

  router.get('/config', (_req: Request, res: Response<any, any>) => {
    res.status(200).json(ConfigManagerV2.getInstance().allConfigurations);
  });

  router.post(
    '/balances',
    asyncHandler(
      async (
        req: Request<{}, {}, BalanceRequest>,
        res: Response<BalanceResponse | string, {}>,
        _next: NextFunction
      ) => {
        validateBalanceRequest(req.body);
        const chain = await getChain(req.body.chain, req.body.network);
        if (chain.type_ === 'ethereumish') {
          res
            .status(200)
            .json(await ethereumBalances(chain as Ethereumish, req.body));
        } else {
          res.status(400);
        }
      }
    )
  );

  router.post(
    '/poll',
    asyncHandler(
      async (
        req: Request<{}, {}, PollRequest>,
        res: Response<PollResponse, {}>
      ) => {
        validatePollRequest(req.body);
        const chain = await getChain(req.body.chain, req.body.network);
        if (chain.type_ === 'ethereumish') {
          res
            .status(200)
            .json(await ethereumPoll(chain as Ethereumish, req.body));
        } else {
          res.status(400);
        }
      }
    )
  );

  router.get(
    '/tokens',
    asyncHandler(
      async (
        req: Request<{}, {}, {}, TokensRequest>,
        res: Response<TokensResponse, {}>
      ) => {
        validateTokensRequest(req.query);
        res.status(200).json(await getTokens(req.query));
      }
    )
  );
}
