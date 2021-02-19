import type {
  APIGatewayAuthorizerWithContextResult,
  APIGatewayAuthorizerResult,
  Handler,
  APIGatewayTokenAuthorizerEvent,
} from 'aws-lambda';

import type { DUser } from '../db/pgsql/models/User';

import { getUserFromToken } from './token';
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

const _handler: Handler<
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerWithContextResult<DUser> | APIGatewayAuthorizerResult
> = async (event) => {
  try {
    const user = await getUserFromToken(event.authorizationToken);

    if (user !== null) {
      return generatePolicy(user.email, event.methodArn, 'Allow', user);
    }
  } catch (error) {
    console.error(error);
  }

  return generatePolicy('unknown', event.methodArn, 'Deny');
};

export const handler = ShallotAWS(_handler);
