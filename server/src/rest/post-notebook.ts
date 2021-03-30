import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { Notebook, DUser } from '@actually-colab/editor-types';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { createNotebook } from '../db/pgsql/models/Notebook';
import { AC_REST_MIDDLEWARE_OPTS } from './route-helpers';

interface RNotebook {
  name: string;
}

type TEvent = TShallotHttpEvent<{ email: string }, unknown, unknown, RNotebook>;

const _handler: ShallotRawHandler<TEvent, Notebook> = async ({
  body,
  requestContext: { authorizer },
}) => {
  const user = authorizer as DUser | null;
  if (user?.email == null) {
    throw new createHTTPError.InternalServerError();
  }

  if (body?.name == null) {
    throw new createHTTPError.BadRequest('Must specify body.name');
  }

  const notebook = await createNotebook(
    { name: body.name, language: 'python' },
    user.uid
  );

  return { message: 'success', data: notebook };
};

export const handler = ShallotAWSRestWrapper(
  _handler,
  undefined,
  AC_REST_MIDDLEWARE_OPTS
);
