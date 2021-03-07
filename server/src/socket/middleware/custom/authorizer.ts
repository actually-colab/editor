import type { ShallotMiddlewareWithOptions } from 'shallot/dist/aws/core';
import type { APIGatewayProxyResult } from 'aws-lambda';

import HttpError from 'http-errors';
import { APIGatewayWebSocketEvent } from '../wrapper';
import { getUserFromConnectionId } from '../../../authorizer/token';
import { forceDisconnect } from '../../client-management';

/**
 * Shallot middleware that attaches user object to request.
 *
 * @param config optional object to pass config options
 */
const ShallotSocketAuthorizer: ShallotMiddlewareWithOptions<
  APIGatewayWebSocketEvent,
  APIGatewayProxyResult
> = () => ({
  before: async ({ event }) => {
    if (event.requestContext.connectionId == null) {
      throw new HttpError.Unauthorized();
    }

    const user = await getUserFromConnectionId(event.requestContext.connectionId);
    if (user == null) {
      await forceDisconnect(event.requestContext);
      throw new HttpError.Unauthorized();
    }

    event.requestContext.authorizer = user;
  },
});

export default ShallotSocketAuthorizer;
