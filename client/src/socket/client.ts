import type { DCell, DUser, Notebook, RequestContext } from '../types';

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
  private socketClient: ws.client;
  private context: Required<RequestContext>;
  private connection?: ws.connection;

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

  /**
   * Connects to a specific notebook.
   *
   * @param nb_id Notebook to connect to.
   */
  public openNotebook = (nb_id: Notebook['nb_id']): void => {
    this.socketClient.emit('open_notebook', { nb_id });
  };

  /**
   * Creates a new cell in a notebook.
   *
   * @param nb_id Notebook to create cell in.
   * @param language Programming language of cell.
   */
  public createCell = (
    nb_id: Notebook['nb_id'],
    language: Notebook['language']
  ): void => {
    this.socketClient.emit('create_cell', { nb_id, language });
  };

  /**
   * Edits the contents of a cell.
   *
   * @param nb_id Notebook to create cell in.
   * @param cell_id Cell to edit.
   * @param contents New text for the cell.
   */
  public editCell = (
    nb_id: Notebook['nb_id'],
    cell_id: DCell['cell_id'],
    contents: DCell['cell_id']
  ): void => {
    this.socketClient.emit('edit_cell', { nb_id, cell_id, contents });
  };
}
