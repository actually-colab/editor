import { test, describe, expect } from '@jest/globals';

import { v4 as uuid } from 'uuid';

import { ActuallyColabRESTClient, DUser } from '@actually-colab/editor-client';

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
