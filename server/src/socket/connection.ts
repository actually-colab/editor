import type { Handler, APIGatewayProxyEvent } from 'aws-lambda';
import { DUser } from 'db/pgsql/models/User';
import type { DActiveSession } from '../db/dynamo/models/ActiveSession';

import { connect } from '../db/dynamo/models/ActiveSession';

const SocketEventTypes = Object.freeze({
  Connect: 'Connect',
  Disconnect: 'Disconnect',
});

const success = {
  statusCode: 200,
};

const error = {
  statusCode: 400,
};

type WebSocketRequestContext = APIGatewayProxyEvent['requestContext'] & {
  connectionId: string;
  authorizer: DUser;
};

type APIGatewayWebSocketEvent = APIGatewayProxyEvent & {
  requestContext: WebSocketRequestContext;
};

export const handler: Handler = async (event: APIGatewayWebSocketEvent) => {
  switch (event.requestContext.eventType) {
    case SocketEventTypes.Connect:
      const newSession: DActiveSession = {
        connectionId: event.requestContext.connectionId,
        uid: event.requestContext.authorizer.uid,
        time_connected: event.requestContext.requestTimeEpoch,
        last_event: event.requestContext.requestTimeEpoch,
      };

      await connect(newSession);

      return success;

    case SocketEventTypes.Disconnect:
      return success;
    default:
      return error;
  }
};
