import type {
  DWorkshop,
  DUser,
  DNotebook,
  Workshop,
  Notebook,
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
  workshop: Partial<DWorkshop>, // TODO: improve type
  instructors: DUser['uid'][],
  attendees: DUser['uid'][]
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
            json_build_object(
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
            json_build_object(
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
          'users', json_agg(
            json_build_object(
              'uid', u.uid,
              'email', u.email,
              'name', u.name,
              'image_url', u.image_url,
              'access_level', nba.access_level
            )
          )
        ) AS main_notebook
      `)
    )
    .from({ ws: tablenames.workshopsTableName })
    .innerJoin(
      { wsa: tablenames.workshopAccessLevelsTableName },
      'wsa.ws_id',
      '=',
      'ws.ws_id'
    )
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'wsa.uid')
    .innerJoin({ nb: tablenames.notebooksTableName }, 'nb.ws_id', '=', 'ws.ws_id')
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
    .groupBy('ws.ws_id', 'nb.nb_id');
};
