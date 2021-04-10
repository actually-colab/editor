import type {
  DWorkshopAccessLevel,
  DUser,
  WorkshopAccessLevel,
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
