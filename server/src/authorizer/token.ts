import type { DUser } from '../db/pgsql/models/User';

import jwt from 'jsonwebtoken';

interface TokenPayload {
  email: DUser['email'];
  tokenType: 'dev' | 'google';
}

export const getDevToken = (email: DUser['email']): string => {
  return jwt.sign({ email, tokenType: 'dev' } as TokenPayload, 'dev');
};
