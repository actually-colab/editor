import type { DCell, DUser, RequestContext } from '../types';

import ws from 'websocket';
import EventEmitter from 'eventemitter3';

interface SocketConnectionListeners {
  connect: (connection: ws.connection) => void;
  connectFailed: (err: Error) => void;

  close: (code: number, desc: string) => void;
}

interface SocketMessageListeners {
  notebook_opened: (user: DUser) => void;

  cell_created: (cell: DCell) => void;
  cell_edited: (cell: DCell) => void;
}

interface ActuallyColabEventData {
  actionType: keyof SocketMessageListeners;
  data: Record<string, unknown> | unknown[];
}

type ActuallyColabEventListeners = SocketConnectionListeners & SocketMessageListeners;

export class ActuallyColabSocketClient extends EventEmitter<ActuallyColabEventListeners> {
  socketClient: ws.client;
  context: Required<RequestContext>;
  connection?: ws.connection;

  constructor(context: Required<RequestContext>) {
    super();

    this.socketClient = new ws.client();
    this.context = context;

    this.initSocketEventListeners();
  }

  private initSocketEventListeners = (): void => {
    this.socketClient.on('connect', (connection) => {
      this.connection = connection;

      connection.on('close', (code, desc) => {
        this.emit('close', code, desc);
      });

      connection.on('message', (data) => {
        if (data.type === 'utf8' && data.utf8Data != null) {
          const eventData: ActuallyColabEventData = JSON.parse(data.utf8Data);
          switch (eventData.actionType) {
            case 'notebook_opened': {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const user: DUser = eventData.data as any;
              this.emit('notebook_opened', user);
              break;
            }
            case 'cell_created': {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cell: DCell = eventData.data as any;
              this.emit('cell_created', cell);
              break;
            }
            case 'cell_edited': {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cell: DCell = eventData.data as any;
              this.emit('cell_edited', cell);
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

    this.socketClient.on('connectFailed', (err) => {
      this.emit('connectFailed', err);
    });
  };

  /**
   * Establishes a connection to the Actually Colab Socket API.
   */
  public connect = (): void => {
    this.socketClient.connect(this.context.baseURL, undefined, undefined, {
      Authorization: `Bearer ${this.context.sessionToken}`,
    });
  };

  /**
   * Aborts all in-flight requests, removes all event listeners,
   * and closes the connection to the Actually Colab Socket API.
   */
  public disconnectAndRemoveAllListeners = (): void => {
    this.connection?.removeAllListeners();
    this.socketClient.abort();
    this.socketClient.removeAllListeners();
    this.connection?.close();

    this.removeAllListeners();
  };
}
