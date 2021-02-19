export default {
  cellsTableName: process.env.AC_DDB_CELLS_TABLE_NAME ?? 'Cell',
  outputsTableName: process.env.AC_DDB_OUTPUTS_TABLE_NAME ?? 'Output',
};
