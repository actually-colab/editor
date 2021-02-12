export default {
  usersTableName: process.env.AC_USERS_TABLE_NAME ?? 'User',
  notebooksTableName: process.env.AC_NOTEBOOKS_TABLE_NAME ?? 'Notebook',
  cellsTableName: process.env.AC_CELLS_TABLE_NAME ?? 'Cell',
  outputsTableName: process.env.AC_OUTPUTS_TABLE_NAME ?? 'Output',
};
