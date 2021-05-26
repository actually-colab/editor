import type { QueryBuilder } from 'knex';
import type { DCell, DActiveSession } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import pgsql from '../connection';
import tablenames from '../tablenames';

import { recordTimeModified } from './Notebook';

/**Returns a non-executed Knex query that updates last_event
 * for a user session.
 *
 * @param session The current user session to update
 * @returns a Knex query promise
 */
export const recordLastEvent = (session: DActiveSession): QueryBuilder =>
  pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .update({
      last_event: Date.now(),
    })
    .whereNull('time_disconnected')
    .andWhere({
      connectionId: session.connectionId,
      nb_id: session.nb_id,
    });

/**Modifies the contents of a cell.
 *
 * @param session The active user session initiating the request
 * @param nb_id The notebook containing the cell to modify
 * @param cell_id The cell to modify
 * @param cell The metadata to replace with
 * @returns The cell, if successfully modified
 */
export const editCell = async (
  session: DActiveSession,
  nb_id: DCell['nb_id'],
  cell_id: DCell['cell_id'],
  cell: Partial<DCell>
): Promise<DCell | null> => {
  return pgsql.transaction(async (trx) => {
    await Promise.all([
      recordLastEvent(session).transacting(trx),
      recordTimeModified(nb_id).transacting(trx),
    ]);

    return (
      await trx<DCell>(tablenames.cellsTableName)
        .update({
          ...cell,
          time_modified: Date.now(),
        })
        .where({
          cell_id: cell_id,
          nb_id: nb_id,
          lock_held_by: session.uid,
        })
        .returning('*')
    )[0];
  });
};

/**Creates a new cell.
 *
 * @param session The active user session initiating the request
 * @param newCell The cell metadata to insert
 * @returns The cell, if created
 */
export const createCell = async (
  session: DActiveSession,
  newCell: Partial<DCell> & Pick<DCell, 'nb_id'>
): Promise<DCell | null> => {
  return pgsql.transaction(async (trx) => {
    await Promise.all([
      recordLastEvent(session).transacting(trx),
      recordTimeModified(newCell.nb_id).transacting(trx),
    ]);

    return (
      await trx<DCell>(tablenames.cellsTableName)
        .insert({
          contents: '',
          ...newCell,
          time_modified: Date.now(),
        })
        .returning('*')
    )[0];
  });
};

/**Deletes an existing cell.
 *
 * @param session The active user session initiating the request
 * @param nb_id The notebook containing the cell
 * @param cell_id The cell
 */
export const deleteCell = async (
  session: DActiveSession,
  nb_id: DCell['nb_id'],
  cell_id: DCell['cell_id']
): Promise<void> => {
  return pgsql.transaction(async (trx) => {
    await Promise.all([
      recordLastEvent(session).transacting(trx),
      recordTimeModified(nb_id).transacting(trx),
    ]);

    await trx<DCell>(tablenames.cellsTableName).where({ nb_id, cell_id }).del();
  });
};

/**Acquires a cell lock for an active user session.
 *
 * @param session The active user session initiating the request
 * @param nb_id The notebook containing the cell
 * @param cell_id The cell to lock
 * @returns The cell, if successfully modified
 */
export const lockCell = async (
  session: DActiveSession,
  nb_id: DCell['nb_id'],
  cell_id: DCell['cell_id']
): Promise<DCell | null> => {
  return pgsql.transaction(async (trx) => {
    await recordLastEvent(session).transacting(trx);

    return (
      await trx<DCell>(tablenames.cellsTableName)
        .update({
          lock_held_by: session.uid,
          time_modified: Date.now(),
        })
        .whereNull('lock_held_by')
        .andWhere({ cell_id, nb_id })
        .returning('*')
    )[0];
  });
};

/**Releases a cell lock for an active user session.
 *
 * @param session The active user session initiating the request
 * @param nb_id The notebook containing the cell
 * @param cell_id The cell to unlock
 * @returns The cell, if successfully modified
 */
export const unlockCell = async (
  session: DActiveSession,
  nb_id: DCell['nb_id'],
  cell_id: DCell['cell_id']
): Promise<DCell | null> => {
  return pgsql.transaction(async (trx) => {
    await recordLastEvent(session).transacting(trx);

    return (
      await trx<DCell>(tablenames.cellsTableName)
        .update({
          lock_held_by: null,
          cursor_col: null,
          cursor_row: null,
          time_modified: Date.now(),
        })
        .where({ cell_id, nb_id, lock_held_by: session.uid })
        .returning('*')
    )[0];
  });
};

/**Asserts a user has acquired the lock for a cell or throws an
 * error otherwise.
 *
 * @param session The active user session initiating the request
 * @param nb_id The notebook containing the cell
 * @param cell_id The cell to check
 */
export const assertLockAcquired = async (
  session: DActiveSession,
  nb_id: DCell['nb_id'],
  cell_id: DCell['cell_id']
): Promise<void> => {
  const cell = await pgsql<DCell, Pick<DCell, 'lock_held_by'>[]>(
    tablenames.cellsTableName
  )
    .select('lock_held_by')
    .where({ cell_id, nb_id });

  if (cell.length === 0 || cell[0]?.lock_held_by !== session.uid) {
    throw new createHttpError.Forbidden('Has not acquired cell lock');
  }
};
