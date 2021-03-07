import type { DUser } from './User';
import type { DNotebook } from '../../pgsql/models/Notebook';

import pgsql from '../connection';
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
  await pgsql<DNotebook>(tablenames.activeSessionsTableName).insert(newSession);
};

export const disconnect = async (
  connectionId: DActiveSession['connectionId'],
  time_disconnected: DActiveSession['time_disconnected']
): Promise<void> => {
  await pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .update({
      connectionId,
      nb_id: 1, // todo
      time_disconnected,
      last_event: time_disconnected,
    })
    .whereNull('time_disconnected')
    .andWhere({ connectionId });
};

export const getSessionById = async (
  connectionId: DActiveSession['connectionId']
): Promise<DActiveSession | null> => {
  const res = await pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .select('*')
    .where({ connectionId });

  if (res.length === 0) {
    return null;
  }

  return res[0];
};

export const getActiveSessions = async (
  nb_id: DActiveSession['nb_id']
): Promise<Array<DActiveSession['connectionId']>> => {
  const res = await pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .select('connectionId')
    .whereNull('time_disconnected')
    .andWhere({ nb_id });

  return res.map((x) => x.connectionId);
};
