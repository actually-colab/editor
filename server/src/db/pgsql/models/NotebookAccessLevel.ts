import type {
  DUser,
  DNotebookAccessLevel,
  NotebookAccessLevel,
} from '@actually-colab/editor-types';
import { QueryBuilder } from 'knex';

import pgsql from '../connection';
import tablenames from '../tablenames';

/**Grants access for a specific user to a specific notebook.
 *
 * @param uid the user to grant notebook access to
 * @param nb_id the notebook to grant access to
 * @param access_level type of access for the user
 * @returns the access provided, if successful
 */
export const grantAccessById = async (
  uid: DUser['uid'],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): Promise<NotebookAccessLevel> => {
  return pgsql.transaction(async (trx) => {
    await trx<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
      .insert({ uid, nb_id, access_level })
      .onConflict(['nb_id', 'uid'])
      .merge()
      .returning('*');

    const user: DUser = (
      await trx<DUser>(tablenames.usersTableName).select('*').where({ uid })
    )[0];

    return { ...user, access_level };
  });
};

/**Grants access for many users to a specific notebook.
 *
 * @param uids the users to grant notebook access to
 * @param nb_id the notebook to grant access to
 * @param access_level type of access for the user
 * @returns the access provided, if successful
 */
export const grantNotebookAccessByIds = (
  uids: DUser['uid'][],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): QueryBuilder<DNotebookAccessLevel, NotebookAccessLevel[]> =>
  pgsql
    .with(
      'updated_uals',
      pgsql<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
        .insert(uids.map((uid) => ({ uid, nb_id, access_level })))
        .onConflict(['nb_id', 'uid'])
        .merge()
        .returning('*')
    )
    .select('u.*', 'updated_uals.access_level AS access_level')
    .from('updated_uals')
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'updated_uals.uid');

/**Grants access for a specific user to a specific notebook.
 *
 * @param email the user to grant notebook access to
 * @param nb_id the notebook to grant access to
 * @param access_level type of access for the user
 * @returns the access provided, if successful
 */
export const grantAccessByEmail = async (
  email: DUser['email'],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): Promise<NotebookAccessLevel> => {
  return pgsql.transaction(async (trx) => {
    const user: DUser = (
      await trx<DUser>(tablenames.usersTableName).select('*').where({ email })
    )[0];

    await trx<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
      .insert({ uid: user.uid, nb_id, access_level })
      .onConflict(['nb_id', 'uid'])
      .merge()
      .returning('*');

    return { ...user, access_level };
  });
};

/**Grants access for a specific user to a specific notebook.
 *
 * @param email the user to grant notebook access to
 * @param nb_id the notebook to grant access to
 * @param access_level type of access for the user
 * @returns the access provided, if successful
 */
export const grantAccessByEmails = async (
  emails: DUser['email'][],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): Promise<NotebookAccessLevel[]> => {
  return pgsql.transaction(async (trx) => {
    const users = await trx<DUser>(tablenames.usersTableName)
      .select('*')
      .whereIn('email', emails);

    await trx<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
      .insert(users.map((user) => ({ uid: user.uid, nb_id, access_level })))
      .onConflict(['nb_id', 'uid'])
      .merge()
      .returning('*');

    return users.map((user) => ({ ...user, access_level }));
  });
};

/**Queries a user's access level to a specific notebook.
 *
 * @param uid the user to query
 * @param nb_id the notebook to query
 * @returns the user's access level, if any
 */
export const getUserAccessLevel = async (
  uid: DUser['uid'],
  nb_id: DNotebookAccessLevel['nb_id']
): Promise<DNotebookAccessLevel['access_level'] | null> => {
  const accessLevels = await pgsql(tablenames.notebookAccessLevelsTableName)
    .select('access_level')
    .where({ uid, nb_id });

  if (accessLevels.length === 0) {
    return null;
  }

  return accessLevels[0].access_level;
};
