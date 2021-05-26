import type { DUser, DNotebookAccessLevel } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import {
  assertFullAccessToNotebook,
  getUserAccessLevel,
  grantAccessByEmails,
  revokeAccessByEmails,
} from '../../db/pgsql/models/NotebookAccessLevel';

import { broadcastToNotebook, emitToConnections } from '../client-management';
import { sendNotebookSharedEmail } from '../../email/mailer';
import { getNotebookMeta } from '../../db/pgsql/models/Notebook';

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
  TShareNotebookEventBody,
  DUser
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

  await assertFullAccessToNotebook(user.uid, data.nb_id);

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
  } else {
    const users = await grantAccessByEmails(data.emails, data.nb_id, data.access_level);
    const notebook = await getNotebookMeta(data.nb_id);

    await Promise.all([
      sendNotebookSharedEmail(data.emails, user.name ?? 'Unknown User', notebook.name),
      broadcastToNotebook(requestContext, data.nb_id, {
        action: 'notebook_shared',
        triggered_by: user.uid,
        data: {
          nb_id: data.nb_id,
          users,
        },
      }),
    ]);
  }
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
