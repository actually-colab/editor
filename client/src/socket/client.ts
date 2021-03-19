import type { DCell, DUser, Notebook } from '../types';

import ws from 'websocket';
import EventEmitter from 'eventemitter3';

import debounce from 'lodash.debounce';

interface SocketConnectionListeners {
  connect: () => void;
  close: (event: ws.ICloseEvent) => void;
  error: (error: Error) => void;
}

interface SocketMessageListeners {
  notebook_opened: (
    user: DUser,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;

  cell_created: (
    cell: DCell,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;
  cell_locked: (
    cell: DCell,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;
  cell_unlocked: (
    cell: DCell,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;
  cell_edited: (
    cell: DCell,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;
}

interface ActuallyColabEventData {
  action: keyof SocketMessageListeners;
  /**If null, event was triggered by server. */
  triggered_by: DUser['uid'] | null;
  data: Record<string, unknown> | unknown[];
}

type ActuallyColabEventListeners = SocketConnectionListeners & SocketMessageListeners;

export class ActuallyColabSocketClient extends EventEmitter<ActuallyColabEventListeners> {
  private socketClient: ws.w3cwebsocket;

  /**
   * Establishes a new client connection to the Actually Colab server.
   *
   * @param baseURL Actually Colab API basename
   * @param sessionToken authorization token for Actually Colab
   */
  constructor(baseURL: string, sessionToken: string) {
    super();
    const connectionURL = `${baseURL}/?sessionToken=Bearer ${sessionToken}`;
    this.socketClient = new ws.w3cwebsocket(connectionURL);

    this.initSocketEventListeners();
  }

  private initSocketEventListeners = (): void => {
    this.socketClient.onopen = () => {
      this.emit('connect');
    };

    this.socketClient.onclose = (event) => {
      this.emit('close', event);
    };

    this.socketClient.onerror = (error) => {
      this.emit('error', error);
    };

    this.socketClient.onmessage = (message) => {
      if (typeof message.data === 'string') {
        const eventData: ActuallyColabEventData = JSON.parse(message.data);
        switch (eventData.action) {
          case 'notebook_opened': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user: DUser = eventData.data as any;
            this.emit('notebook_opened', user, eventData.triggered_by);
            break;
          }
          case 'cell_created': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cell: DCell = eventData.data as any;
            this.emit('cell_created', cell, eventData.triggered_by);
            break;
          }
          case 'cell_edited': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cell: DCell = eventData.data as any;
            this.emit('cell_edited', cell, eventData.triggered_by);
            break;
          }
          case 'cell_locked': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cell: DCell = eventData.data as any;
            this.emit('cell_locked', cell, eventData.triggered_by);
            break;
          }
          case 'cell_unlocked': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cell: DCell = eventData.data as any;
            this.emit('cell_unlocked', cell, eventData.triggered_by);
            break;
          }
          default:
            throw new Error('Message of unknown action type received ' + message.data);
        }
      } else {
        throw new Error('Malformed message received');
      }
    };
  };

  /**
   * Aborts all in-flight requests, removes all event listeners,
   * and closes the connection to the Actually Colab Socket API.
   */
  public disconnectAndRemoveAllListeners = (): void => {
    this.socketClient.close();

    this.removeAllListeners();
  };

  private sendEvent = (action: string, data: Record<string, unknown>): void => {
    const message = JSON.stringify({ action, data });
    this.socketClient.send(message);
  };

  /**
   * Connects to a specific notebook.
   *
   * @param nb_id Notebook to connect to.
   */
  public openNotebook = (nb_id: Notebook['nb_id']): void => {
    this.sendEvent('open_notebook', { nb_id });
  };

  /**
   * Creates a new cell in a notebook.
   *
   * @param nb_id Notebook to create cell in.
   * @param language Programming language of cell.
   */
  public createCell = (nb_id: Notebook['nb_id'], language: DCell['language']): void => {
    this.sendEvent('create_cell', { nb_id, language });
  };

  /**
   * Acquires a cell lock for editing.
   *
   * @param nb_id Notebook to create cell in.
   * @param cell_id Cell to edit.
   */
  public lockCell = (nb_id: Notebook['nb_id'], cell_id: DCell['cell_id']): void => {
    this.sendEvent('lock_cell', { nb_id, cell_id });
  };

  /**
   * Releases a cell lock. Must have acquired lock.
   *
   * @param nb_id Notebook to create cell in.
   * @param cell_id Cell to edit.
   */
  public unlockCell = (nb_id: Notebook['nb_id'], cell_id: DCell['cell_id']): void => {
    this.sendEvent('unlock_cell', { nb_id, cell_id });
  };

  /**
   * Edits the contents of a cell.
   *
   * Will fail if cell lock not acquired.
   *
   * @param nb_id Notebook to create cell in.
   * @param cell_id Cell to edit.
   * @param contents New text for the cell.
   */
  public editCell = debounce(
    (
      nb_id: Notebook['nb_id'],
      cell_id: DCell['cell_id'],
      contents: DCell['cell_id']
    ): void => {
      this.sendEvent('edit_cell', { nb_id, cell_id, contents });
    },
    1000,
    { maxWait: 5000 }
  );
}
