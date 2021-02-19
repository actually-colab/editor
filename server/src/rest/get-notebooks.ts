import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { Notebook } from '../db/pgsql/models/Notebook';
import type { DUser } from 'db/pgsql/models/User';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { getNotebooksForUser } from '../db/pgsql/models/Notebook';

const _handler: ShallotRawHandler<TShallotHttpEvent, Notebook[]> = async ({
  requestContext: { authorizer },
}) => {
  const user = authorizer as DUser | null;
  if (user?.email == null) {
    throw new createHTTPError.InternalServerError();
  }

  const notebooks = await getNotebooksForUser(user.email);

  return { message: 'success', data: notebooks };
};

export const handler = ShallotAWSRestWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
