import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type {
  DUser,
  NotebookContents,
  DNotebookAccessLevel,
} from '@actually-colab/editor-types';
import { getNotebookContents } from '../db/pgsql/models/Notebook';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { assertReadAccessToNotebook } from '../db/pgsql/models/NotebookAccessLevel';
import { AC_REST_MIDDLEWARE_OPTS } from './route-helpers';

type TEvent = TShallotHttpEvent<
  unknown,
  { nb_id: DNotebookAccessLevel['nb_id'] },
  unknown,
  unknown
>;

const _handler: ShallotRawHandler<TEvent, NotebookContents> = async ({
  requestContext: { authorizer },
  pathParameters,
}) => {
  const user = authorizer as DUser | null;
  if (user?.uid == null) {
    throw new createHTTPError.Unauthorized();
  }

  if (pathParameters?.nb_id == null) {
    throw new createHTTPError.BadRequest('Must specify body.nb_id');
  }

  await assertReadAccessToNotebook(user.uid, pathParameters.nb_id);

  const notebook = await getNotebookContents(pathParameters.nb_id);
  if (notebook == null) {
    throw new createHTTPError.InternalServerError('Could not load notebook');
  }

  return { message: 'success', data: notebook };
};

export const handler = ShallotAWSRestWrapper(
  _handler,
  undefined,
  AC_REST_MIDDLEWARE_OPTS
);
