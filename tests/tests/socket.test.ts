import type { DCell, DUser } from '@actually-colab/editor-types';

import 'ts-jest';
import { test, describe, expect } from '@jest/globals';
import { v4 as uuid } from 'uuid';

import {
  ActuallyColabRESTClient,
  ActuallyColabSocketClient,
} from '@actually-colab/editor-client';

const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getTestUser = async (): Promise<{
  apiClient: ActuallyColabRESTClient;
  socketClient: ActuallyColabSocketClient;
  user: DUser;
}> => {
  const apiClient = new ActuallyColabRESTClient('http://localhost:3000/test');
  const { user, sessionToken } = await apiClient.devLogin(
    `${uuid()}@test.actuallycolab.org`,
    'Test User'
  );

  const socketClient = new ActuallyColabSocketClient(
    'ws://localhost:3001/test',
    sessionToken
  );
  socketClient.on('connect', jest.fn());
  socketClient.on(
    'error',
    jest.fn((error) => {
      console.error(error);
      throw error;
    })
  );

  return { apiClient, socketClient, user };
};

describe('Connection', () => {
  test('Open and Close Notebook', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();
    console.log('got test users');

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');
    await mainUser.apiClient.shareNotebook(
      otherUser.user.email,
      notebook.nb_id,
      'Read Only'
    );

    console.log('setup notebook');

    mainUser.socketClient.on(
      'notebook_opened',
      jest.fn((_n, res_uid, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_uid).toEqual(mainUser.user.uid);
        console.log('main: notebook opened');
      })
    );
    otherUser.socketClient.on(
      'notebook_opened',
      jest.fn((_n, res_uid, res_triggered_by) => {
        console.log('other: notebook opened');
        if (res_triggered_by === otherUser.user.uid) {
          expect(res_triggered_by).toEqual(otherUser.user.uid);
          expect(res_uid).toEqual(otherUser.user.uid);

          // Now that otherUser has notebook opened, open notebook for mainUser
          mainUser.socketClient.openNotebook(notebook.nb_id);
        } else {
          expect(res_triggered_by).toEqual(mainUser.user.uid);
          expect(res_uid).toEqual(mainUser.user.uid);
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
        mainUser.socketClient.closeNotebook(notebook.nb_id);
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
      jest.fn((res_nb_id, res_uid, res_triggered_by) => {
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_uid).toEqual(mainUser.user.uid);
        expect(res_triggered_by).toEqual(mainUser.user.uid);

        // Cleanup
        mainUser.socketClient.close();
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

        console.log('completed test');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );

    otherUser.socketClient.openNotebook(notebook.nb_id);
    console.log('started socket event');
  }, 20000);
});

describe('Collaboration', () => {
  test('Share Notebook', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');

    mainUser.socketClient.on(
      'notebook_opened',
      jest.fn((res_nb_id, res_uid, res_triggered_by) => {
        if (res_triggered_by === mainUser.user.uid) {
          expect(res_nb_id).toEqual(notebook.nb_id);
          expect(res_uid).toEqual(mainUser.user.uid);

          mainUser.socketClient.shareNotebook(
            [otherUser.user.email],
            notebook.nb_id,
            'Read Only'
          );
        } else {
          expect(res_uid).toEqual(otherUser.user.uid);

          mainUser.socketClient.close();
          otherUser.socketClient.close();

          expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
          expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();

          expect(
            mainUser.socketClient.listeners('notebook_shared')[0]
          ).toHaveBeenCalledTimes(1);

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          done!();
        }
      })
    );

    mainUser.socketClient.on(
      'notebook_shared',
      jest.fn((res_nb_id, res_users, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_users).toEqual(
          expect.arrayContaining([{ ...otherUser.user, access_level: 'Read Only' }])
        );

        otherUser.socketClient.openNotebook(notebook.nb_id);
      })
    );

    otherUser.socketClient.on(
      'notebook_opened',
      jest.fn((res_nb_id, res_uid, res_triggered_by) => {
        expect(res_triggered_by).toEqual(otherUser.user.uid);
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_uid).toEqual(otherUser.user.uid);
      })
    );

    mainUser.socketClient.openNotebook(notebook.nb_id);
  }, 5000);

  test('Share and Unshare Notebook', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');

    mainUser.socketClient.on(
      'notebook_opened',
      jest.fn((res_nb_id, res_uid, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_uid).toEqual(mainUser.user.uid);

        mainUser.socketClient.shareNotebook(
          [otherUser.user.email],
          notebook.nb_id,
          'Read Only'
        );
      })
    );

    mainUser.socketClient.on(
      'notebook_shared',
      jest.fn((res_nb_id, res_users, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_users).toEqual(
          expect.arrayContaining([{ ...otherUser.user, access_level: 'Read Only' }])
        );

        mainUser.socketClient.unshareNotebook([otherUser.user.email], notebook.nb_id);
      })
    );

    mainUser.socketClient.on(
      'notebook_unshared',
      jest.fn((res_nb_id, res_uids, res_triggered_by) => {
        expect(res_triggered_by).toEqual(mainUser.user.uid);
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_uids).toEqual([otherUser.user.uid]);

        mainUser.socketClient.close();
        otherUser.socketClient.close();

        expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();

        expect(
          mainUser.socketClient.listeners('notebook_shared')[0]
        ).toHaveBeenCalledTimes(1);
        expect(
          mainUser.socketClient.listeners('notebook_unshared')[0]
        ).toHaveBeenCalledTimes(1);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );

    mainUser.socketClient.openNotebook(notebook.nb_id);
  }, 5000);

  test('Create, Lock, Edit, and Unlock', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const newCellEdit: Required<
      Pick<DCell, 'cursor_col' | 'cursor_row' | 'contents' | 'language'>
    > = {
      cursor_col: 1,
      cursor_row: 1,
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
      jest.fn((_n, _u, res_triggered_by) => {
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
      jest.fn((res_nb_id, res_uid, res_triggered_by) => {
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_uid).toEqual(mainUser.user.uid);
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

  test('Cell Create/Delete', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const notebook = await mainUser.apiClient.createNotebook('Test Notebook');
    await mainUser.apiClient.shareNotebook(
      otherUser.user.email,
      notebook.nb_id,
      'Read Only'
    );

    mainUser.socketClient.on('notebook_opened', jest.fn());
    otherUser.socketClient.on(
      'notebook_opened',
      jest.fn((_n, _u, res_triggered_by) => {
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

        mainUser.socketClient.deleteCell(cell.nb_id, cell.cell_id);
      })
    );
    otherUser.socketClient.on(
      'cell_created',
      jest.fn((_, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
      })
    );

    mainUser.socketClient.on(
      'cell_deleted',
      jest.fn(async (nb_id, _, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(nb_id).toEqual(notebook.nb_id);

        await sleep(1000);

        mainUser.socketClient.close();
        otherUser.socketClient.close();

        expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();

        expect(mainUser.socketClient.listeners('cell_created')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(otherUser.socketClient.listeners('cell_created')[0]).toHaveBeenCalledTimes(
          1
        );

        expect(mainUser.socketClient.listeners('cell_deleted')[0]).toHaveBeenCalledTimes(
          1
        );
        expect(otherUser.socketClient.listeners('cell_deleted')[0]).toHaveBeenCalledTimes(
          1
        );

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );
    otherUser.socketClient.on(
      'cell_deleted',
      jest.fn((nb_id, _, triggered_by) => {
        expect(triggered_by).toEqual(mainUser.user.uid);
        expect(nb_id).toEqual(notebook.nb_id);
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
      jest.fn((_n, _u, res_triggered_by) => {
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
      jest.fn((res_nb_id, res_uid, res_triggered_by) => {
        expect(res_nb_id).toEqual(notebook.nb_id);
        expect(res_uid).toEqual(mainUser.user.uid);
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

describe('Workshops', () => {
  test('Start Workshop', async (done) => {
    const mainUser = await getTestUser();
    const otherUser = await getTestUser();

    const workshop = await mainUser.apiClient.createWorkshop(
      'Test Workshop',
      'test workshop'
    );

    mainUser.socketClient.on(
      'notebook_opened',
      jest.fn(() => {
        mainUser.socketClient.shareWorkshop(
          [otherUser.user.email],
          workshop.ws_id,
          'Attendee'
        );
      })
    );

    mainUser.socketClient.on(
      'workshop_shared',
      jest.fn((ws_id, attendees, instructors, triggered_by) => {
        expect(ws_id).toEqual(workshop.ws_id);
        expect(attendees).toHaveLength(1);
        expect(instructors).toHaveLength(0);
        expect(triggered_by).toEqual(mainUser.user.uid);

        mainUser.socketClient.startWorkshop(workshop.ws_id);
      })
    );
    otherUser.socketClient.on('workshop_shared', jest.fn());

    mainUser.socketClient.on(
      'workshop_started',
      jest.fn(async (res_ws_id, res_triggered_by) => {
        expect(res_ws_id).toEqual(workshop.ws_id);
        expect(res_triggered_by).toEqual(mainUser.user.uid);

        await sleep(1000);

        mainUser.socketClient.close();
        otherUser.socketClient.close();

        expect(mainUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();
        expect(otherUser.socketClient.listeners('error')[0]).not.toHaveBeenCalled();

        expect(
          mainUser.socketClient.listeners('workshop_shared')[0]
        ).toHaveBeenCalledTimes(1);
        expect(
          otherUser.socketClient.listeners('workshop_shared')[0]
        ).not.toHaveBeenCalled();

        expect(
          mainUser.socketClient.listeners('workshop_started')[0]
        ).toHaveBeenCalledTimes(1);
        expect(
          otherUser.socketClient.listeners('workshop_started')[0]
        ).toHaveBeenCalledTimes(1);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        done!();
      })
    );
    otherUser.socketClient.on(
      'workshop_started',
      jest.fn((res_ws_id, res_triggered_by) => {
        expect(res_ws_id).toEqual(workshop.ws_id);
        expect(res_triggered_by).toEqual(mainUser.user.uid);
      })
    );

    mainUser.socketClient.openNotebook(workshop.main_notebook.nb_id);
  }, 10000);
});
