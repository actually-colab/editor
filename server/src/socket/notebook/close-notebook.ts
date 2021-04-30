import type { DNotebook, DUser } from '@actually-colab/editor-types';
import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import createHttpError from 'http-errors';

import { closeNotebook } from '../../db/pgsql/models/ActiveSession';
import { getUserAccessLevel } from '../../db/pgsql/models/NotebookAccessLevel';

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

  const access_level = await getUserAccessLevel(
    requestContext.authorizer.uid,
    data.nb_id
  );
  if (access_level == null) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  await closeNotebook(requestContext.connectionId, data.nb_id);

  const resEvent = {
    action: 'notebook_closed',
    triggered_by: requestContext.authorizer.uid,
    data: { nb_id: data.nb_id, uid: requestContext.authorizer.uid },
  };
  await broadcastToNotebook(requestContext, data.nb_id, resEvent);
  await emitToUser(requestContext, resEvent);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
