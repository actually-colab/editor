import { test, describe, expect } from '@jest/globals';

import { v4 as uuid } from 'uuid';
import _ from 'lodash';

import { DUser, NotebookAccessLevelType } from '@actually-colab/editor-types';
import { ActuallyColabRESTClient } from '@actually-colab/editor-client';

const getTestUser = async (): Promise<{
  apiClient: ActuallyColabRESTClient;
  user: DUser;
}> => {
  const apiClient = new ActuallyColabRESTClient('http://localhost:3000/dev');
  const { user } = await apiClient.devLogin(
    `${uuid()}@test.actuallycolab.org`,
    'Test User'
  );

  return { apiClient, user };
};

describe('Login', () => {
  test('Dev Login', async () => {
    const { user } = await getTestUser();
    expect(user).toHaveProperty('uid');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
  }, 5000);

  test('Demo Notebook', async () => {
    const { apiClient, user } = await getTestUser();

    const notebooks = await apiClient.getNotebooksForUser();
    expect(notebooks).toHaveLength(1);

    const demoNotebook = await apiClient.getNotebookContents(notebooks[0].nb_id);
    expect(demoNotebook).toMatchObject({
      name: 'Welcome to Actually Colab',
      language: 'python',
    });

    expect(demoNotebook.users).toHaveLength(1);
    expect(demoNotebook.users[0]).toMatchObject({ ...user, access_level: 'Full Access' });

    expect(Object.keys(demoNotebook.cells)).toHaveLength(7);
  });
});

describe('Notebook', () => {
  test('Create Notebook', async () => {
    const { apiClient, user } = await getTestUser();

    const expectedTestNotebook = {
      name: 'Test Notebook',
      language: 'python',
    };
    const newNotebook = await apiClient.createNotebook(expectedTestNotebook.name);
    expect(newNotebook).toMatchObject(expectedTestNotebook);
    expect(newNotebook.users).toEqual([
      expect.objectContaining((user as unknown) as Record<string, unknown>),
    ]);

    const notebooks = await apiClient.getNotebooksForUser();
    expect(notebooks).toHaveLength(2);
    expect(notebooks).toEqual(
      expect.arrayContaining([expect.objectContaining(expectedTestNotebook)])
    );
  });

  test('Share Notebook', async () => {
    const accessLevels: NotebookAccessLevelType[] = [
      'Full Access',
      'Full Access',
      'Read Only',
      'Read Only',
      'Full Access',
    ];

    const testUsers = await Promise.all(accessLevels.map(() => getTestUser()));
    const mainUser = testUsers[0];

    const expectedUserAccessLevels = _.zip(testUsers, accessLevels).map(
      ([user, access_level]) => ({
        ...user?.user,
        access_level,
      })
    );

    const newNotebook = await mainUser.apiClient.createNotebook('Test Notebook');
    await Promise.all(
      expectedUserAccessLevels.slice(1).map((ual) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        mainUser.apiClient.shareNotebook(ual.email!, newNotebook.nb_id, ual.access_level!)
      )
    );

    const sharedNotebook = await mainUser.apiClient.getNotebookContents(
      newNotebook.nb_id
    );
    expect(sharedNotebook.users).toEqual(
      expect.arrayContaining(
        expectedUserAccessLevels.map((ual) => expect.objectContaining(ual))
      )
    );
  });
});
