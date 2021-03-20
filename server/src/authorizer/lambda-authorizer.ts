import type {
  APIGatewayAuthorizerWithContextResult,
  APIGatewayAuthorizerResult,
  Handler,
  APIGatewayTokenAuthorizerEvent,
  APIGatewayRequestAuthorizerEvent,
} from 'aws-lambda';

import type { DUser } from '../db/pgsql/models/User';

import { getUserFromBearerToken } from './token';
import { ShallotAWS } from 'shallot';

const generatePolicy = (
  principalId: string,
  methodArn: string,
  effect: 'Allow' | 'Deny',
  user?: DUser
): APIGatewayAuthorizerWithContextResult<DUser> | APIGatewayAuthorizerResult => {
  const res: APIGatewayAuthorizerResult = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: methodArn,
        },
      ],
    },
  };

  if (user) {
    res.context = user;
  }

  return res;
};

const authorize = async (methodArn: string, token?: string) => {
  if (token != null) {
    try {
      const user = await getUserFromBearerToken(token);

      if (user !== null) {
        return generatePolicy(user.email, methodArn, 'Allow', user);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return generatePolicy('unknown', methodArn, 'Deny');
};

const _rest: Handler<
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerWithContextResult<DUser> | APIGatewayAuthorizerResult
> = async (event) => {
  // arn:aws:execute-api:region:account-id:api-id/stage-name/HTTP-VERB/resource-path-specifier
  const paths = event.methodArn.split('/');
  const apiMeta = paths[0].split(':');
  const accountId = apiMeta[4];
  const apiId = apiMeta[5];
  const stageName = paths[1];
  const wildcardMethodArn = `arn:aws:execute-api:*:${accountId}:${apiId}/${stageName}/*/*`;

  return authorize(wildcardMethodArn, event.authorizationToken);
};

export const rest = ShallotAWS(_rest);

const _socket: Handler<
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerWithContextResult<DUser> | APIGatewayAuthorizerResult
> = async (event) => {
  const token = event.queryStringParameters?.sessionToken ?? event.headers?.Authorization;

  return authorize(event.methodArn, token);
};

export const socket = ShallotAWS(_socket);
