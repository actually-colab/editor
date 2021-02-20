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
