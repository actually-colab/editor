import { test, describe, expect } from '@jest/globals';

import { DUser } from '@actually-colab/editor-types';
import {
  ActuallyColabRESTClient,
  ActuallyColabSocketClient,
} from '@actually-colab/editor-client';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('', () => {
  test('', async () => {
    const apiClient = new ActuallyColabRESTClient('http://localhost:3000/dev');
    const { user, sessionToken } = await apiClient.devLogin('jeff@test.com', 'jeff');
    expect(user).toMatchObject({ email: 'jeff@test.com' });

    const notebook = await apiClient.createNotebook('test', 'python');
    expect(notebook).not.toBeNull();
    const notebooks = await apiClient.getNotebooksForUser();
    expect(notebooks).not.toHaveLength(0);

    const socketClient = new ActuallyColabSocketClient(
      'ws://localhost:3001/dev',
      sessionToken
    );
    const connectListener = jest.fn();
    const errorListener = jest.fn(console.error);
    const notebookOpenedListener = jest.fn((user2: DUser) => {
      expect(user2.uid).toEqual(user.uid);
    });

    socketClient.on('connect', connectListener);
    socketClient.on('error', errorListener);
    socketClient.on('notebook_opened', notebookOpenedListener);

    await sleep(2000);

    expect(errorListener).not.toHaveBeenCalled();
    expect(connectListener).toHaveBeenCalledTimes(1);

    socketClient.openNotebook(notebook.nb_id);

    await sleep(5000);
    expect(notebookOpenedListener).toHaveBeenCalled();

    socketClient.disconnectAndRemoveAllListeners();
    await sleep(1000);
  }, 25000);
});
