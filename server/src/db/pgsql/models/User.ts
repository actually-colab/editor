import pgsql from '../connection';
import tablenames from '../tablenames';

export type NotebookAccessLevel = 'Full Access' | 'Read Only';

export interface DUser {
  uid: number;
  name: string;
  email: string;
}
