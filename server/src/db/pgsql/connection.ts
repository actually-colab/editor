import knex from 'knex';

console.error('PGSQL HOST', process.env.AC_PGSQL_HOST);
console.error('PGSQL USER', process.env.AC_PGSQL_USER);
console.error('PGSQL DB', process.env.AC_PGSQL_DATABASE);

export default knex({
  client: 'pg',
  connection: {
    host: process.env.AC_PGSQL_HOST,
    user: process.env.AC_PGSQL_USER,
    password: process.env.AC_PGSQL_PASSWORD,
    database: process.env.AC_PGSQL_DATABASE,
  },
  debug: process.env.IS_OFFLINE != null,
  pool: { min: 0, max: 200 },
});
