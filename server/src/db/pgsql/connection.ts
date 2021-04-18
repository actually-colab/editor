import knex from 'knex';

console.log(process.env.AC_PGSQL_USER);

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
