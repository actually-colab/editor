import axios from './connection';

import type { DNotebookAccessLevel, DUser, Notebook } from './types';

/**
 * Fetches all notebooks that this user has access to.
 */
export const getNotebooksForUser = async (): Promise<Notebook> => {
  return (await axios.get<Notebook>('/notebooks')).data;
};

/**
 * Creates the metadata for a new notebook.
 *
 * @param name human-readable name of the notebook
 * @param language runtime language for the notebook
 */
export const createNotebook = async (
  name: Notebook['name'],
  language: Notebook['language'] = 'python3'
): Promise<void> => {
  await axios.post('/notebook', { name, language });
};

/**
 * Shares a notebook with another user. The requesting user must have
 * Full Access to share the notebook.
 *
 * @param email user to share with
 * @param nb_id id of the notebook to share
 * @param access_level permissions level for the user that the notebook is being shared with
 */
export const shareNotebook = async (
  email: DUser['email'],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level']
): Promise<void> => {
  await axios.post(`/notebook/${nb_id}/share`, { email, access_level });
};
