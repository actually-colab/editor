import { DNotebook } from '../../pgsql/models/Notebook';
import { DUser } from '../../pgsql/models/User';

import dynamo from '../connection';
import tablenames from '../tablenames';

export interface DActiveSession {
  nb_id?: DNotebook['nb_id'];
  uid: DUser['uid'];
  connectionId: string;
  time_connected: number;
  time_disconnected?: number;
  last_event?: number;
}

export const connect = async (newSession: DActiveSession): Promise<void> => {
  await dynamo.docClient.put({
    Item: newSession,
    TableName: tablenames.activeSessionsTableName,
  });
};

export const disconnect = async (
  connectionId: DActiveSession['connectionId'],
  time_disconnected: DActiveSession['time_disconnected']
): Promise<void> => {
  await dynamo.docClient.put({
    Item: {
      connectionId,
      time_disconnected,
      last_event: time_disconnected,
    },
    TableName: tablenames.activeSessionsTableName,
  });
};

export const getSessionById = async (
  connectionId: DActiveSession['connectionId']
): Promise<DActiveSession | null> => {
  const res = await dynamo.docClient
    .get({
      TableName: tablenames.activeSessionsTableName,
      Key: {
        connectionId,
      },
    })
    .promise();

  return res.Item as DActiveSession | null;
};

export const getActiveSessions = async (
  nb_id: DActiveSession['nb_id']
): Promise<Array<DActiveSession['connectionId']>> => {
  const res = await dynamo.docClient
    .batchGet({
      RequestItems: {
        [tablenames.activeSessionsTableName]: {
          Keys: [
            {
              nb_id,
            },
          ],
          AttributesToGet: ['connectionId'],
        },
      },
    })
    .promise();

  const data = (res.Responses?.[tablenames.activeSessionsTableName] ?? []) as Array<{
    connectionId: DActiveSession['connectionId'];
  }>;
  const connectionIds = data.map((x) => x.connectionId);

  return connectionIds;
};
