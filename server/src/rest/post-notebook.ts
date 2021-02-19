import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { createNotebook } from '../db/pgsql/models/Notebook';

interface RNotebook {
  name: string;
}

type TEvent = TShallotHttpEvent<{ email: string }, unknown, unknown, RNotebook>;

const _handler: ShallotRawHandler<TEvent, never> = async ({
  queryStringParameters,
  body,
}) => {
  if (queryStringParameters?.email == null) {
    throw new createHTTPError.BadRequest('Must specify queryStringParameters.email');
  }

  if (body?.name == null) {
    throw new createHTTPError.BadRequest('Must specify body.name');
  }

  await createNotebook({ name: body.name }, queryStringParameters.email);

  // TODO: Return notebook id https://github.com/actually-colab/editor/issues/40

  return { message: 'success' };
};

export const handler = ShallotAWSRestWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
