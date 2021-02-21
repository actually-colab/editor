import { DNotebook } from '../../pgsql/models/Notebook';
import { DUser } from '../../pgsql/models/User';

export interface DCell {
  nb_id: DNotebook['nb_id'];
  lock_held_by?: DUser['uid'];
  cell_id: string;
  time_modified: number;
  contents: string;
  language: 'python3' | 'markdown';
}
