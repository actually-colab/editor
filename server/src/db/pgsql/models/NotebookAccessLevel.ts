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

export const grantAccessByUID = async (
  nb_access_level: Partial<DNotebookAccessLevel>
): Promise<void> => {
  await pgsql<DNotebookAccessLevel>(tablenames.notebookAccessLevelsTableName).insert(
    nb_access_level
  );
};

export const grantAccessByEmail = async (
  email: DUser['email'],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): Promise<void> => {
  const uid: DUser['uid'] = (
    await pgsql<DUser>(tablenames.usersTableName).select('uid').where({ email })
  )[0].uid;

  await grantAccessByUID({ uid, nb_id, access_level });
};
