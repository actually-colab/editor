import type {
  ActiveNotebookContents,
  DCell,
  DUser,
  Notebook,
  NotebookAccessLevel,
  OChatMessage,
  OOutput,
  Workshop,
  WorkshopAccessLevel,
} from '@actually-colab/editor-types';

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
  notebook_contents: (
    notebook: ActiveNotebookContents,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;
  notebook_closed: (
    nb_id: Notebook['nb_id'],
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;

  notebook_shared: (
    nb_id: Notebook['nb_id'],
    users: NotebookAccessLevel[],
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;
  notebook_unshared: (
    nb_id: Notebook['nb_id'],
    uids: NotebookAccessLevel['uid'][],
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;

  workshop_shared: (
    ws_id: Workshop['ws_id'],
    attendees: Workshop['attendees'],
    instructors: Workshop['instructors'],
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
  cell_deleted: (
    nb_id: DCell['nb_id'],
    cell_id: DCell['nb_id'],
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;

  output_updated: (
    output: OOutput,
    triggered_by: ActuallyColabEventData['triggered_by']
  ) => void;

  chat_message_sent: (
    message: OChatMessage,
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
          case 'notebook_contents': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const notebook: ActiveNotebookContents = eventData.data as any;
            this.emit('notebook_contents', notebook, eventData.triggered_by);
            break;
          }
          case 'notebook_closed': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const notebook: { nb_id: Notebook['nb_id'] } = eventData.data as any;
            this.emit('notebook_closed', notebook.nb_id, eventData.triggered_by);
            break;
          }

          case 'notebook_shared': {
            const res: {
              nb_id: Notebook['nb_id'];
              users: NotebookAccessLevel[];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } = eventData.data as any;
            this.emit('notebook_shared', res.nb_id, res.users, eventData.triggered_by);
            break;
          }
          case 'notebook_unshared': {
            const res: {
              nb_id: Notebook['nb_id'];
              uids: NotebookAccessLevel['uid'][];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } = eventData.data as any;
            this.emit('notebook_unshared', res.nb_id, res.uids, eventData.triggered_by);
            break;
          }

          case 'workshop_shared': {
            const accessLevel: Pick<
              Workshop,
              'ws_id' | 'attendees' | 'instructors'
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            > = eventData.data as any;
            this.emit(
              'workshop_shared',
              accessLevel.ws_id,
              accessLevel.attendees,
              accessLevel.instructors,
              eventData.triggered_by
            );
            break;
          }

          case 'cell_created': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cell: DCell = eventData.data as any;
            this.emit('cell_created', cell, eventData.triggered_by);
            break;
          }
          case 'cell_deleted': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cell: Pick<DCell, 'nb_id' | 'cell_id'> = eventData.data as any;
            this.emit('cell_deleted', cell.nb_id, cell.cell_id, eventData.triggered_by);
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

          case 'chat_message_sent': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message: OChatMessage = eventData.data as any;
            this.emit('chat_message_sent', message, eventData.triggered_by);
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
   * Closes a connection to a specific notbeook.
   *
   * @param nb_id Notebook to disconnect from
   */
  public closeNotebook = (nb_id: Notebook['nb_id']): void => {
    this.sendEvent('close_notebook', { nb_id });
  };

  /**
   * Shares a notebook with another user. The requesting user must have
   * Full Access to share the notebook.
   *
   * @param email user to share with
   * @param nb_id id of the notebook to share
   * @param access_level permissions level for the user that the notebook is being shared with
   */
  public shareNotebook = (
    emails: NotebookAccessLevel['email'][],
    nb_id: NotebookAccessLevel['nb_id'],
    access_level: NotebookAccessLevel['access_level']
  ): void => {
    this.sendEvent('share_notebook', { emails, nb_id, access_level });
  };

  /**
   * Revokes notebook access from another user. The requesting user must have
   * Full Access to share the notebook.
   *
   * @param emails users to revoke access from
   * @param nb_id id of the notebook
   */
  public unshareNotebook = (
    emails: NotebookAccessLevel['email'][],
    nb_id: NotebookAccessLevel['nb_id']
  ): void => {
    this.sendEvent('share_notebook', { emails, nb_id, access_level: null });
  };

  /**
   * Shares a workshop with another user. The requesting user must have
   * Instructor access to share the notebook.
   *
   * @param emails users to share with
   * @param ws_id id of the workshop to share
   * @param access_level permissions level for the user that the workshop is being shared with
   */
  public shareWorkshop = (
    emails: WorkshopAccessLevel['email'][],
    ws_id: WorkshopAccessLevel['ws_id'],
    access_level: WorkshopAccessLevel['access_level']
  ): void => {
    this.sendEvent('share_workshop', { emails, ws_id, access_level });
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
    cellData: Required<Pick<DCell, 'cursor_col' | 'cursor_row' | 'contents' | 'language'>>
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
      cellData: Required<
        Pick<DCell, 'cursor_col' | 'cursor_row' | 'contents' | 'language'>
      >
    ): void => {
      this.sendEvent('edit_cell', { nb_id, cell_id, cellData });
    },
    1000,
    { maxWait: 5000 },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_nb_id, _cell_id, _) => _nb_id + _cell_id
  );

  /**
   * Deletes a specific cell from a specific notebook
   *
   * @param nb_id Notebook containing the cell
   * @param cell_id Cell to delete
   */
  public deleteCell = (nb_id: Notebook['nb_id'], cell_id: DCell['cell_id']): void => {
    this.sendEvent('edit_cell', { nb_id, cell_id, cellData: null });
  };

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

  /**Echoes a message into the notebook chat.
   *
   * @param nb_id The notebook to broadcast to
   * @param message Text to send
   */
  public sendChatMessage = (
    nb_id: OChatMessage['nb_id'],
    message: OChatMessage['message']
  ): void => {
    this.sendEvent('send_chat_message', { nb_id, message });
  };
}
