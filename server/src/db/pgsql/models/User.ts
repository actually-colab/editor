import type { ModelBase, UUID } from './ModelBase';

import pgsql from '../connection';
import tablenames from '../tablenames';
import { createDemoNotebook } from './Notebook';

/**Actually Colab Database User Object */
export interface DUser extends ModelBase {
  /**The user's generated UUID */
  uid: UUID;
  name: string;
  email: string;
}

/**Creates and returns a new user.
 *
 * @param user metadata to store
 * @returns the user, if created
 */
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

/**Queries a user by email.
 *
 * @param email The user's email.
 * @returns the user, if exists
 */
export const getUser = async (email: DUser['email']): Promise<DUser | null> => {
  const result = await pgsql<DUser>(tablenames.usersTableName)
    .select('*')
    .where({ email })
    .returning('*');

  return result && result.length > 0 ? result[0] : null;
};

/**Queries a user by uid.
 *
 * @param uid The user's UUID
 * @returns the user, if exists
 */
export const getUserById = async (uid: DUser['uid']): Promise<DUser | null> => {
  const result = await pgsql<DUser>(tablenames.usersTableName)
    .select('*')
    .where({ uid })
    .returning('*');

  return result && result.length > 0 ? result[0] : null;
};
