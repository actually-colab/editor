export default {
  usersTableName: process.env.AC_PGSQL_USERS_TABLE_NAME ?? 'User',
  cellsTableName: process.env.AC_PGSQL_CELLS_TABLE_NAME ?? 'Cell',
  activeSessionsTableName: process.env.AC_PGSQL_ACTIVE_SESSIONS_TABLE_NAME ?? 'User',
  notebooksTableName: process.env.AC_PGSQL_NOTEBOOKS_TABLE_NAME ?? 'Notebook',
  notebookAccessLevelsTableName:
    process.env.AC_PGSQL_NOTEBOOK_ACCESS_LEVELS_TABLE_NAME ?? 'NotebookAccessLevel',
  workshopsTableName: process.env.AC_PGSQL_WORKSHOPS_TABLE_NAME ?? 'Workshop',
  workshopAccessLevelsTableName:
    process.env.AC_PGSQL_WORKSHOP_ACCESS_LEVELS_TABLE_NAME ?? 'WorkshopAccessLevel',
};
