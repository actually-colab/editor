import type { DUser, DNotebookAccessLevel } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import {
  getUserAccessLevel,
  grantAccessByEmail,
} from '../../db/pgsql/models/NotebookAccessLevel';

import { broadcastToNotebook } from '../client-management';

interface TShareNotebookEventBody {
  data: {
    nb_id: DNotebookAccessLevel['nb_id'];
    email: DUser['email'];
    access_level: DNotebookAccessLevel['access_level'];
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

  if (data?.email == null) {
    throw new createHttpError.BadRequest('Must specify body.email');
  }

  if (data?.access_level == null) {
    throw new createHttpError.BadRequest('Must specify body.access_level');
  }

  if (data.email === user.email) {
    throw new createHttpError.BadRequest('Cannot grant access to yourself!');
  }

  // Assert that the request user has full access
  const requestingUserAccessLevel = await getUserAccessLevel(user.uid, data.nb_id);
  if (requestingUserAccessLevel !== 'Full Access') {
    throw new createHttpError.Forbidden('Must have Full Access to share a notebook');
  }

  const ual = await grantAccessByEmail(data.email, data.nb_id, data.access_level);

  await broadcastToNotebook(requestContext, data.nb_id, {
    action: 'notebook_shared',
    triggered_by: user.uid,
    data: ual,
  });
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
