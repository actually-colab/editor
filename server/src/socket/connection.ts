import type { Handler, APIGatewayProxyEvent } from 'aws-lambda';
import type { DUser } from 'db/pgsql/models/User';
import type { DActiveSession } from '../db/pgsql/models/ActiveSession';

import { getUserFromToken } from '../authorizer/token';
import { connect, disconnect } from '../db/pgsql/models/ActiveSession';
import { forceDisconnect } from './client-management';

const SocketEventTypes = Object.freeze({
  Connect: 'CONNECT',
  Disconnect: 'DISCONNECT',
});

const success = {
  statusCode: 200,
};

const error = {
  statusCode: 400,
};

export type WebSocketRequestContext = APIGatewayProxyEvent['requestContext'] & {
  connectionId: string;
  authorizer: DUser;
};

type APIGatewayWebSocketEvent = APIGatewayProxyEvent & {
  requestContext: WebSocketRequestContext;
};

export const handler: Handler = async (event: APIGatewayWebSocketEvent) => {
  switch (event.requestContext.eventType) {
    case SocketEventTypes.Connect: {
      // SLS Offline doesn't support Lambda Authorizers :,(
      if (process.env.IS_OFFLINE != null) {
        const token =
          event.headers.Authorization ?? event.queryStringParameters?.sessionToken;
        if (token == null) {
          console.error(
            event.requestContext.connectionId,
            'Authorization token not supplied... forcing disconnect...'
          );
          await forceDisconnect(event.requestContext);
          return { statusCode: 401 };
        }

        const user = await getUserFromToken(token);
        if (user == null) {
          console.error(
            event.requestContext.connectionId,
            'Authorization token invalid... forcing disconnect...'
          );
          await forceDisconnect(event.requestContext);
          return { statusCode: 401 };
        }

        event.requestContext.authorizer = user;
      }

      const newSession: DActiveSession = {
        connectionId: event.requestContext.connectionId,
        uid: event.requestContext.authorizer.uid,
        time_connected: event.requestContext.requestTimeEpoch,
        last_event: event.requestContext.requestTimeEpoch,
      };

      await connect(newSession);

      return success;
    }
    case SocketEventTypes.Disconnect: {
      await disconnect(
        event.requestContext.connectionId,
        event.requestContext.requestTimeEpoch
      );

      return success;
    }
    default:
      console.error('unknown request', event);
      return error;
  }
};
