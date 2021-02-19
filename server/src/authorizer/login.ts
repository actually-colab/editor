import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { createUser, getUser } from '../db/pgsql/models/User';

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
type TResult = { accessToken: string };

const _handler: ShallotRawHandler<TEvent, { accessToken: string }> = async ({ body }) => {
  let accessToken: TResult['accessToken'];
  switch (body?.tokenType) {
    case 'google': {
      throw new createHTTPError.BadRequest('google login method not implemented');
    }
    case 'dev': {
      let user = await getUser(body.email);

      if (user == null) {
        user = await createUser({ email: body.email, name: body.name });
      }

      accessToken = 'todo';
      break;
    }
    default: {
      throw new createHTTPError.BadRequest('Invalid tokenType');
    }
  }

  return { message: 'success', data: { accessToken } };
};

export const handler = ShallotAWSRestWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
