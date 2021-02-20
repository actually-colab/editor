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