import type { Handler, APIGatewayProxyEvent } from 'aws-lambda';
import { DUser, DActiveSession } from '@actually-colab/editor-types';

import { getUserFromBearerToken } from '../authorizer/token';
import { connect, disconnect } from '../db/pgsql/models/ActiveSession';
import { broadcastToNotebook, forceDisconnect } from './client-management';

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
        const bearerToken =
          event.headers.Authorization ?? event.queryStringParameters?.sessionToken;
        if (bearerToken == null) {
          console.error(
            event.requestContext.connectionId,
            'Authorization token not supplied... forcing disconnect...'
          );
          await forceDisconnect(event.requestContext);
          return { statusCode: 401 };
        }

        const user = await getUserFromBearerToken(bearerToken);
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
      const { disconnectedSessions, unlockedCells } = await disconnect(
        event.requestContext.connectionId,
        event.requestContext.requestTimeEpoch
      );

      if (disconnectedSessions.length > 0) {
        const uid = disconnectedSessions[0].uid;

        await Promise.all([
          Promise.all(
            disconnectedSessions.map((session) =>
              broadcastToNotebook(event.requestContext, session.nb_id, {
                action: 'notebook_closed',
                triggered_by: session.uid,
                data: { nb_id: session.nb_id, uid: session.uid },
              })
            )
          ),
          Promise.all(
            unlockedCells.map((cell) =>
              broadcastToNotebook(event.requestContext, cell.nb_id, {
                action: 'cell_unlocked',
                triggered_by: uid,
                data: cell,
              })
            )
          ),
        ]);
      }

      return success;
    }
    default:
      console.error('unknown request', event);
      return error;
  }
};
