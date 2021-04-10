import type {
  DNotebookAccessLevel,
  DUser,
  Notebook,
  NotebookContents,
  Workshop,
} from '@actually-colab/editor-types';
import type { LoginData } from '../types';

import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

export class ActuallyColabRESTClient {
  private axiosInstance: AxiosInstance;

  /**
   * Initializes a new client wrapper for the Actually Colab API.
   *
   * @param baseURL Actually Colab API basename
   */
  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      headers: {},
    });

    axiosRetry(this.axiosInstance, { retries: 3, shouldResetTimeout: true });
  }

  /**Sets the authorization header for all requests.
   *
   * @param sessionToken the actually colab token for the user
   */
  public setSessionToken = (sessionToken: string): void => {
    this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${sessionToken}`;
  };

  private login = async (
    loginData: LoginData
  ): Promise<{ sessionToken: string; user: DUser }> => {
    const data = (
      await this.axiosInstance.post<{ data: { sessionToken: string; user: DUser } }>(
        '/login',
        loginData
      )
    )?.data?.data;
    if (data?.sessionToken == null) {
      throw new Error('Login failed');
    }

    this.setSessionToken(data.sessionToken);
    return data;
  };

  /**
   * Attempts to login. On success, stores the token.
   *
   * @param email the user's email address
   * @param name optional, sets the name of the user
   */
  public devLogin = async (
    email: DUser['email'],
    name?: string
  ): Promise<{ sessionToken: string; user: DUser }> => {
    return this.login({ tokenType: 'dev', email, name });
  };

  /**
   * Attempts to login with Google ID Token. On success, stores the token.
   *
   * @param idToken from Google Auth
   */
  public loginWithGoogleIdToken = async (
    idToken: string
  ): Promise<{ sessionToken: string; user: DUser }> => {
    return this.login({ tokenType: 'google', idToken });
  };

  /**
   * Attempts to refresh session token. On success, stores the token.
   *
   * @param sessionToken JWT from Actually Colab service
   */
  public refreshSessionToken = async (
    sessionToken: string
  ): Promise<{ sessionToken: string; user: DUser }> => {
    return this.login({ tokenType: 'session', sessionToken });
  };

  /**Fetches all notebooks that this user has access to. */
  public getNotebooksForUser = async (): Promise<Notebook[]> => {
    return (await this.axiosInstance.get<{ data: Notebook[] }>('/notebooks')).data.data;
  };

  /**
   * Fetches cells and outputs for a specific notebook.
   *
   * @param nb_id id of the notebook to fetch
   */
  public getNotebookContents = async (
    nb_id: Notebook['nb_id']
  ): Promise<NotebookContents> => {
    return (
      await this.axiosInstance.get<{ data: NotebookContents }>(`/notebook/${nb_id}`)
    ).data.data;
  };

  /**
   * Creates the metadata for a new notebook.
   *
   * @param name human-readable name of the notebook
   * @param language runtime language for the notebook
   */
  public createNotebook = async (
    name: Notebook['name'],
    language: Notebook['language'] = 'python'
  ): Promise<Notebook> => {
    return (
      await this.axiosInstance.post<{ data: Notebook }>('/notebook', { name, language })
    ).data.data;
  };

  /**
   * Shares a notebook with another user. The requesting user must have
   * Full Access to share the notebook.
   *
   * @param email user to share with
   * @param nb_id id of the notebook to share
   * @param access_level permissions level for the user that the notebook is being shared with
   */
  public shareNotebook = async (
    email: DUser['email'],
    nb_id: DNotebookAccessLevel['nb_id'],
    access_level: DNotebookAccessLevel['access_level']
  ): Promise<Notebook> => {
    return (
      await this.axiosInstance.post(`/notebook/${nb_id}/share`, { email, access_level })
    ).data.data;
  };

  /**
   * Creates the metadata for a new workshop.
   *
   * @param name human-readable name of the workshop
   * @param description human-readable description of the workshop
   */
  public createWorkshop = async (
    name: Workshop['name'],
    description: Workshop['description']
  ): Promise<Workshop> => {
    return (
      await this.axiosInstance.post<{ data: Workshop }>('/workshop', {
        name,
        description,
      })
    ).data.data;
  };
}
