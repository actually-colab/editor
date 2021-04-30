import type { DCell, DUser } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import { broadcastToNotebook } from '../client-management';
import { getActiveSessionById } from '../../db/pgsql/models/ActiveSession';
import { createCell } from '../../db/pgsql/models/Cell';

interface TCreateCellEventBody {
  data: {
    nb_id: DCell['nb_id'];
    language: DCell['language'];
  };
}

type TCreateCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TCreateCellEventBody,
  DUser
>;

const _handler: ShallotRawHandler<TCreateCellEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.nb_id == null || data.language == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  const cell = await createCell(session, data);
  if (cell == null) {
    throw new createHttpError.InternalServerError('Could not create cell');
  }

  await broadcastToNotebook(requestContext, session.nb_id, {
    action: 'cell_created',
    triggered_by: requestContext.authorizer.uid,
    data: cell,
  });
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
