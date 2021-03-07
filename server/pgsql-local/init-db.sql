CREATE TABLE IF NOT EXISTS "User" (
  uid SERIAL PRIMARY KEY NOT NULL,
  email VARCHAR(256) UNIQUE,
  name VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS "Notebook" (
  nb_id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(256),
  language VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS "NotebookAccessLevel" (
  nb_id SERIAL REFERENCES "Notebook" (nb_id) NOT NULL,
  uid SERIAL REFERENCES "User" (uid) NOT NULL,
  access_level VARCHAR(64),
  PRIMARY KEY (nb_id, uid)
);

CREATE TABLE IF NOT EXISTS "ActiveSession" (
  nb_id SERIAL REFERENCES "Notebook" (nb_id) NOT NULL,
  uid SERIAL REFERENCES "User" (uid) NOT NULL,
  connectionId VARCHAR(64) NOT NULL,
  time_connected INTEGER,
  time_disconnected INTEGER,
  last_event INTEGER,
  PRIMARY KEY (connectionId)
);

CREATE TABLE IF NOT EXISTS "Cell" (
  nb_id SERIAL REFERENCES "Notebook" (nb_id) NOT NULL,
  lock_held_by SERIAL REFERENCES "User" (uid) NOT NULL,
  cell_id SERIAL NOT NULL,
  time_modified INTEGER,
  contents TEXT,
  language VARCHAR(16),
  PRIMARY KEY (cell_id)
);
