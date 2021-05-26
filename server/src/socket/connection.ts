import type { Handler, APIGatewayProxyEvent } from 'aws-lambda';
import { DUser, DActiveSession } from '@actually-colab/editor-types';

import { getUserFromBearerToken } from '../authorizer/token';
import { connect, disconnect } from '../db/pgsql/models/ActiveSession';
import { broadcastToNotebook, forceDisconnect } from './client-management';

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

/**Simulates the lambda authorizer since SLS Offline does not support
 * them.
 *
 * @param event APIGateway Event
 * @returns the user or null
 */
const authorizeUserForOffline = async (
  event: APIGatewayWebSocketEvent
): Promise<DUser | null> => {
  const bearerToken =
    event.headers.Authorization ?? event.queryStringParameters?.sessionToken;
  if (bearerToken == null) {
    console.error(
      event.requestContext.connectionId,
      'Authorization token not supplied... forcing disconnect...'
    );
    await forceDisconnect(event.requestContext);
    return null;
  }

  const user = await getUserFromBearerToken(bearerToken);
  if (user == null) {
    console.error(
      event.requestContext.connectionId,
      'Authorization token invalid... forcing disconnect...'
    );
    await forceDisconnect(event.requestContext);
    return null;
  }

  return user;
};

export const connectHandler: Handler<APIGatewayWebSocketEvent> = async (event) => {
  if (process.env.IS_OFFLINE != null) {
    const user = await authorizeUserForOffline(event);
    if (user == null) {
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
};

export const disconnectHandler: Handler<APIGatewayWebSocketEvent> = async (event) => {
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
};

export const defaultHandler: Handler = async (event) => {
  console.error('Unknown request:', event);
  return error;
};
