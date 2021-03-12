import pgsql from '../connection';
import tablenames from '../tablenames';
import { createDemoNotebook } from './Notebook';

export type NotebookAccessLevel = 'Full Access' | 'Read Only';

export interface DUser {
  [k: string]: number | string | boolean;
  uid: string;
  name: string;
  email: string;
}

export const createUser = async (user: Partial<DUser>): Promise<DUser | null> => {
  const newUser = (
    await pgsql<DUser>(tablenames.usersTableName).insert(user).returning('*')
  )[0];

  if (newUser == null) {
    return null;
  }

  await createDemoNotebook(newUser.uid);

  return newUser;
};

export const getUser = async (email: DUser['email']): Promise<DUser | null> => {
  const result = await pgsql<DUser>(tablenames.usersTableName)
    .select('*')
    .where({ email })
    .returning('*');

  return result && result.length > 0 ? result[0] : null;
};

export const getUserById = async (uid: DUser['uid']): Promise<DUser | null> => {
  const result = await pgsql<DUser>(tablenames.usersTableName)
    .select('*')
    .where({ uid })
    .returning('*');

  return result && result.length > 0 ? result[0] : null;
};
