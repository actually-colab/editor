import { DNotebook } from '@actually-colab/editor-types';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import createHttpError from 'http-errors';

import { openNotebook } from '../../db/pgsql/models/ActiveSession';
import { getUserAccessLevel } from '../../db/pgsql/models/NotebookAccessLevel';
import { broadcastToNotebook } from '../client-management';

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
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
