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
export const recordTimeModified = (ws_id: DWorkshop['nb_id']): QueryBuilder =>
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
    const notebookRecord: DNotebook = (
      await trx<DNotebook>(tablenames.notebooksTableName)
        .insert({ language: 'python', name: workshop.name, time_modified: Date.now() })
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

    const workshopRecord: DWorkshop = (
      await trx<DWorkshop>(tablenames.workshopsTableName)
        .insert({ ...workshop, nb_id: notebookRecord.nb_id, time_modified: Date.now() })
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

    const mainNotebook: Notebook = {
      ...notebookRecord,
      users: instructorNotebookUALs.concat(attendeeNotebookUALs),
    };

    return {
      ...workshopRecord,
      instructors: instructorWorkshopUALs,
      attendees: attendeeWorkshopUALs,
      mainNotebook,
    };
  });
};
