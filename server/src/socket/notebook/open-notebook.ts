import type { DNotebook, DUser } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import { getActiveSessionById, openNotebook } from '../../db/pgsql/models/ActiveSession';
import { assertReadAccessToNotebook } from '../../db/pgsql/models/NotebookAccessLevel';
import { getActiveNotebookContents } from '../../db/pgsql/models/Notebook';

import { broadcastToNotebook, emitToUser } from '../client-management';

interface TOpenNotebookEventBody {
  data: {
    nb_id: DNotebook['nb_id'];
  };
}

type TOpenNotebookEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TOpenNotebookEventBody,
  DUser
>;

const _handler: ShallotRawHandler<TOpenNotebookEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.nb_id == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  await assertReadAccessToNotebook(requestContext.authorizer.uid, data.nb_id);

  const activeSession = await getActiveSessionById(
    requestContext.connectionId,
    data.nb_id
  );
  if (activeSession != null) {
    throw new createHttpError.BadRequest(`Already connected to notebook ${data.nb_id}`);
  }

  await openNotebook(
    requestContext.connectionId,
    requestContext.authorizer.uid,
    data.nb_id
  );

  await broadcastToNotebook(requestContext, data.nb_id, {
    action: 'notebook_opened',
    triggered_by: requestContext.authorizer.uid,
    data: { nb_id: data.nb_id, uid: requestContext.authorizer.uid },
  });

  try {
    const contents = await getActiveNotebookContents(data.nb_id);
    if (contents == null) {
      throw new createHttpError.InternalServerError('Could not query notebook contents');
    }

    await emitToUser(requestContext, {
      action: 'notebook_contents',
      triggered_by: requestContext.authorizer.uid,
      data: contents,
    });
  } catch (err) {
    console.error('Could not fetch/send notebook_contents');
    throw err;
  }
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
