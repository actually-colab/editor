import type { ModelBase, UUID, Json } from './ModelBase';

import type { DUser } from './User';
import type { DCell } from './Cell';

import pgsql from '../connection';
import tablenames from '../tablenames';

import { grantAccessById, NotebookAccessLevel } from './NotebookAccessLevel';
import { DEMO_NOTEBOOK_CELLS } from '../../../static/demo-notebook';

/**Model for a notebook */
export interface DNotebook extends ModelBase {
  /**The notebook's generated id */
  nb_id: UUID;
  name: string;
  language: 'python';
}

/**Metadata for a Notebook */
export interface Notebook extends Json, Pick<DNotebook, 'nb_id' | 'name' | 'language'> {
  users: Array<NotebookAccessLevel>;
}

/**Metadata with contents for a Notebook */
export interface NotebookContents extends Notebook {
  cells: Record<DCell['cell_id'], DCell>;
}

/**Creates a blank notebook.
 *
 * @param notebook metadata to insert
 * @param uid the user creating the notebook
 * @returns the notebook, if created successfully
 */
export const createNotebook = async (
  notebook: Partial<DNotebook>,
  uid: DUser['uid']
): Promise<Notebook> => {
  // TODO: Use a transaction
  const notebookRecord: DNotebook = (
    await pgsql<DNotebook>(tablenames.notebooksTableName).insert(notebook).returning('*')
  )[0];

  const accessLevel = await grantAccessById(uid, notebookRecord.nb_id, 'Full Access');

  return {
    ...notebookRecord,
    users: [accessLevel],
  };
};

/**Initializes the demo notebook for a user.
 *
 * @param uid the user to create the notebook for
 * @returns the notebook, if created successfully
 */
export const createDemoNotebook = async (uid: DUser['uid']): Promise<Notebook> => {
  // TODO: Use a transaction
  const demoNotebook = await createNotebook(
    {
      name: 'Welcome to Actually Colab',
      language: 'python',
    },
    uid
  );

  if (demoNotebook == null) {
    throw new Error('Could not create demo notebook');
  }

  await pgsql<DCell>(tablenames.cellsTableName).insert(
    DEMO_NOTEBOOK_CELLS.map((cell) => ({
      ...cell,
      time_modified: Date.now(),
      nb_id: demoNotebook.nb_id,
    }))
  );

  return demoNotebook;
};

/**Queries all notebooks for a specific user.
 *
 * @param uid the user to query for
 * @returns the user's notebooks, if any
 */
export const getNotebooksForUser = async (uid: DUser['uid']): Promise<Notebook[]> => {
  return pgsql
    .select(
      'nb.*',
      pgsql.raw(`json_agg(
        json_build_object(
          'uid', u.uid, 
          'email', u.email, 
          'name', u.name, 
          'access_level', nba.access_level
        )
      ) AS users`)
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
        .where({ 'sub_u.uid': uid })
    )
    .groupBy('nb.nb_id');
};

/**Queries the contents of a specific notebook.
 *
 * @param uid the user to query for
 * @returns the user's notebooks, if any
 */
export const getNotebookContents = async (
  nb_id: DNotebook['nb_id']
): Promise<NotebookContents | null> => {
  const notebooks = await pgsql
    .select(
      'nb.*',
      pgsql.raw(`json_agg(
        json_build_object(
          'uid', u.uid, 
          'email', u.email, 
          'name', u.name, 
          'access_level', nba.access_level
        )
      ) AS users`)
    )
    .from(
      pgsql
        .select(
          'nb2.*',
          pgsql.raw(`
            COALESCE(
              jsonb_object_agg(
                c.cell_id, json_build_object(
                  'cell_id', c.cell_id, 
                  'time_modified', c.time_modified, 
                  'language', c.language, 
                  'contents', c.contents,
                  'lock_held_by', c.lock_held_by,
                  'position', c.position
                )
              ) FILTER (WHERE c.cell_id IS NOT NULL), '{}'::JSONB) AS cells`)
        )
        .from({ nb2: tablenames.notebooksTableName })
        .leftJoin({ c: tablenames.cellsTableName }, 'c.nb_id', '=', 'nb2.nb_id')
        .where({ 'nb2.nb_id': nb_id })
        .groupBy('nb2.nb_id')
        .as('nb')
    )
    .innerJoin(
      { nba: tablenames.notebookAccessLevelsTableName },
      'nba.nb_id',
      '=',
      'nb.nb_id'
    )
    .innerJoin({ u: tablenames.usersTableName }, 'u.uid', '=', 'nba.uid')
    .where({ 'nb.nb_id': nb_id })
    .groupBy('nb.nb_id', 'nb.language', 'nb.name', 'nb.cells');

  if (notebooks.length === 0) {
    return null;
  }

  const notebook = notebooks[0];

  // Handle edge case of SQL json_agg null
  if (notebook.cells?.length === 1 && notebook.cells[0].cell_id == null) {
    notebook.cells = [];
  }

  return notebook;
};
