import type { QueryBuilder } from 'knex';
import type { DCell, DActiveSession } from '@actually-colab/editor-types';

import pgsql from '../connection';
import tablenames from '../tablenames';

/**Returns a non-executed Knex query that updates last_event
 * for a user session.
 *
 * @param session The current user session to update
 * @returns a Knex query promise
 */
export const updateLastEvent = (session: DActiveSession): QueryBuilder =>
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
  const promises: [unknown, Promise<DCell[] | null>] = [
    updateLastEvent(session),
    pgsql<DCell>(tablenames.cellsTableName)
      .update({
        ...cell,
        time_modified: Date.now(),
      })
      .where({
        cell_id: cell_id,
        nb_id: nb_id,
        lock_held_by: session.uid,
      })
      .returning('*'),
  ];
  const res = await Promise.all(promises);

  if (res[1] == null || res[1].length === 0) {
    return null;
  }

  return res[1][0];
};

/**Creates a new cell.
 *
 * @param session The active user session initiating the request
 * @param newCell The cell metadata to insert
 * @returns The cell, if created
 */
export const createCell = async (
  session: DActiveSession,
  newCell: Partial<DCell>
): Promise<DCell | null> => {
  const promises: [unknown, Promise<DCell[] | null>] = [
    updateLastEvent(session),
    pgsql<DCell>(tablenames.cellsTableName)
      .insert({
        contents: '',
        ...newCell,
        time_modified: Date.now(),
      })
      .returning('*'),
  ];
  const res = await Promise.all(promises);

  if (res[1] == null || res[1].length === 0) {
    return null;
  }

  return res[1][0];
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
  const promises: [unknown, Promise<DCell[] | null>] = [
    updateLastEvent(session),
    pgsql<DCell>(tablenames.cellsTableName)
      .update({
        lock_held_by: session.uid,
        time_modified: Date.now(),
      })
      .whereNull('lock_held_by')
      .andWhere({ cell_id, nb_id })
      .returning('*'),
  ];
  const res = await Promise.all(promises);

  if (res[1] == null || res[1].length === 0) {
    return null;
  }

  return res[1][0];
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
  const promises: [unknown, Promise<DCell[] | null>] = [
    updateLastEvent(session),
    pgsql<DCell>(tablenames.cellsTableName)
      .update({
        lock_held_by: null,
        cursor_pos: null,
        time_modified: Date.now(),
      })
      .andWhere({ cell_id, nb_id, lock_held_by: session.uid })
      .returning('*'),
  ];
  const res = await Promise.all(promises);

  if (res[1] == null || res[1].length === 0) {
    return null;
  }

  return res[1][0];
};
