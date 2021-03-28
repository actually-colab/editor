import type { DCell } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
  WebSocketRequestContext,
} from '../middleware/wrapper';

import { getManagementApi } from '../client-management';

import {
  getActiveSessions,
  getActiveSessionById,
} from '../../db/pgsql/models/ActiveSession';
import { editCell } from '../../db/pgsql/models/Cell';

interface TEditCellEventBody {
  data: {
    cell_id: DCell['cell_id'];
    nb_id: DCell['nb_id'];
    cellData: {
      contents?: DCell['cell_id'];
      language?: DCell['language'];
      cursorPos?: DCell['cursor_pos'];
    };
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
  cell: DCell
): Promise<void> => {
  const cellEditedEventBody = JSON.stringify({
    action: 'cell_edited',
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

const _handler: ShallotRawHandler<TEditCellEvent> = async ({ requestContext, body }) => {
  const data = body?.data;
  if (data?.cell_id == null || data.nb_id == null || data.cellData == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  const cell = await editCell(session, data.nb_id, data.cell_id, data.cellData);
  if (cell == null) {
    throw new createHttpError.BadRequest('Could not edit cell');
  }

  await sendCellEditedEvent(requestContext, cell);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
