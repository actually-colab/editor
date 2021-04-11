import type {
  DWorkshop,
  DUser,
  DNotebook,
  Workshop,
  Notebook,
  DCell,
  DActiveSession,
} from '@actually-colab/editor-types';
import type { QueryBuilder } from 'knex';

import pgsql from '../connection';
import tablenames from '../tablenames';

import { grantNotebookAccessByIds } from '../models/NotebookAccessLevel';
import { grantWorkshopAccessByIds } from './WorkshopAccessLevel';

/**Returns a non-executed Knex query that updates time_modified
 * for a notebook.
 *
 * @param ws_id The workshop to update
 * @returns a Knex query promise
 */
export const recordTimeModified = (ws_id: DWorkshop['ws_id']): QueryBuilder =>
  pgsql<DWorkshop>(tablenames.workshopsTableName)
    .update({
      time_modified: Date.now(),
    })
    .where({
      ws_id,
    });

/**Creates a blank workshop.
 *
 * @param notebook metadata to insert
 * @param instructors uids of instructors
 * @param attendees uids of attendees
 * @returns the notebook, if created successfully
 */
export const createWorkshop = async (
  workshop: Pick<DWorkshop, 'name' | 'description'>, // TODO: improve type
  instructors: DUser['uid'][],
  attendees: DUser['uid'][],
  cells?: Pick<DCell, 'language' | 'contents'>[]
): Promise<Workshop> => {
  return pgsql.transaction(async (trx) => {
    const workshopRecord: DWorkshop = (
      await trx<DWorkshop>(tablenames.workshopsTableName)
        .insert({ ...workshop, time_modified: Date.now() })
        .returning('*')
    )[0];
    const instructorWorkshopUALs =
      instructors.length > 0
        ? await grantWorkshopAccessByIds(
            instructors,
            workshopRecord.ws_id,
            'Instructor'
          ).transacting(trx)
        : [];
    const attendeeWorkshopUALs =
      attendees.length > 0
        ? await grantWorkshopAccessByIds(
            attendees,
            workshopRecord.ws_id,
            'Attendee'
          ).transacting(trx)
        : [];

    const notebookRecord: DNotebook = (
      await trx<DNotebook>(tablenames.notebooksTableName)
        .insert({
          language: 'python',
          ws_id: workshopRecord.ws_id,
          name: workshop.name,
          time_modified: Date.now(),
        })
        .returning('*')
    )[0];
    const instructorNotebookUALs =
      instructors.length > 0
        ? await grantNotebookAccessByIds(
            instructors,
            notebookRecord.nb_id,
            'Full Access'
          ).transacting(trx)
        : [];
    const attendeeNotebookUALs =
      attendees.length > 0
        ? await grantNotebookAccessByIds(
            attendees,
            notebookRecord.nb_id,
            'Read Only'
          ).transacting(trx)
        : [];

    if (cells != null && cells.length > 0) {
      await trx<DCell>(tablenames.cellsTableName).insert(
        cells.map((cell) => ({
          ...cell,
          time_modified: Date.now(),
          nb_id: notebookRecord.nb_id,
        }))
      );
    }

    const main_notebook: Notebook = {
      ...notebookRecord,
      users: instructorNotebookUALs.concat(attendeeNotebookUALs),
    };

    return {
      ...workshopRecord,
      instructors: instructorWorkshopUALs,
      attendees: attendeeWorkshopUALs,
      main_notebook,
    };
  });
};

/**Starts a workshop
 *
 * @param ws_id
 * @returns active users to notify
 */
export const startWorkshop = async (
  ws_id: DWorkshop['ws_id']
): Promise<(Pick<DActiveSession, 'connectionId' | 'uid'> & Pick<DUser, 'email'>)[]> => {
  return pgsql.transaction(async (trx) => {
    await trx<DWorkshop>(tablenames.workshopsTableName)
      .update({ start_time: Date.now() })
      .where({ ws_id });

    const sessions = await pgsql
      .select('as.connectionId', 'as.uid', 'u.email')
      .from({ as: tablenames.activeSessionsTableName })
      .innerJoin({ wsa: tablenames.workshopAccessLevelsTableName }, 'wsa.uid', 'as.uid')
      .innerJoin({ u: tablenames.usersTableName }, 'u.uid', 'as.uid')
      .where({ 'wsa.ws_id': ws_id })
      .whereNull('as.time_disconnected')
      .groupBy('as.connectionId', 'as.uid', 'u.email')
      .transacting(trx);

    return sessions;
  });
};

/**fetches workshop metadata.
 * @param ws_id the workshop
 */
export const getWorkshopById = async (ws_id: DWorkshop['ws_id']): Promise<DWorkshop> => {
  return (
    await pgsql.select('*').from(tablenames.workshopsTableName).where({ ws_id })
  )[0];
};

/**Queries all workshops for a specific user.
 *
 * @param uid the user to query for
 * @returns the user's workshops, if any
 */
export const getWorkshopsForUser = async (uid: DUser['uid']): Promise<Workshop[]> => {
  return pgsql
    .select(
      'ws.*',
      pgsql.raw(`
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'uid', u.uid, 
              'email', u.email, 
              'name', u.name,
              'image_url', u.image_url,
              'access_level', wsa.access_level
            )
          ) FILTER (WHERE wsa.access_level = 'Instructor'), 
        '[]'::JSONB) AS instructors
      `),
      pgsql.raw(`
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'uid', u.uid, 
              'email', u.email, 
              'name', u.name,
              'image_url', u.image_url,
              'access_level', wsa.access_level
            )
          ) FILTER (WHERE wsa.access_level = 'Attendee'), 
        '[]'::JSONB) AS attendees
      `),
      pgsql.raw(`
        json_build_object(
          'nb_id', nb.nb_id,
          'ws_id', nb.ws_id,
          'name', nb.name,
          'language', nb.language,
          'time_modified', nb.time_modified,
          'users', nb.users
        ) AS main_notebook
      `)
    )
    .from(
      pgsql
        .select(
          'nb2.*',
          pgsql.raw(`
            jsonb_agg(
              json_build_object(
                'uid', u2.uid, 
                'email', u2.email, 
                'name', u2.name,
                'image_url', u2.image_url,
                'access_level', nba2.access_level
              )
            ) AS users
          `)
        )
        .from({ nb2: tablenames.notebooksTableName })
        .innerJoin(
          { nba2: tablenames.notebookAccessLevelsTableName },
          'nba2.nb_id',
          'nb2.nb_id'
        )
        .innerJoin({ u2: tablenames.usersTableName }, 'u2.uid', 'nba2.uid')
        .whereNotNull('nb2.ws_id')
        .groupBy('nb2.nb_id')
        .as('nb')
    )
    .innerJoin({ ws: tablenames.workshopsTableName }, 'ws.ws_id', 'nb.ws_id')
    .innerJoin(
      { wsa: tablenames.workshopAccessLevelsTableName },
      'wsa.ws_id',
      '=',
      'ws.ws_id'
    )
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'wsa.uid')
    .innerJoin(
      { nba: tablenames.notebookAccessLevelsTableName },
      'nba.nb_id',
      '=',
      'nb.nb_id'
    )
    .whereIn(
      'nb.nb_id',
      pgsql
        .select('nb_id')
        .from({ sub_nba: tablenames.notebookAccessLevelsTableName })
        .innerJoin({ sub_u: tablenames.usersTableName }, 'sub_u.uid', '=', 'sub_nba.uid')
        .where({ 'sub_u.uid': uid })
    )
    .groupBy(
      'ws.ws_id',
      'wsa.ws_id',
      'nb.ws_id',
      'nb.nb_id',
      'nb.language',
      'nb.name',
      'nb.time_modified',
      'nb.users'
    );
};
