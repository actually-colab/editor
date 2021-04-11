CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "User" (
  uid       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email     VARCHAR(256) UNIQUE,
  name      VARCHAR(256),
  image_url VARCHAR(2048)
);

CREATE TABLE IF NOT EXISTS "Workshop" (
  ws_id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          VARCHAR(256),
  description   VARCHAR(256),
  time_modified DOUBLE PRECISION,
  start_time    DOUBLE PRECISION,
  end_time      DOUBLE PRECISION,
  capacity      INT
);

CREATE TABLE IF NOT EXISTS "WorkshopAccessLevel" (
  ws_id         UUID REFERENCES "Workshop" (ws_id) NOT NULL,
  uid           UUID REFERENCES "User" (uid) NOT NULL,
  access_level  VARCHAR(64) NOT NULL,
  PRIMARY KEY (ws_id, uid)
);

CREATE TABLE IF NOT EXISTS "Notebook" (
  nb_id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          VARCHAR(256),
  time_modified DOUBLE PRECISION,
  language      VARCHAR(256),
  ws_id         UUID REFERENCES "Workshop" (ws_id),
  ws_main_notebook boolean
);

CREATE TABLE IF NOT EXISTS "NotebookAccessLevel" (
  nb_id         UUID REFERENCES "Notebook" (nb_id) NOT NULL,
  uid           UUID REFERENCES "User" (uid) NOT NULL,
  access_level  VARCHAR(64),
  PRIMARY KEY (nb_id, uid)
);

CREATE TABLE IF NOT EXISTS "ActiveSession" (
  session_id        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nb_id             UUID REFERENCES "Notebook" (nb_id),
  uid               UUID REFERENCES "User" (uid) NOT NULL,
  "connectionId"    VARCHAR(64) NOT NULL,
  time_connected    DOUBLE PRECISION,
  time_disconnected DOUBLE PRECISION,
  last_event        DOUBLE PRECISION,
  UNIQUE ("connectionId", nb_id, time_disconnected)
);

CREATE TABLE IF NOT EXISTS "Cell" (
  nb_id         UUID REFERENCES "Notebook" (nb_id) NOT NULL,
  lock_held_by  UUID REFERENCES "User" (uid),
  cell_id       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  time_modified DOUBLE PRECISION,
  contents      TEXT,
  position      SERIAL NOT NULL,
  cursor_row    SMALLINT,
  cursor_col    SMALLINT,
  language      VARCHAR(16),
  UNIQUE (nb_id, cell_id, position)
);
