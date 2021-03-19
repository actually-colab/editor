export type UTCEpochDateTime = number;
export type UUID = string;

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray | null | undefined;
}
type JsonArray = Array<string | number | boolean | Date | Json | JsonArray>;

export type ModelBase = Json;
