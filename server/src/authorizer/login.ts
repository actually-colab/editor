import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { createUser, DUser, getUser } from '../db/pgsql/models/User';
import { getDevToken } from './token';

interface DevLogin {
  tokenType: 'dev';
  email: string;
  name?: string;
}

interface GoogleLogin {
  tokenType: 'google';
  idToken: string;
}

type TEvent = TShallotHttpEvent<unknown, unknown, unknown, DevLogin | GoogleLogin>;
type TResult = { sessionToken: string; user: DUser };

const _handler: ShallotRawHandler<TEvent, TResult> = async ({ body }) => {
  let sessionToken: TResult['sessionToken'];
  let user: DUser | null;
  switch (body?.tokenType) {
    case 'google': {
      throw new createHTTPError.BadRequest('google login method not implemented');
    }
    case 'dev': {
      if (process.env.IS_OFFLINE == null) {
        throw new createHTTPError.Unauthorized('Cannot use dev token in prod');
      }

      const email = body.email.toLowerCase().trim();
      user = await getUser(email);

      if (user == null) {
        user = await createUser({ email, name: body.name });
      }

      sessionToken = getDevToken(user.uid);
      break;
    }
    default: {
      throw new createHTTPError.BadRequest('Invalid tokenType');
    }
  }

  return { message: 'success', data: { sessionToken, user } };
};

export const handler = ShallotAWSRestWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
