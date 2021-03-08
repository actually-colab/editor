CREATE TABLE IF NOT EXISTS "User" (
  uid SERIAL PRIMARY KEY,
  email VARCHAR(256) UNIQUE,
  name VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS "Notebook" (
  nb_id SERIAL PRIMARY KEY,
  name VARCHAR(256),
  language VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS "NotebookAccessLevel" (
  nb_id INTEGER REFERENCES "Notebook" (nb_id) NOT NULL,
  uid INTEGER REFERENCES "User" (uid) NOT NULL,
  access_level VARCHAR(64),
  PRIMARY KEY (nb_id, uid)
);

CREATE TABLE IF NOT EXISTS "ActiveSession" (
  session_id SERIAL PRIMARY KEY,
  nb_id INTEGER REFERENCES "Notebook" (nb_id),
  uid INTEGER REFERENCES "User" (uid) NOT NULL,
  "connectionId" VARCHAR(64) NOT NULL,
  time_connected BIGINT,
  time_disconnected BIGINT,
  last_event BIGINT,
  UNIQUE ("connectionId", nb_id)
);

CREATE TABLE IF NOT EXISTS "Cell" (
  nb_id INTEGER REFERENCES "Notebook" (nb_id) NOT NULL,
  lock_held_by INTEGER REFERENCES "User" (uid) NOT NULL,
  cell_id SERIAL NOT NULL,
  time_modified BIGINT,
  contents TEXT,
  language VARCHAR(16),
  PRIMARY KEY (cell_id)
);
