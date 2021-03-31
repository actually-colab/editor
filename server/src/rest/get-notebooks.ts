import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { Notebook, DUser } from '@actually-colab/editor-types';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { getNotebooksForUser } from '../db/pgsql/models/Notebook';
import { AC_REST_MIDDLEWARE_OPTS } from './route-helpers';

const _handler: ShallotRawHandler<TShallotHttpEvent, Notebook[]> = async ({
  requestContext: { authorizer },
}) => {
  const user = authorizer as DUser | null;
  if (user?.uid == null) {
    throw new createHTTPError.Unauthorized();
  }

  const notebooks = await getNotebooksForUser(user.uid);

  return { message: 'success', data: notebooks };
};

export const handler = ShallotAWSRestWrapper(
  _handler,
  undefined,
  AC_REST_MIDDLEWARE_OPTS
);
