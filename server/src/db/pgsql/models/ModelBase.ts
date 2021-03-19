export type UTCEpochDateTime = number;
export type UUID = string;

export interface ModelBase {
  [k: string]: number | string | boolean | UTCEpochDateTime | UUID | null | undefined;
}
