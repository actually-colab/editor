import type { DUser } from '@actually-colab/editor-types';

import { test, describe, expect } from '@jest/globals';
import { v4 as uuid } from 'uuid';

import {
  ActuallyColabRESTClient,
  ActuallyColabSocketClient,
} from '@actually-colab/editor-client';

const getTestUser = async (): Promise<{
  apiClient: ActuallyColabRESTClient;
  socketClient: ActuallyColabSocketClient;
  user: DUser;
}> => {
  const apiClient = new ActuallyColabRESTClient('http://localhost:3000/dev');
  const { user, sessionToken } = await apiClient.devLogin(
    `${uuid()}@test.actuallycolab.org`,
    'Test User'
  );

  const socketClient = new ActuallyColabSocketClient(
    'ws://localhost:3001/dev',
    sessionToken
  );
  socketClient.on('connect', jest.fn());
  socketClient.on(
    'error',
    jest.fn((error) => {
      throw error;
    })
  );

  return { apiClient, socketClient, user };
};

describe('Connection', () => {
  test('Open and Close Notebook', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');
    await mainUser.apiClient.shareNotebook(
      otherUser.user.email,
      notebook.nb_id,
      'Read Only'
    );

    mainUser.socketClient.on(
      'notebook_opened',
      jest.fn((res_user, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_user).toMatchObject(mainUser.user);

        // Expect to emit notebook_closed event to otherUser
        mainUser.socketClient.close();
      })
    );
    otherUser.socketClient.on(
      'notebook_opened',
      jest.fn((res_user, res_triggered_by) => {
        if (res_triggered_by === otherUser.user.uid) {
          expect(res_triggered_by).toEqual(otherUser.user.uid);
          expect(res_user).toMatchObject(otherUser.user);

          // Now that otherUser has notebook opened, open notebook for mainUser
          mainUser.socketClient.openNotebook(notebook.nb_id);
        } else {
          expect(res_triggered_by).toEqual(mainUser.user.uid);
          expect(res_user).toMatchObject(mainUser.user);
        }
      })
    );

    mainUser.socketClient.on('notebook_closed', jest.fn());
    otherUser.socketClient.on(
      'notebook_closed',
      jest.fn((res_nb_id, res_triggered_by) => {
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_triggered_by).toEqual(mainUser.user.uid);

        // Cleanup
        otherUser.socketClient.close();

        expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('connect')[0]).toHaveBeenCalledTimes(1);
        expect(mainUser.socketClient.listeners('connect')[0]).toHaveBeenCalledTimes(1);

        expect(
          mainUser.socketClient.listeners('notebook_opened')[0]
        ).toHaveBeenCalledTimes(1);
        expect(
          otherUser.socketClient.listeners('notebook_opened')[0]
        ).toHaveBeenCalledTimes(2);

        expect(
          mainUser.socketClient.listeners('notebook_closed')[0]
        ).not.toHaveBeenCalled();
        expect(
          otherUser.socketClient.listeners('notebook_closed')[0]
        ).toHaveBeenCalledTimes(1);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );

    otherUser.socketClient.openNotebook(notebook.nb_id);
  }, 25000);
});
