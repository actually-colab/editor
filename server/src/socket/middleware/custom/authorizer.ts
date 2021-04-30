import { DUser } from '@actually-colab/editor-types';
import type { ShallotAWSMiddlewareWithOptions } from '@shallot/aws';
import type { TShallotSocketEvent } from '@shallot/aws-websocket-wrapper';

import HttpError from 'http-errors';
import { getUserFromConnectionId } from '../../../authorizer/token';
import { forceDisconnect } from '../../client-management';

/**
 * Shallot middleware that attaches user object to request.
 *
 * @param config optional object to pass config options
 */
const ShallotSocketAuthorizer: ShallotAWSMiddlewareWithOptions<
  TShallotSocketEvent<unknown, unknown, unknown, unknown, DUser>
> = () => ({
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
