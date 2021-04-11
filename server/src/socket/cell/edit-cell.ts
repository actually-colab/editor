import type { DCell } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import { broadcastToNotebook } from '../client-management';

import { getActiveSessionById } from '../../db/pgsql/models/ActiveSession';
import { deleteCell, editCell } from '../../db/pgsql/models/Cell';

interface TEditCellEventBody {
  data: {
    cell_id: DCell['cell_id'];
    nb_id: DCell['nb_id'];
    cellData: Pick<DCell, 'cursor_col' | 'cursor_row' | 'contents' | 'language'>;
  };
}

type TEditCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TEditCellEventBody
>;

const _handler: ShallotRawHandler<TEditCellEvent> = async ({ requestContext, body }) => {
  const data = body?.data;
  if (data?.cell_id == null || data.nb_id == null || data.cellData === undefined) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  if (data.cellData == null) {
    // TODO: Check lock
    await deleteCell(session, data.nb_id, data.cell_id);

    await broadcastToNotebook(requestContext, session.nb_id, {
      action: 'cell_deleted',
      triggered_by: requestContext.authorizer.uid,
      data: {
        cell_id: data.cell_id,
        nb_id: data.nb_id,
      },
    });
  } else {
    const cell = await editCell(session, data.nb_id, data.cell_id, data.cellData);
    if (cell == null) {
      throw new createHttpError.BadRequest('Could not edit cell');
    }

    await broadcastToNotebook(requestContext, session.nb_id, {
      action: 'cell_edited',
      triggered_by: requestContext.authorizer.uid,
      data: cell,
    });
  }
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
