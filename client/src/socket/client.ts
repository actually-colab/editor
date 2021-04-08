import type { DCell, DUser, Notebook, OOutput } from '@actually-colab/editor-types';

import ws from 'websocket';
import EventEmitter from 'eventemitter3';

import lzutf8 from 'lzutf8';

import { memoizeDebounce } from './memoize-debounce';

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
  notebook_closed: (
    nb_id: Notebook['nb_id'],
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

  output_updated: (
    output: OOutput,
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
    this.socketClient.onopen = (): void => {
      this.emit('connect');
    };

    this.socketClient.onclose = (event): void => {
      this.emit('close', event);
    };

    this.socketClient.onerror = (error): void => {
      this.emit('error', error);
    };

    this.socketClient.onmessage = (message): void => {
      if (typeof message.data === 'string') {
        const eventData: ActuallyColabEventData = JSON.parse(message.data);
        switch (eventData.action) {
          case 'notebook_opened': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user: DUser = eventData.data as any;
            this.emit('notebook_opened', user, eventData.triggered_by);
            break;
          }
          case 'notebook_closed': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const notebook: { nb_id: Notebook['nb_id'] } = eventData.data as any;
            this.emit('notebook_closed', notebook.nb_id, eventData.triggered_by);
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
          case 'output_updated': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const output: OOutput = eventData.data as any;
            lzutf8.decompressAsync(
              output.output,
              { inputEncoding: 'Base64', outputEncoding: 'String' },
              (res, error) => {
                if (error != null) {
                  console.error(error);
                  throw new Error('Could not decompress output');
                }

                this.emit(
                  'output_updated',
                  { ...output, output: res },
                  eventData.triggered_by
                );
              }
            );
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
   * Disconnects from server, but does not remove event listeners.
   */
  public close = (): void => {
    this.socketClient.close();
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
   * @param cellData Cell data to replace with
   */
  public unlockCell = (
    nb_id: Notebook['nb_id'],
    cell_id: DCell['cell_id'],
    cellData: {
      contents: DCell['cell_id'];
      language: DCell['language'];
      cursor_pos: DCell['cursor_pos'];
    }
  ): void => {
    this.editCell.flush(nb_id, cell_id, cellData);
    this.sendEvent('unlock_cell', { nb_id, cell_id });
  };

  /**
   * Edits the contents of a cell.
   *
   * Will fail if cell lock not acquired.
   *
   * @param nb_id Notebook to create cell in
   * @param cell_id Cell to edit
   * @param cellData Cell data to replace with
   */
  public editCell = memoizeDebounce(
    (
      nb_id: Notebook['nb_id'],
      cell_id: DCell['cell_id'],
      cellData: {
        contents: DCell['cell_id'];
        language: DCell['language'];
        cursor_pos: DCell['cursor_pos'];
      }
    ): void => {
      this.sendEvent('edit_cell', { nb_id, cell_id, cellData });
    },
    1000,
    { maxWait: 5000 },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_nb_id, _cell_id, _) => _nb_id + _cell_id
  );

  /**
   * Sends a compressed output for a cell to be shared with users in the notebook.
   *
   * @param nb_id Notebook to update
   * @param cell_id Cell to update
   * @param output Content to share
   */
  public updateOutput = memoizeDebounce(
    (
      nb_id: OOutput['nb_id'],
      cell_id: OOutput['cell_id'],
      output: OOutput['output']
    ): void => {
      lzutf8.compressAsync(output, { outputEncoding: 'Base64' }, (res, error) => {
        if (error != null) {
          console.error(error);
          throw new Error(`Could not compress output data for cell_id ${cell_id}`);
        }

        this.sendEvent('update_output', {
          nb_id,
          cell_id,
          output: res,
        });
      });
    },
    3000,
    { maxWait: 5000 },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_nb_id, _cell_id, _) => _nb_id + _cell_id
  );
}
