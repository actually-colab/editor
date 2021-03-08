import axios, { RequestContext, setRequestContext } from './connection';

import type { DNotebookAccessLevel, DUser, Notebook } from './types';

/**
 * Fetches all notebooks that this user has access to.
 *
 * @param context modifies axios request metadata
 */
export const getNotebooksForUser = async (
  context?: RequestContext
): Promise<{ data: Notebook[] } | null> => {
  setRequestContext(context);

  return (await axios.get('/notebooks'))?.data?.data;
};

/**
 * Fetches cells and outputs for a specific notebook.
 *
 * @param nb_id id of the notebook to fetch
 * @param context modifies axios request metadata
 */
export const getNotebookContents = async (
  nb_id: Notebook['nb_id'],
  context?: RequestContext
): Promise<{ data: Notebook[] } | null> => {
  setRequestContext(context);

  return (await axios.get(`/notebook/${nb_id}`))?.data?.data;
};

/**
 * Creates the metadata for a new notebook.
 *
 * @param name human-readable name of the notebook
 * @param language runtime language for the notebook
 * @param context modifies axios request metadata
 */
export const createNotebook = async (
  name: Notebook['name'],
  language: Notebook['language'] = 'python3',
  context?: RequestContext
): Promise<Notebook> => {
  setRequestContext(context);

  return (await axios.post<{ data: Notebook }>('/notebook', { name, language }))?.data
    ?.data;
};

/**
 * Shares a notebook with another user. The requesting user must have
 * Full Access to share the notebook.
 *
 * @param email user to share with
 * @param nb_id id of the notebook to share
 * @param access_level permissions level for the user that the notebook is being shared with
 * @param context modifies axios request metadata
 */
export const shareNotebook = async (
  email: DUser['email'],
  nb_id: DNotebookAccessLevel['nb_id'],
  access_level: DNotebookAccessLevel['access_level'],
  context?: RequestContext
): Promise<void> => {
  setRequestContext(context);

  await axios.post(`/notebook/${nb_id}/share`, { email, access_level });
};
