import type { DUser, DWorkshopAccessLevel } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import { getWorkshopAccessLevel } from '../../db/pgsql/models/WorkshopAccessLevel';
import { startWorkshop, getWorkshopById } from '../../db/pgsql/models/Workshop';

import { emitToConnections } from '../client-management';
import { sendWorkshopStartedEmail } from '../../email/mailer';

interface TStartWorkshopEventBody {
  data: {
    ws_id: DWorkshopAccessLevel['ws_id'];
  };
}

type TStartWorkshopEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TStartWorkshopEventBody,
  DUser
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
  const workshop = await getWorkshopById(data.ws_id);

  await Promise.all([
    sendWorkshopStartedEmail(
      sessions.map((u) => u.email),
      workshop.name,
      workshop.description
    ),
    emitToConnections(
      requestContext,
      sessions.map((s) => s.connectionId),
      {
        action: 'workshop_started',
        triggered_by: user.uid,
        data: {
          ws_id: data.ws_id,
        },
      }
    ),
  ]);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
