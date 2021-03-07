import { DCell, editCell } from '../../db/pgsql/models/Cell';
import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
  WebSocketRequestContext,
} from '../middleware/wrapper';

import createHttpError from 'http-errors';
import { getActiveSessions, getSessionById } from '../../db/pgsql/models/ActiveSession';
import { getManagementApi } from '../client-management';

interface TEditCellEventBody {
  data: {
    cell_id: DCell['cell_id'];
    nb_id: DCell['nb_id'];
    contents: string;
  };
}

type TEditCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TEditCellEventBody
>;

const sendCellEditedEvent = async (
  context: WebSocketRequestContext,
  cell: TEditCellEventBody['data']
): Promise<void> => {
  const cellEditedEventBody = JSON.stringify({
    eventType: 'cell_edited',
    cell,
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

const _handler: ShallotRawHandler<TEditCellEvent> = async ({ requestContext, body }) => {
  const data = body?.data;
  if (data?.cell_id == null || data.nb_id == null || data.contents == null) {
    console.error('data:', data);
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  // const user = requestContext.authorizer;
  const session = await getSessionById(requestContext.connectionId);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  // TODO: Check cell lock
  await editCell(session, data);

  sendCellEditedEvent(requestContext, data);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
