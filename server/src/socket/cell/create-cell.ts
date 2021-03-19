import { createCell, DCell } from '../../db/pgsql/models/Cell';
import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
  WebSocketRequestContext,
} from '../middleware/wrapper';

import createHttpError from 'http-errors';
import { getActiveSessions, getActiveSessionById } from '../../db/pgsql/models/ActiveSession';
import { getManagementApi } from '../client-management';

interface TCreateCellEventBody {
  data: {
    nb_id: DCell['nb_id'];
    language: DCell['language'];
  };
}

type TCreateCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TCreateCellEventBody
>;

const sendCellCreatedEvent = async (
  context: WebSocketRequestContext,
  cell: DCell
): Promise<void> => {
  const cellEditedEventBody = JSON.stringify({
    action: 'cell_created',
    triggered_by: context.authorizer.uid,
    data: cell,
  });

  const connectionIds = await getActiveSessions(cell.nb_id);

  const apigApi = getManagementApi(context);
  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await apigApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: cellEditedEventBody,
          })
          .promise();
      } catch (err) {
        console.error('Could not reach', connectionId);
      }
    })
  );
};

const _handler: ShallotRawHandler<TCreateCellEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.nb_id == null || data.language == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  const cell = await createCell(session, data);
  if (cell == null) {
    throw new createHttpError.InternalServerError('Could not create cell');
  }

  await sendCellCreatedEvent(requestContext, cell);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
