import type { DUser } from './User';

import pgsql from '../connection';
import tablenames from '../tablenames';
import { DNotebookAccessLevel } from './NotebookAccessLevel';

export interface DNotebook {
  nb_id: number;
  name: string;
  language: 'python2' | 'python3';
}

export const createNotebook = async (
  notebook: Partial<DNotebook>,
  uid: DUser['uid']
): Promise<DNotebook> => {
  // TODO: Use a transaction
  const notebookRecord: DNotebook = (
    await pgsql<DNotebook>(tablenames.notebooksTableName).insert(notebook).returning('*')
  )[0];

  await pgsql<DNotebookAccessLevel>(tablenames.notebookAccessLevelsTableName).insert({
    uid,
    nb_id: notebookRecord.nb_id,
    access_level: 'Full Access',
  });

  return notebookRecord;
};
