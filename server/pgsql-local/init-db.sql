CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "User" (
  uid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(256) UNIQUE,
  name VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS "Notebook" (
  nb_id UUID DEFAULT uuid_generate_v4()  PRIMARY KEY,
  name VARCHAR(256),
  language VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS "NotebookAccessLevel" (
  nb_id UUID REFERENCES "Notebook" (nb_id) NOT NULL,
  uid UUID REFERENCES "User" (uid) NOT NULL,
  access_level VARCHAR(64),
  PRIMARY KEY (nb_id, uid)
);

CREATE TABLE IF NOT EXISTS "ActiveSession" (
  session_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nb_id UUID REFERENCES "Notebook" (nb_id),
  uid UUID REFERENCES "User" (uid) NOT NULL,
  "connectionId" VARCHAR(64) NOT NULL,
  time_connected BIGINT,
  time_disconnected BIGINT,
  last_event BIGINT,
  UNIQUE ("connectionId", nb_id)
);

CREATE TABLE IF NOT EXISTS "Cell" (
  nb_id UUID REFERENCES "Notebook" (nb_id) NOT NULL,
  lock_held_by UUID REFERENCES "User" (uid),
  cell_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  time_modified BIGINT,
  contents TEXT,
  position SERIAL NOT NULL,
  cursor_pos SMALLINT,
  language VARCHAR(16)
);
