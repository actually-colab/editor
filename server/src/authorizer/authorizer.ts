import type {
  APIGatewayAuthorizerWithContextResult,
  APIGatewayAuthorizerResult,
  Handler,
  APIGatewayTokenAuthorizerEvent,
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
  // arn:aws:execute-api:region:account-id:api-id/stage-name/HTTP-VERB/resource-path-specifier
  const paths = methodArn.split('/');
  const apiMeta = paths[0].split(':');
  const accountId = apiMeta[4];
  const apiId = apiMeta[5];
  const stageName = paths[1];
  const allowArn = `arn:aws:execute-api:*:${accountId}:${apiId}/${stageName}/*/*`;

  const res: APIGatewayAuthorizerResult = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: allowArn,
        },
      ],
    },
  };

  if (user) {
    res.context = user;
  }

  return res;
};

const _handler: Handler<
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerWithContextResult<DUser> | APIGatewayAuthorizerResult
> = async (event) => {
  try {
    const user = await getUserFromBearerToken(event.authorizationToken);

    if (user !== null) {
      return generatePolicy(user.email, event.methodArn, 'Allow', user);
    }
  } catch (error) {
    console.error(error);
  }

  return generatePolicy('unknown', event.methodArn, 'Deny');
};

export const handler = ShallotAWS(_handler);
