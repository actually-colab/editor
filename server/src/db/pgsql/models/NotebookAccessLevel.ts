import type { DNotebook } from './Notebook';
import type { DUser } from './User';

import pgsql from '../connection';
import tablenames from '../tablenames';

export type NotebookAccessLevelType = 'Full Access' | 'Read Only';

export interface DNotebookAccessLevel {
  nb_id: DNotebook['nb_id'];
  uid: DUser['uid'];
  access_level: NotebookAccessLevelType;
}

export interface NotebookAccessLevel extends DUser {
  access_level: NotebookAccessLevelType;
}

export const grantAccessById = async (
  uid: DUser['uid'],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): Promise<NotebookAccessLevel> => {
  // TODO: simplify with transaction
  const user: DUser = (
    await pgsql<DUser>(tablenames.usersTableName).select('*').where({ uid })
  )[0];

  await pgsql<NotebookAccessLevel>(tablenames.notebookAccessLevelsTableName)
    .insert({ uid, nb_id, access_level })
    .returning('*');

  return { ...user, access_level };
};

export const getUserAccessLevel = async (
  email: DUser['email'],
  nb_id: DNotebookAccessLevel['nb_id']
): Promise<DNotebookAccessLevel['access_level'] | null> => {
  const accessLevels = await pgsql
    .select('nba.access_level')
    .from({ nba: tablenames.notebookAccessLevelsTableName })
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'nba.uid')
    .where({ 'u.email': email, 'nba.nb_id': nb_id });

  if (accessLevels.length === 0) {
    return null;
  }

  return accessLevels[0].access_level;
};

export const getUserAccessLevelById = async (
  uid: DUser['uid'],
  nb_id: DNotebookAccessLevel['nb_id']
): Promise<DNotebookAccessLevel['access_level'] | null> => {
  const accessLevels = await pgsql(tablenames.notebookAccessLevelsTableName)
    .select('access_level')
    .where({ uid, nb_id });

  if (accessLevels.length === 0) {
    return null;
  }

  return accessLevels[0].access_level;
};
