import type { DUser } from './User';
import type { DNotebook } from './Notebook';
import type { DActiveSession } from './ActiveSession';

import pgsql from '../connection';
import tablenames from '../tablenames';

export interface DCell {
  nb_id: DNotebook['nb_id'];
  lock_held_by?: DUser['uid'];
  cell_id: string;
  time_modified: number;
  contents: string;
  language: 'python3' | 'markdown';
}

export const editCell = async (
  session: DActiveSession,
  cell: Partial<DCell>
): Promise<void> => {
  await Promise.all([
    pgsql<DActiveSession>(tablenames.activeSessionsTableName)
      .update({
        last_event: Date.now(),
      })
      .whereNull('time_disconnected')
      .andWhere({
        connectionId: session.connectionId,
        nb_id: session.nb_id,
      }),
    pgsql<DCell>(tablenames.cellsTableName)
      .update({
        contents: cell.contents,
        time_modified: Date.now(),
      })
      .where({
        cell_id: cell.cell_id,
        nb_id: cell.nb_id,
      }),
  ]);
};

export const createCell = async (
  session: DActiveSession,
  newCell: Partial<DCell>
): Promise<DCell | null> => {
  const promises: [unknown, Promise<DCell[] | null>] = [
    pgsql<DActiveSession>(tablenames.activeSessionsTableName)
      .update({
        last_event: Date.now(),
      })
      .whereNull('time_disconnected')
      .andWhere({
        connectionId: session.connectionId,
        nb_id: session.nb_id,
      }),
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
