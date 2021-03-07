import { DUser, getUser, getUserById } from '../db/pgsql/models/User';

import jwt from 'jsonwebtoken';
import { DActiveSession, getSessionById } from '../db/pgsql/models/ActiveSession';

interface TokenPayload {
  email: DUser['email'];
  tokenType: 'dev' | 'google';
}

export const getDevToken = (email: DUser['email']): string => {
  return jwt.sign({ email, tokenType: 'dev' } as TokenPayload, 'dev');
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
      break;
    }
    default: {
      throw new Error('Invalid token');
    }
  }

  return getUser(tokenPayload.email);
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
