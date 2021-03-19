import type { DUser } from './User';
import type { DNotebook } from '../../pgsql/models/Notebook';

import pgsql from '../connection';
import tablenames from '../tablenames';

type UTCEpochDateTime = number;

/**An active socket session for a user. */
export interface DActiveSession {
  /**Session ID from AWS API Gateway */
  connectionId: string;
  nb_id?: DNotebook['nb_id'];
  uid: DUser['uid'];
  time_connected: UTCEpochDateTime;
  time_disconnected?: UTCEpochDateTime;
  last_event?: UTCEpochDateTime;
}

/**Stores a new session for a user.
 *
 * @param newSession the new user session
 */
export const connect = async (newSession: DActiveSession): Promise<void> => {
  await pgsql<DActiveSession>(tablenames.activeSessionsTableName).insert(newSession);
};

/**Closes an established session for a user.
 *
 * @param connectionId Session connection ID that is disconnected.
 * @param time_disconnected epoch time
 */
export const disconnect = async (
  connectionId: DActiveSession['connectionId'],
  time_disconnected: DActiveSession['time_disconnected']
): Promise<void> => {
  await pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .update({
      time_disconnected,
      last_event: time_disconnected,
    })
    .whereNull('time_disconnected')
    .andWhere({ connectionId });
};

/**Queries for an active user session by connection ID.
 *
 * @param connectionId Session connection ID.
 * @param nb_id the notebook connected to or null if none.
 * @returns The active user session, if exists.
 */
export const getActiveSessionById = async (
  connectionId: DActiveSession['connectionId'],
  nb_id?: DActiveSession['nb_id']
): Promise<DActiveSession | null> => {
  const where = nb_id != null ? { connectionId, nb_id } : { connectionId };
  const res = await pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .select('*')
    .whereNull('time_disconnected')
    .andWhere(where);

  if (res.length === 0) {
    return null;
  }

  return res[0];
};

/**Returns all active users' sessions for a specific notebook.
 *
 * @param nb_id The notebook to query
 * @returns The active users' sessions.
 */
export const getActiveSessions = async (
  nb_id: DActiveSession['nb_id']
): Promise<Array<DActiveSession['connectionId']>> => {
  const res = await pgsql<DActiveSession>(tablenames.activeSessionsTableName)
    .select('connectionId')
    .whereNull('time_disconnected')
    .andWhere({ nb_id });

  return res.map((x) => x.connectionId);
};

/**Establishes an active user session for a specific notebook.
 *
 * @param connectionId Session connection ID.
 * @param uid User ID
 * @param nb_id Notebook ID
 */
export const openNotebook = async (
  connectionId: DActiveSession['connectionId'],
  uid: DActiveSession['uid'],
  nb_id: DActiveSession['nb_id']
): Promise<void> => {
  await pgsql<DActiveSession>(tablenames.activeSessionsTableName).insert({
    connectionId,
    uid,
    nb_id,
    time_connected: Date.now(),
    last_event: Date.now(),
  });
};
