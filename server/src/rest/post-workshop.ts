import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { Workshop, DUser, DWorkshop } from '@actually-colab/editor-types';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { AC_REST_MIDDLEWARE_OPTS } from './route-helpers';
import { createWorkshop } from '../db/pgsql/models/Workshop';

type RealOmit<T, K extends PropertyKey> = { [P in keyof T as Exclude<P, K>]: T[P] };
type RWorkshop = RealOmit<DWorkshop, 'ws_id'>;

type TEvent = TShallotHttpEvent<{ email: string }, unknown, unknown, RWorkshop>;

const _handler: ShallotRawHandler<TEvent, Workshop> = async ({
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

  if (body?.description == null) {
    throw new createHTTPError.BadRequest('Must specify body.description');
  }

  const workshop = await createWorkshop(body, [user.uid], []);

  return { message: 'success', data: workshop };
};

export const handler = ShallotAWSRestWrapper(
  _handler,
  undefined,
  AC_REST_MIDDLEWARE_OPTS
);
