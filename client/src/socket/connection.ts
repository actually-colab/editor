import type { RequestContext } from '../types';

import ws from 'websocket';

const socketClient = new ws.client();

export const connect = (context: Required<RequestContext>): void => {
  socketClient.connect(context.baseURL, undefined, undefined, {
    Authorization: `Bearer ${context.sessionToken}`,
  });
};
