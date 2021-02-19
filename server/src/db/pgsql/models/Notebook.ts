import type { DUser } from './User';

import pgsql from '../connection';
import tablenames from '../tablenames';

import { DNotebookAccessLevel, grantAccessByEmail } from './NotebookAccessLevel';

export interface DNotebook {
  nb_id: number;
  name: string;
  language: 'python2' | 'python3';
}

export interface Notebook extends DNotebook {
  users: (DUser & { access_level: DNotebookAccessLevel['access_level'] })[];
}

export const createNotebook = async (
  notebook: Partial<DNotebook>,
  email: DUser['email']
): Promise<DNotebook> => {
  // TODO: Use a transaction
  const notebookRecord: DNotebook = (
    await pgsql<DNotebook>(tablenames.notebooksTableName).insert(notebook).returning('*')
  )[0];

  await grantAccessByEmail(email, notebookRecord.nb_id, 'Full Access');

  return notebookRecord;
};

export const getNotebooksForUser = async (email: DUser['email']): Promise<Notebook[]> => {
  return pgsql
    .select(
      'nb.*',
      `json_agg(
        json_build_object(
          'uid', u.uid, 
          'email', u.email, 
          'name', u.name, 
          'access_level', nba.access_level
        )
      ) AS users`
    )
    .from({ nb: tablenames.notebooksTableName })
    .innerJoin(
      { nba: tablenames.notebookAccessLevelsTableName },
      'nba.nb_id',
      '=',
      'nb.nb_id'
    )
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'nba.uid')
    .whereIn(
      'nb.nb_id',
      pgsql
        .select('nb_id')
        .from({ sub_nba: tablenames.notebookAccessLevelsTableName })
        .innerJoin({ sub_u: tablenames.usersTableName }, 'sub_u.uid', '=', 'sub_nba.uid')
        .where({ 'sub_u.email': email })
    );
};
