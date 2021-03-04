import { DCell, editCell } from '../../db/dynamo/models/Cell';
import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import createHttpError from 'http-errors';
import { getSessionById } from '../../db/dynamo/models/ActiveSession';

interface TEditCellEventBody {
  cell_id: DCell['cell_id'];
  nb_id: DCell['nb_id'];
  contents: string;
}

type TEditCellEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TEditCellEventBody
>;

const _handler: ShallotRawHandler<TEditCellEvent> = async ({ requestContext, body }) => {
  if (body?.cell_id == null || body.nb_id == null || body.contents == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  // const user = requestContext.authorizer;
  const session = await getSessionById(requestContext.connectionId);

  if (session == null || session.nb_id != body.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  // TODO: Check cell lock
  await editCell(session, body);
};

export const handler = ShallotSocketWrapper(_handler);
