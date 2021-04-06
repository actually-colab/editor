/**An active socket session for a user. */
export interface DActiveSession extends ModelBase {
  /**Session ID from AWS API Gateway */
  connectionId: string;
  nb_id?: DNotebook['nb_id'];
  uid: DUser['uid'];
  time_connected: UTCEpochDateTime;
  time_disconnected?: UTCEpochDateTime;
  last_event?: UTCEpochDateTime;
}

/**Actually Colab Database User Object */
export interface DUser extends ModelBase {
  /**The user's generated UUID */
  uid: UUID;
  name: string;
  email: string;
}

/**Model for a notebook cell */
export interface DCell extends ModelBase {
  nb_id: DNotebook['nb_id'];
  lock_held_by?: DUser['uid'] | null;
  /**The cell's generated UUID */
  cell_id: UUID;
  time_modified: UTCEpochDateTime;
  contents: string;
  /**Position of the lock-holding-user's cursor in the cell */
  cursor_pos?: number | null;
  language: 'python' | 'markdown';
  position: number;
}

/**Model for a notebook */
export interface DNotebook extends ModelBase {
  /**The notebook's generated id */
  nb_id: UUID;
  name: string;
  language: 'python';
  time_modified: UTCEpochDateTime;
}

/**Metadata for a Notebook */
export interface Notebook extends Json, Pick<DNotebook, 'nb_id' | 'name' | 'language'> {
  users: Array<NotebookAccessLevel>;
}

/**Metadata with contents for a Notebook */
export interface NotebookContents extends Notebook {
  cells: Record<DCell['cell_id'], DCell>;
}

/**Enum of access levels for a notebook */
export type NotebookAccessLevelType = 'Full Access' | 'Read Only';

/**A model for a user's access level to a specific notebook */
export interface DNotebookAccessLevel extends ModelBase {
  nb_id: DNotebook['nb_id'];
  uid: DUser['uid'];
  access_level: NotebookAccessLevelType;
}

/**Pair of user, access_level */
export interface NotebookAccessLevel extends DUser {
  access_level: NotebookAccessLevelType;
}

export type UTCEpochDateTime = number;
export type UUID = string;

export interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray | null | undefined;
}
type JsonArray = Array<string | number | boolean | Date | Json | JsonArray>;

export type ModelBase = Record<string, number | string | boolean | null | undefined>;
