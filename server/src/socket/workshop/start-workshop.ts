import type { DUser, DWorkshopAccessLevel } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import { getWorkshopAccessLevel } from '../../db/pgsql/models/WorkshopAccessLevel';
import { startWorkshop } from '../../db/pgsql/models/Workshop';

import { emitToConnections } from '../client-management';

interface TStartWorkshopEventBody {
  data: {
    ws_id: DWorkshopAccessLevel['ws_id'];
  };
}

type TStartWorkshopEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TStartWorkshopEventBody
>;

const _handler: ShallotRawHandler<TStartWorkshopEvent> = async ({
  requestContext,
  body,
}) => {
  const user = requestContext.authorizer as DUser | null;
  if (user?.uid == null) {
    throw new createHttpError.Unauthorized();
  }

  const data = body?.data;
  if (data?.ws_id == null) {
    throw new createHttpError.BadRequest('Must specify body.ws_id');
  }

  // Assert that the request user has full access
  const requestingUserAccessLevel = await getWorkshopAccessLevel(user.uid, data.ws_id);
  if (requestingUserAccessLevel !== 'Instructor') {
    throw new createHttpError.Forbidden('Must have Instructor Access to start workshop');
  }

  const sessions = await startWorkshop(data.ws_id);

  await emitToConnections(
    requestContext,
    sessions.map((s) => s.connectionId),
    {
      action: 'workshop_started',
      triggered_by: user.uid,
      data: {
        ws_id: data.ws_id,
      },
    }
  );
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
