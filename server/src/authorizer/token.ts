import { DUser, getUserById } from '../db/pgsql/models/User';

import jwt from 'jsonwebtoken';
import { DActiveSession, getSessionById } from '../db/pgsql/models/ActiveSession';
import createHttpError from 'http-errors';

interface TokenPayload {
  uid: DUser['uid'];
  tokenType: 'dev' | 'prod' | 'google';
}

export const getDevToken = (uid: DUser['uid']): string => {
  return jwt.sign({ uid, tokenType: 'dev' } as TokenPayload, 'dev');
};

export const getProdToken = (uid: DUser['uid']): string => {
  if (process.env.PROD_AUTH_SECRET == null) {
    throw new Error('PROD_AUTH_SECRET env var not defined');
  }

  return jwt.sign(
    { uid, tokenType: 'prod' } as TokenPayload,
    process.env.PROD_AUTH_SECRET
  );
};

export const decodeTokenPayload = (accessToken: string): TokenPayload => {
  return jwt.decode(accessToken) as TokenPayload;
};

export const getAccessToken = (authorizationToken: string): string => {
  if (authorizationToken.startsWith('Bearer')) {
    return authorizationToken.substr(7);
  }

  throw new Error('Invalid token');
};

export const getUserFromToken = async (
  authorizationToken: string
): Promise<DUser | null> => {
  const accessToken = getAccessToken(authorizationToken);
  const tokenPayload = decodeTokenPayload(accessToken);

  switch (tokenPayload.tokenType) {
    case 'dev': {
      if (!process.env.IS_OFFLINE) {
        throw new createHttpError.Forbidden('Cannot use dev token in prod');
      }
      break;
    }
    case 'prod': {
      if (process.env.PROD_AUTH_SECRET == null) {
        throw new Error('PROD_AUTH_SECRET env var not defined');
      }

      if (jwt.verify(accessToken, process.env.PROD_AUTH_SECRET) == null) {
        throw new createHttpError.Unauthorized('Invalid token');
      }

      break;
    }
    default: {
      throw new createHttpError.BadRequest('Unknown token type');
    }
  }

  return getUserById(tokenPayload.uid);
};

export const getUserFromConnectionId = async (
  connectionId: DActiveSession['connectionId']
): Promise<DUser | null> => {
  const session = await getSessionById(connectionId);
  if (session == null) {
    return null;
  }

  return getUserById(session.uid);
};
