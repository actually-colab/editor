export default {
  usersTableName: process.env.AC_PGSQL_USERS_TABLE_NAME ?? 'User',
  notebooksTableName: process.env.AC_PGSQL_NOTEBOOKS_TABLE_NAME ?? 'Notebook',
};
