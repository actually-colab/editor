import type { DNotebook } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import { openNotebook } from '../../db/pgsql/models/ActiveSession';
import { getUserAccessLevel } from '../../db/pgsql/models/NotebookAccessLevel';
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
  TOpenNotebookEventBody
>;

const _handler: ShallotRawHandler<TOpenNotebookEvent> = async ({
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

  await openNotebook(
    requestContext.connectionId,
    requestContext.authorizer.uid,
    data.nb_id
  );

  await broadcastToNotebook(requestContext, data.nb_id, {
    action: 'notebook_opened',
    triggered_by: requestContext.authorizer.uid,
    data: requestContext.authorizer, // TODO: Return something less sensitive
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
});
