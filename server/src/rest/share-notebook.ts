import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { DNotebookAccessLevel, DUser, Notebook } from '@actually-colab/editor-types';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import {
  assertFullAccessToNotebook,
  grantAccessByEmail,
} from '../db/pgsql/models/NotebookAccessLevel';
import { AC_REST_MIDDLEWARE_OPTS } from './route-helpers';
import { getNotebookMeta } from '../db/pgsql/models/Notebook';

interface RShareNotebook {
  email: DUser['email'];
  access_level: DNotebookAccessLevel['access_level'];
}

type TEvent = TShallotHttpEvent<
  { email: DUser['email'] },
  { nb_id: DNotebookAccessLevel['nb_id'] },
  unknown,
  RShareNotebook
>;

const _handler: ShallotRawHandler<TEvent, Notebook> = async ({
  requestContext: { authorizer },
  pathParameters,
  body,
}) => {
  const user = authorizer as DUser | null;
  if (user?.uid == null) {
    throw new createHTTPError.Unauthorized();
  }

  if (pathParameters?.nb_id == null) {
    throw new createHTTPError.BadRequest('Must specify body.nb_id');
  }

  if (body?.email == null) {
    throw new createHTTPError.BadRequest('Must specify body.email');
  }

  if (body?.access_level == null) {
    throw new createHTTPError.BadRequest('Must specify body.access_level');
  }

  if (body.email === user.email) {
    throw new createHTTPError.BadRequest('Cannot grant access to yourself!');
  }

  await assertFullAccessToNotebook(user.uid, pathParameters.nb_id);

  await grantAccessByEmail(body.email, pathParameters.nb_id, body.access_level);

  // TODO: Send an email to the user https://github.com/actually-colab/editor/issues/27

  return { message: 'success', data: await getNotebookMeta(pathParameters.nb_id) };
};

export const handler = ShallotAWSRestWrapper(
  _handler,
  undefined,
  AC_REST_MIDDLEWARE_OPTS
);
