import type { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import type { DUser } from 'db/pgsql/models/User';

import { ShallotAWS } from 'shallot';

export type WebSocketRequestContext = APIGatewayProxyEvent['requestContext'] & {
  connectionId: string;
  authorizer: DUser;
};

type APIGatewayWebSocketEvent = APIGatewayProxyEvent & {
  requestContext: WebSocketRequestContext;
};

const _handler: Handler = async (event: APIGatewayWebSocketEvent) => {
  return { statusCode: 400 };
};

export const handler = ShallotAWS(_handler);
