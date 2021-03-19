import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
  WebSocketRequestContext,
} from '../middleware/wrapper';

import { getManagementApi } from '../client-management';

import { DCell, unlockCell } from '../../db/pgsql/models/Cell';
import {
  getActiveSessions,
  getActiveSessionById,
} from '../../db/pgsql/models/ActiveSession';

interface TUnlockCellEventBody {
  data: {
    nb_id: DCell['nb_id'];
    cell_id: DCell['cell_id'];
  };
}

type TUnlockCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TUnlockCellEventBody
>;

const sendCellUnlockedEvent = async (
  context: WebSocketRequestContext,
  cell: Partial<DCell>
): Promise<void> => {
  const cellUnlockedEventBody = JSON.stringify({
    action: 'cell_unlocked',
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
            Data: cellUnlockedEventBody,
          })
          .promise();
      } catch (err) {
        console.error('Could not reach', connectionId);
      }
    })
  );
};

const _handler: ShallotRawHandler<TUnlockCellEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.nb_id == null || data.cell_id == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  const cell = await unlockCell(session, data.nb_id, data.cell_id);
  if (cell == null) {
    throw new createHttpError.BadRequest('Could not unlock cell');
  }

  await sendCellUnlockedEvent(requestContext, cell);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
