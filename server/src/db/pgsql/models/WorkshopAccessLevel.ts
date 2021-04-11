import type {
  DWorkshopAccessLevel,
  DUser,
  WorkshopAccessLevel,
  DNotebook,
  DNotebookAccessLevel,
  Workshop,
  Notebook,
} from '@actually-colab/editor-types';
import type { QueryBuilder } from 'knex';

import pgsql from '../connection';
import tablenames from '../tablenames';

/**Grants access for many users to a specific workshop.
 *
 * @param uids the users to grant workshop access to
 * @param ws_id the workshop to grant access to
 * @param access_level type of access for the user
 * @returns the access provided, if successful
 */
export const grantWorkshopAccessByIds = <AL extends DWorkshopAccessLevel['access_level']>(
  uids: DUser['uid'][],
  ws_id: DWorkshopAccessLevel['nb_id'],
  access_level: AL
): QueryBuilder<DWorkshopAccessLevel, (WorkshopAccessLevel & { access_level: AL })[]> =>
  pgsql
    .with(
      'updated_uals',
      pgsql<WorkshopAccessLevel>(tablenames.workshopAccessLevelsTableName)
        .insert(uids.map((uid) => ({ uid, ws_id, access_level })))
        .onConflict(['ws_id', 'uid'])
        .merge()
        .returning('*')
    )
    .select('u.*', 'updated_uals.access_level AS access_level')
    .from('updated_uals')
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'updated_uals.uid');

/**Queries a user's access level to a specific workshop.
 *
 * @param uid the user to query
 * @param ws_id the workshop to query
 * @returns the user's access level, if any
 */
export const getWorkshopAccessLevel = async (
  uid: WorkshopAccessLevel['uid'],
  ws_id: WorkshopAccessLevel['ws_id']
): Promise<WorkshopAccessLevel['access_level'] | null> => {
  const accessLevels = await pgsql(tablenames.workshopAccessLevelsTableName)
    .select('access_level')
    .where({ uid, ws_id });

  if (accessLevels.length === 0) {
    return null;
  }

  return accessLevels[0].access_level;
};

/**Grants access for a specific user to a specific workshop.
 *
 * @param email the user to grant workshop access to
 * @param ws_id the workshop to grant access to
 * @param access_level type of access for the user
 * @returns the access provided, if successful
 */
export const grantWorkshopAccessByEmails = async (
  emails: DUser['email'][],
  ws_id: DWorkshopAccessLevel['ws_id'],
  ws_access_level: DWorkshopAccessLevel['access_level'],
  nb_access_level: DNotebookAccessLevel['access_level']
): Promise<{
  notebook: Pick<Notebook, 'nb_id' | 'users'>;
  workshop: Pick<Workshop, 'ws_id'> & { users: WorkshopAccessLevel[] };
}> => {
  return pgsql.transaction(async (trx) => {
    const users = await trx<DUser>(tablenames.usersTableName)
      .select('*')
      .whereIn('email', emails);

    await trx<DWorkshopAccessLevel>(tablenames.workshopAccessLevelsTableName)
      .insert(
        users.map((user) => ({ uid: user.uid, ws_id, access_level: ws_access_level }))
      )
      .onConflict(['ws_id', 'uid'])
      .merge();

    const nb = await trx<DNotebook>(tablenames.notebooksTableName)
      .select('nb_id')
      .where({ ws_id });

    await trx
      .insert(
        users.map((user) => ({
          uid: user.uid,
          nb_id: nb[0].nb_id,
          access_level: nb_access_level,
        }))
      )
      .into<DNotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
      .onConflict(['nb_id', 'uid'])
      .merge()
      .returning('*');

    return {
      notebook: {
        nb_id: nb[0].nb_id,
        users: users.map((user) => ({ ...user, access_level: nb_access_level })),
      },
      workshop: {
        ws_id,
        users: users.map((user) => ({ ...user, access_level: ws_access_level })),
      },
    };
  });
};
