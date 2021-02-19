import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { Notebook } from '../db/pgsql/models/Notebook';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { getNotebooksForUser } from '../db/pgsql/models/Notebook';

type TEvent = TShallotHttpEvent<{ email: string }>;

const _handler: ShallotRawHandler<TEvent, Notebook[]> = async ({
  queryStringParameters,
}) => {
  if (queryStringParameters?.email == null) {
    throw new createHTTPError.BadRequest('Must specify queryStringParameters.email');
  }

  const notebooks = await getNotebooksForUser(queryStringParameters.email);

  return { message: 'success', data: notebooks };
};

export const handler = ShallotAWSRestWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
