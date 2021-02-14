import db from '../connection';
import tablenames from '../tablenames';

export type NotebookAccessLevel = 'Full Access' | 'Read Only';

export interface DNotebook {
  nb_id: string;
  uid: string;
  name: string;
  access_level: NotebookAccessLevel;
}

export const getAccessLevels = async (uid: string): Promise<DNotebook[]> => {
  return ((
    await db.docClient
      .batchGet({
        RequestItems: {
          [tablenames.notebooksTableName]: {
            Keys: [
              {
                uid: uid,
              },
            ],
          },
        },
      })
      .promise()
  ).Responses?.[tablenames.notebooksTableName] ?? []) as DNotebook[];
};

export const grantAccess = async (
  nbId: string,
  uid: string,
  accessLevel: NotebookAccessLevel,
  name: string
): Promise<void> => {
  await db.docClient
    .put({
      Item: {
        nb_id: nbId,
        uid: uid,
        access_level: accessLevel,
        name: name,
      },
      TableName: tablenames.notebooksTableName,
    })
    .promise();
};
