import type { DUser, DNotebookAccessLevel } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import {
  getUserAccessLevel,
  grantAccessByEmails,
  revokeAccessByEmails,
} from '../../db/pgsql/models/NotebookAccessLevel';

import { broadcastToNotebook, emitToConnections } from '../client-management';

interface TShareNotebookEventBody {
  data: {
    nb_id: DNotebookAccessLevel['nb_id'];
    emails: DUser['email'][];
    access_level?: DNotebookAccessLevel['access_level'] | null;
  };
}

type TShareNotebookEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TShareNotebookEventBody
>;

const _handler: ShallotRawHandler<TShareNotebookEvent> = async ({
  requestContext,
  body,
}) => {
  const user = requestContext.authorizer as DUser | null;
  if (user?.uid == null) {
    throw new createHttpError.Unauthorized();
  }

  const data = body?.data;
  if (data?.nb_id == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  if (data?.emails == null) {
    throw new createHttpError.BadRequest('Must specify body.emails');
  }

  if (data?.access_level === undefined) {
    throw new createHttpError.BadRequest('Must specify body.access_level');
  }

  if (data.emails.includes(user.email)) {
    throw new createHttpError.BadRequest('Cannot grant access to yourself!');
  }

  // Assert that the request user has full access
  const requestingUserAccessLevel = await getUserAccessLevel(user.uid, data.nb_id);
  if (requestingUserAccessLevel !== 'Full Access') {
    throw new createHttpError.Forbidden('Must have Full Access to share a notebook');
  }

  if (data.access_level === null) {
    const revoked = await revokeAccessByEmails(data.emails, data.nb_id);

    await Promise.all([
      broadcastToNotebook(requestContext, data.nb_id, {
        action: 'notebook_unshared',
        triggered_by: user.uid,
        data: {
          nb_id: data.nb_id,
          uids: revoked.uids,
        },
      }),
      emitToConnections(requestContext, revoked.connectionIds, {
        action: 'notebook_unshared',
        triggered_by: user.uid,
        data: {
          nb_id: data.nb_id,
          uids: revoked.uids,
        },
      }),
    ]);

    // TODO
    // await emitToConnections(requestContext, revoked.connectionIds, {
    //   'notebook_closed',
    //   triggered_by: user.uid,
    //   data: {
    //     nb_id: data.nb_id,
    //     uid:
    //   }
    // });
  } else {
    const users = await grantAccessByEmails(data.emails, data.nb_id, data.access_level);

    await broadcastToNotebook(requestContext, data.nb_id, {
      action: 'notebook_shared',
      triggered_by: user.uid,
      data: {
        nb_id: data.nb_id,
        users,
      },
    });
  }
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
