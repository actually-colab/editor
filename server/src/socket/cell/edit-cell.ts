import { DCell, editCell } from '../../db/dynamo/models/Cell';
import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
  WebSocketRequestContext,
} from '../middleware/wrapper';

import createHttpError from 'http-errors';
import { getActiveSessions, getSessionById } from '../../db/dynamo/models/ActiveSession';
import { getManagementApi } from '../client-management';

interface TEditCellEventBody {
  cell_id: DCell['cell_id'];
  nb_id: DCell['nb_id'];
  contents: string;
}

type TEditCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TEditCellEventBody
>;

const sendCellEditedEvent = async (
  context: WebSocketRequestContext,
  cell: TEditCellEventBody
): Promise<void> => {
  const cellEditedEventBody = {
    eventType: 'cell_edited',
    cell,
  };

  const connectionIds = await getActiveSessions(cell.nb_id);

  const apigApi = getManagementApi(context);
  await Promise.all(
    connectionIds.map((connectionId) =>
      apigApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: cellEditedEventBody,
        })
        .promise()
    )
  );
};

const _handler: ShallotRawHandler<TEditCellEvent> = async ({ requestContext, body }) => {
  console.log('edit_cell event');
  if (body?.cell_id == null || body.nb_id == null || body.contents == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  // const user = requestContext.authorizer;
  const session = await getSessionById(requestContext.connectionId);

  if (session == null || session.nb_id != body.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  // TODO: Check cell lock
  await editCell(session, body);

  sendCellEditedEvent(requestContext, body);
};

export const handler = ShallotSocketWrapper(_handler, undefined, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
