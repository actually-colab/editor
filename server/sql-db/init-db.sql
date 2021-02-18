CREATE TABLE IF NOT EXISTS User (
  uid serial PRIMARY KEY NOT NULL,
  email VARCHAR(256) UNIQUE,
  name VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS Notebook (
  nb_id serial PRIMARY KEY NOT NULL,
  name VARCHAR(256),
  language VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS NotebookAccessLevel (
  nb_id serial REFERENCES Notebook (id) NOT NULL,
  uid serial REFERENCES User (id) NOT NULL,
  access_level VARCHAR(64),
  PRIMARY KEY (nb_id, uid)
);