// TODO: https://github.com/actually-colab/editor/issues/39

export interface DUser {
  uid: number;
  name: string;
  email: string;
}

export type NotebookAccessLevel = 'Full Access' | 'Read Only';

export interface DNotebookAccessLevel {
  nb_id: DNotebook['nb_id'];
  uid: DUser['uid'];
  access_level: NotebookAccessLevel;
}

export interface DNotebook {
  nb_id: number;
  name: string;
  language: 'python2' | 'python3';
}

export interface Notebook extends DNotebook {
  users: (DUser & { access_level: DNotebookAccessLevel['access_level'] })[];
}
