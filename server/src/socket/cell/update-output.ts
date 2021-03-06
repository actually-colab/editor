import type { DUser, OOutput } from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '@shallot/aws-websocket-wrapper';
import ShallotSocketAuthorizer from '../middleware/custom/authorizer';

import { broadcastToNotebook } from '../client-management';

import { getActiveSessionById } from '../../db/pgsql/models/ActiveSession';
import { updateOutput } from '../../db/s3/models/Output';
import { assertFullAccessToNotebook } from '../../db/pgsql/models/NotebookAccessLevel';

type RealOmit<T, K extends PropertyKey> = { [P in keyof T as Exclude<P, K>]: T[P] };

interface TUpdateOutputEventBody {
  data: RealOmit<OOutput, 'uid'>;
}

type TUpdateOutputEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TUpdateOutputEventBody,
  DUser
>;

const _handler: ShallotRawHandler<TUpdateOutputEvent> = async ({
  requestContext,
  body,
}) => {
  const data = body?.data;
  if (data?.cell_id == null || data.nb_id == null || data.output == null) {
    throw new createHttpError.BadRequest('Invalid request body');
  }

  // TODO: streamline fetching of user + session data
  const session = await getActiveSessionById(requestContext.connectionId, data.nb_id);

  if (session == null || session.nb_id != data.nb_id) {
    throw new createHttpError.Forbidden('Does not have access to notebook');
  }
  await assertFullAccessToNotebook(session.uid, data.nb_id);

  const output: OOutput = {
    ...data,
    uid: requestContext.authorizer.uid,
    time_modified: Date.now(),
  };
  await updateOutput(requestContext, session, output);

  await broadcastToNotebook(requestContext, session.nb_id, {
    action: 'output_updated',
    triggered_by: requestContext.authorizer.uid,
    data: output,
  });
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
}).use(ShallotSocketAuthorizer());
