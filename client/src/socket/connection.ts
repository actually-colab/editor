import type { DCell, DUser, RequestContext } from '../types';

import ws from 'websocket';
import EventEmitter from 'eventemitter3';

type ConnectEvent = 'connect' | 'connectFailed' | 'httpResponse';
type DisconnectEvent = 'close';
type MessageEvent = 'notebook_opened' | 'cell_edited' | 'cell_created';
type ActuallyColabEvent = ConnectEvent | DisconnectEvent | MessageEvent;

interface ActuallyColabEventData {
  actionType: MessageEvent;
  data: Record<string, unknown> | unknown[];
}

export const eventEmitter = new EventEmitter<ActuallyColabEvent>();
const socketClient = new ws.client();

export const connect = (context: Required<RequestContext>): void => {
  socketClient.connect(context.baseURL, undefined, undefined, {
    Authorization: `Bearer ${context.sessionToken}`,
  });
};

// Connection events
socketClient.on('connect', (connection) => {
  eventEmitter.emit('connect', connection);

  connection.on('close', (code, desc) => {
    eventEmitter.emit('close', code, desc);
  });

  connection.on('message', (data) => {
    if (data.type === 'utf8' && data.utf8Data != null) {
      const eventData: ActuallyColabEventData = JSON.parse(data.utf8Data);
      switch (eventData.actionType) {
        case 'notebook_opened': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const user: DUser = eventData.data as any;
          eventEmitter.emit('notebook_opened', user);
          break;
        }
        case 'cell_created': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cell: DCell = eventData.data as any;
          eventEmitter.emit('cell_created', cell);
          break;
        }
        case 'cell_edited': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cell: DCell = eventData.data as any;
          eventEmitter.emit('cell_edited', cell);
          break;
        }
        default:
          throw new Error('Message of unknown action type received');
      }
    } else {
      throw new Error('Malformed message received');
    }
  });
});

socketClient.on('connectFailed', (connection) => {
  eventEmitter.emit('connectFailed', connection);
});

socketClient.on('httpResponse', (connection) => {
  eventEmitter.emit('httpResponse', connection);
});
