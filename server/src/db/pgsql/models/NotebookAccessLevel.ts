import type {
  DUser,
  DNotebookAccessLevel,
  NotebookAccessLevel,
} from '@actually-colab/editor-types';

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
  // TODO: simplify with transaction
  const user: DUser = (
    await pgsql<DUser>(tablenames.usersTableName).select('*').where({ uid })
  )[0];

  await pgsql<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
    .insert({ uid, nb_id, access_level })
    .returning('*');

  return { ...user, access_level };
};

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
  // TODO: simplify with transaction
  const user: DUser = (
    await pgsql<DUser>(tablenames.usersTableName).select('*').where({ email })
  )[0];

  await pgsql<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
    .insert({ uid: user.uid, nb_id, access_level })
    .returning('*');

  return { ...user, access_level };
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
