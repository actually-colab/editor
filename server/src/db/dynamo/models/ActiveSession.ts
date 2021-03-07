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
    .query({
      TableName: tablenames.activeSessionsTableName,
      KeyConditionExpression: 'connectionId = :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': connectionId,
      },
    })
    .promise();

  const data = (res.Items ?? []) as Array<DActiveSession>;

  return data[0] as DActiveSession | null;
};

export const getActiveSessions = async (
  nb_id: DActiveSession['nb_id']
): Promise<Array<DActiveSession['connectionId']>> => {
  console.log(3);
  const res = await dynamo.docClient
    .query({
      TableName: tablenames.activeSessionsTableName,
      ProjectionExpression: 'nb_id, connectionId',
      KeyConditionExpression: 'nb_id = :nb_id',
      ExpressionAttributeValues: {
        ':nb_id': nb_id,
      },
    })
    .promise();
  console.log(4);

  const data = (res.Items ?? []) as Array<{
    connectionId: DActiveSession['connectionId'];
  }>;
  const connectionIds = data.map((x) => x.connectionId);

  return connectionIds;
};
