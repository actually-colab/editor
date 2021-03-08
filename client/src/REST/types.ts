// TODO: https://github.com/actually-colab/editor/issues/39

export interface DUser {
  uid: number;
  name: string;
  email: string;
}

export interface DCell {
  nb_id: DNotebook['nb_id'];
  lock_held_by?: DUser['uid'];
  cell_id: string;
  time_modified: number;
  contents: string;
  language: 'python3' | 'markdown';
}

export type NotebookAccessLevelType = 'Full Access' | 'Read Only';

export interface DNotebookAccessLevel {
  nb_id: DNotebook['nb_id'];
  uid: DUser['uid'];
  access_level: NotebookAccessLevelType;
}

export interface NotebookAccessLevel extends DUser {
  access_level: NotebookAccessLevelType;
}

export interface DNotebook {
  nb_id: number;
  name: string;
  language: 'python2' | 'python3';
}

export interface Notebook extends DNotebook {
  users: NotebookAccessLevel[];
}

export interface NotebookContents extends Notebook {
  cells: {
    [cell_id: number]: DCell;
  };
}
