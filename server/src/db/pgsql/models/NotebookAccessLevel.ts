import type { DNotebook } from './Notebook';
import type { DUser } from './User';

import pgsql from '../connection';
import tablenames from '../tablenames';

export type NotebookAccessLevel = 'Full Access' | 'Read Only';

export interface DNotebookAccessLevel {
  nb_id: DNotebook['nb_id'];
  uid: DUser['uid'];
  access_level: NotebookAccessLevel;
}

export const grantAccess = async (
  nb_access_level: DNotebookAccessLevel
): Promise<void> => {
  await pgsql<DNotebookAccessLevel>(tablenames.notebookAccessLevelsTableName).insert(
    nb_access_level
  );
};
