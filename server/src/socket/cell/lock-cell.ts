import { DCell } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import { broadcastToNotebook } from '../client-management';

import { lockCell } from '../../db/pgsql/models/Cell';
import { getActiveSessionById } from '../../db/pgsql/models/ActiveSession';

interface TLockCellEventBody {
  data: {
    nb_id: DCell['nb_id'];
    cell_id: DCell['cell_id'];
  };
}

type TLockCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TLockCellEventBody
>;

const _handler: ShallotRawHandler<TLockCellEvent> = async ({ requestContext, body }) => {
  const data = body?.data;
  if (data?.nb_id == null || data.cell_id == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id !== data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  const cell = await lockCell(session, data.nb_id, data.cell_id);
  if (cell == null) {
    throw new createHttpError.BadRequest('Could not lock cell');
  }

  await broadcastToNotebook(requestContext, session.nb_id, {
    action: 'cell_locked',
    triggered_by: requestContext.authorizer.uid,
    data: cell,
  });
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
