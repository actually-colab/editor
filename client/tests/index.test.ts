import { test, describe, expect } from '@jest/globals';

import { devLogin, getNotebooksForUser } from '../src';

describe('', () => {
  test('', async () => {
    const user = await devLogin('jeff@jefftc.com', 'jeff');
    expect(user).toMatchObject({ email: 'jeff@jefftc.com' });
    const notebooks = await getNotebooksForUser();
    expect(notebooks).toHaveLength(0);
  });
});
