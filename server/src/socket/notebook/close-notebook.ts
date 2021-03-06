import type { DNotebook, DUser } from '@actually-colab/editor-types';
import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import createHttpError from 'http-errors';

import { closeNotebook } from '../../db/pgsql/models/ActiveSession';
import { assertReadAccessToNotebook } from '../../db/pgsql/models/NotebookAccessLevel';

import { broadcastToNotebook, emitToUser } from '../client-management';

interface TCloseNotebookEventBody {
  data: {
    nb_id: DNotebook['nb_id'];
  };
}

type TCloseNotebookEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TCloseNotebookEventBody,
  DUser
>;

const _handler: ShallotRawHandler<TCloseNotebookEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.nb_id == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  await assertReadAccessToNotebook(requestContext.authorizer.uid, data.nb_id);

  const unlockedCells = await closeNotebook(requestContext.connectionId, data.nb_id);

  const notebookClosedEvent = {
    action: 'notebook_closed',
    triggered_by: requestContext.authorizer.uid,
    data: { nb_id: data.nb_id, uid: requestContext.authorizer.uid },
  };
  await Promise.all([
    broadcastToNotebook(requestContext, data.nb_id, notebookClosedEvent),
    emitToUser(requestContext, notebookClosedEvent),
    Promise.all(
      unlockedCells.map((cell) =>
        broadcastToNotebook(requestContext, cell.nb_id, {
          action: 'cell_unlocked',
          triggered_by: requestContext.authorizer.uid,
          data: cell,
        })
      )
    ),
  ]);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
