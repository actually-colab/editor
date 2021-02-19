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

export const getUserAccessLevel = async (
  email: DUser['email'],
  nb_id: DNotebookAccessLevel['nb_id']
): Promise<DNotebookAccessLevel['access_level']> => {
  return (
    await pgsql
      .select('nba.access_level')
      .from({ nba: tablenames.notebookAccessLevelsTableName })
      .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'nba.uid')
      .where({ 'u.email': email, 'nba.nb_id': nb_id })
  )[0].access_level;
};
