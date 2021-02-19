export default {
  usersTableName: process.env.AC_PGSQL_USERS_TABLE_NAME ?? 'User',
  notebooksTableName: process.env.AC_PGSQL_NOTEBOOKS_TABLE_NAME ?? 'Notebook',
  notebookAccessLevelsTableName:
    process.env.AC_PGSQL_NOTEBOOK_ACCESS_LEVELS_TABLE_NAME ?? 'NotebookAccessLevel',
};