import pgsql from '../connection';
import tablenames from '../tablenames';

export type NotebookAccessLevel = 'Full Access' | 'Read Only';

export interface DUser {
  uid: number;
  name: string;
  email: string;
}

export const createUser = async (user: Partial<DUser>): Promise<DUser> =>
  (await pgsql<DUser>(tablenames.usersTableName).insert(user).returning('*'))[0];

export const getUser = async (email: DUser['email']): Promise<DUser> =>
  (
    await pgsql<DUser>(tablenames.usersTableName)
      .select('*')
      .where({ email })
      .returning('*')
  )[0];
