import type { DCell } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import { broadcastToNotebook } from '../client-management';

import { getActiveSessionById } from '../../db/pgsql/models/ActiveSession';

interface TSendChatEventBody {
  data: {
    nb_id: DCell['nb_id'];
    message: string;
  };
}

type TSendChatEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TSendChatEventBody
>;

const _handler: ShallotRawHandler<TSendChatEvent> = async ({ requestContext, body }) => {
  const data = body?.data;
  if (data?.nb_id == null || data.message == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);
  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }

  await broadcastToNotebook(requestContext, session.nb_id, {
    action: 'chat_message_sent',
    triggered_by: requestContext.authorizer.uid,
    data: {
      uid: requestContext.authorizer.uid,
      nb_id: data.nb_id,
      message: data.message,
      timestamp: Date.now(),
    },
  });
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
