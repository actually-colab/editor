import { DCell, DUser } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import { broadcastToNotebook } from '../client-management';

import { unlockCell } from '../../db/pgsql/models/Cell';
import { getActiveSessionById } from '../../db/pgsql/models/ActiveSession';
import { assertFullAccessToNotebook } from '../../db/pgsql/models/NotebookAccessLevel';

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
  TUnlockCellEventBody,
  DUser
>;

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
  await assertFullAccessToNotebook(session.uid, data.nb_id);

  const cell = await unlockCell(session, data.nb_id, data.cell_id);
  if (cell == null) {
    throw new createHttpError.BadRequest('Could not unlock cell');
  }

  await broadcastToNotebook(requestContext, session.nb_id, {
    action: 'cell_unlocked',
    triggered_by: requestContext.authorizer.uid,
    data: cell,
  });
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
