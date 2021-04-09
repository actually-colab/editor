import type { DCell, DUser } from '@actually-colab/editor-types';

import 'ts-jest';
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

    mainUser.socketClient.on(
      'notebook_contents',
      jest.fn((res_notebook, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_notebook.connected_users).toEqual(
          expect.arrayContaining([otherUser.user.uid, mainUser.user.uid])
        );
        expect(res_notebook.users).toEqual(
          expect.arrayContaining(notebook.users.map((u) => expect.objectContaining(u)))
        );
        expect(res_notebook.users).toHaveLength(2);

        // Expect to emit notebook_closed event to otherUser
        mainUser.socketClient.close();
      })
    );
    otherUser.socketClient.on(
      'notebook_contents',
      jest.fn((res_notebook, res_triggered_by) => {
        expect(res_triggered_by).toEqual(otherUser.user.uid);
        expect(res_notebook.connected_users).toContain(otherUser.user.uid);
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
  }, 5000);
});

describe('Collaboration', () => {
  test('Create, Lock, Edit, and Unlock', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const newCellEdit: Required<Pick<DCell, 'cursor_pos' | 'contents' | 'language'>> = {
      cursor_pos: 1,
      contents: 'exit(1)',
      language: 'markdown',
    };

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');
    await mainUser.apiClient.shareNotebook(
      otherUser.user.email,
      notebook.nb_id,
      'Read Only'
    );

    mainUser.socketClient.on('notebook_opened', jest.fn());
    otherUser.socketClient.on(
      'notebook_opened',
      jest.fn((_, res_triggered_by) => {
        if (res_triggered_by === otherUser.user.uid) {
          // Now that otherUser has notebook opened, open notebook for mainUser
          mainUser.socketClient.openNotebook(notebook.nb_id);
        } else {
          // Now that mainUser has opened notebook, make edit
          mainUser.socketClient.createCell(notebook.nb_id, 'python');
        }
      })
    );

    mainUser.socketClient.on(
      'cell_created',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.language).toEqual('python');

        mainUser.socketClient.lockCell(cell.nb_id, cell.cell_id);
      })
    );
    otherUser.socketClient.on(
      'cell_created',
      jest.fn((_, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
      })
    );

    mainUser.socketClient.on(
      'cell_locked',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.lock_held_by).toEqual(mainUser.user.uid);

        mainUser.socketClient.editCell(cell.nb_id, cell.cell_id, newCellEdit);
      })
    );
    otherUser.socketClient.on(
      'cell_locked',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.lock_held_by).toEqual(mainUser.user.uid);
      })
    );

    mainUser.socketClient.on(
      'cell_edited',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.lock_held_by).toEqual(mainUser.user.uid);
        expect(cell).toMatchObject(newCellEdit);

        mainUser.socketClient.unlockCell(cell.nb_id, cell.cell_id, newCellEdit);
      })
    );
    otherUser.socketClient.on(
      'cell_edited',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.lock_held_by).toEqual(mainUser.user.uid);
        expect(cell).toMatchObject(newCellEdit);
      })
    );

    mainUser.socketClient.on(
      'cell_unlocked',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.lock_held_by).toBeNull();

        mainUser.socketClient.close();
      })
    );
    otherUser.socketClient.on(
      'cell_unlocked',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.lock_held_by).toBeNull();
      })
    );

    otherUser.socketClient.on(
      'notebook_closed',
      jest.fn((res_nb_id, res_triggered_by) => {
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_triggered_by).toEqual(mainUser.user.uid);

        // Cleanup
        otherUser.socketClient.close();

        expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();

        expect(mainUser.socketClient.listeners('cell_created')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(otherUser.socketClient.listeners('cell_created')[0]).toHaveBeenCalledTimes(
          1
        );

        expect(mainUser.socketClient.listeners('cell_locked')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(otherUser.socketClient.listeners('cell_locked')[0]).toHaveBeenCalledTimes(
          1
        );

        expect(mainUser.socketClient.listeners('cell_edited')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(otherUser.socketClient.listeners('cell_edited')[0]).toHaveBeenCalledTimes(
          1
        );

        expect(mainUser.socketClient.listeners('cell_unlocked')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(
          otherUser.socketClient.listeners('cell_unlocked')[0]
        ).toHaveBeenCalledTimes(1);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );

    otherUser.socketClient.openNotebook(notebook.nb_id);
  }, 5000);

  test('Live Outputs', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');
    await mainUser.apiClient.shareNotebook(
      otherUser.user.email,
      notebook.nb_id,
      'Read Only'
    );

    const expectedOutput = {
      output: 'Test output test output test output',
      nb_id: notebook.nb_id,
      uid: mainUser.user.uid,
    };

    mainUser.socketClient.on('notebook_opened', jest.fn());
    otherUser.socketClient.on(
      'notebook_opened',
      jest.fn((_, res_triggered_by) => {
        if (res_triggered_by === otherUser.user.uid) {
          // Now that otherUser has notebook opened, open notebook for mainUser
          mainUser.socketClient.openNotebook(notebook.nb_id);
        } else {
          // Now that mainUser has opened notebook, make edit
          mainUser.socketClient.createCell(notebook.nb_id, 'python');
        }
      })
    );

    mainUser.socketClient.on(
      'cell_created',
      jest.fn((cell, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(cell.language).toEqual('python');

        mainUser.socketClient.updateOutput(
          cell.nb_id,
          cell.cell_id,
          expectedOutput.output
        );
        mainUser.socketClient.updateOutput.flush(
          cell.nb_id,
          cell.cell_id,
          expectedOutput.output
        );
      })
    );
    otherUser.socketClient.on(
      'cell_created',
      jest.fn((_, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
      })
    );

    mainUser.socketClient.on(
      'output_updated',
      jest.fn((output, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(output).toMatchObject(expectedOutput);

        mainUser.socketClient.close();
      })
    );
    otherUser.socketClient.on(
      'output_updated',
      jest.fn((output, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(output).toMatchObject(expectedOutput);
      })
    );

    otherUser.socketClient.on(
      'notebook_closed',
      jest.fn((res_nb_id, res_triggered_by) => {
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_triggered_by).toEqual(mainUser.user.uid);

        // Cleanup
        otherUser.socketClient.close();

        expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();

        expect(mainUser.socketClient.listeners('cell_created')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(otherUser.socketClient.listeners('cell_created')[0]).toHaveBeenCalledTimes(
          1
        );

        expect(
          mainUser.socketClient.listeners('output_updated')[0]
        ).toHaveBeenCalledTimes(1);
        expect(
          otherUser.socketClient.listeners('output_updated')[0]
        ).toHaveBeenCalledTimes(1);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );

    otherUser.socketClient.openNotebook(notebook.nb_id);
  }, 5000);
});
