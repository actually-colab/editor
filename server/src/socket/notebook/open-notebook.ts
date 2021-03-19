import { DNotebook } from '../../db/pgsql/models/Notebook';
import type { DUser } from '../../db/pgsql/models/User';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
  WebSocketRequestContext,
} from '../middleware/wrapper';

import createHttpError from 'http-errors';

import { getActiveSessions, openNotebook } from '../../db/pgsql/models/ActiveSession';
import { getUserAccessLevel } from '../../db/pgsql/models/NotebookAccessLevel';
import { getManagementApi } from '../client-management';

interface TOpenNotebookEventBody {
  data: {
    nb_id: DNotebook['nb_id'];
  };
}

type TOpenNotebookEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TOpenNotebookEventBody
>;

const sendOpenedNotebookEvent = async (
  context: WebSocketRequestContext,
  nb_id: DNotebook['nb_id'],
  user: DUser
): Promise<void> => {
  const openedNotebookEventBody = JSON.stringify({
    action: 'notebook_opened',
    triggered_by: context.authorizer.uid,
    data: user,
  });

  const connectionIds = await getActiveSessions(nb_id);

  const apigApi = getManagementApi(context);
  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await apigApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: openedNotebookEventBody,
          })
          .promise();
      } catch (err) {
        console.error('Could not reach', connectionId);
      }
    })
  );
};

const _handler: ShallotRawHandler<TOpenNotebookEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.nb_id == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  const access_level = await getUserAccessLevel(
    requestContext.authorizer.uid,
    data.nb_id
  );
  if (access_level == null) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  await openNotebook(
    requestContext.connectionId,
    requestContext.authorizer.uid,
    data.nb_id
  );

  await sendOpenedNotebookEvent(requestContext, data.nb_id, requestContext.authorizer);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
