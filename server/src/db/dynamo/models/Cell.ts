import dynamo from '../connection';
import tablenames from '../tablenames';
import { DNotebook } from '../../pgsql/models/Notebook';
import { DUser } from '../../pgsql/models/User';
import { DActiveSession } from './ActiveSession';

export interface DCell {
  nb_id: DNotebook['nb_id'];
  lock_held_by?: DUser['uid'];
  cell_id: string;
  time_modified: number;
  contents: string;
  language: 'python3' | 'markdown';
}

export const editCell = async (
  session: DActiveSession,
  cell: Partial<DCell>
): Promise<void> => {
  await dynamo.docClient.put({
    Item: {
      connectionId: session.connectionId,
      last_event: Date.now(),
    },
    TableName: tablenames.activeSessionsTableName,
  });

  await dynamo.docClient.put({
    Item: {
      ...cell,
      time_modified: Date.now(),
    },
    TableName: tablenames.activeSessionsTableName,
  });
};
