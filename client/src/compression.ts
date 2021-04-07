import brotli from 'brotli';
import { Buffer } from 'buffer';

export const compress = (item: string): string => {
  const bufferedOutput = Buffer.from(item, 'utf8');
  const compressedOutput = brotli.compress(bufferedOutput);
  const encodedOutput = Buffer.from(compressedOutput).toString('base64');
  return encodedOutput;
};

export const decompress = (item: string): string => {
  const decodedOutput = Buffer.from(item, 'base64');
  const decompressedOutput = brotli.decompress(decodedOutput);
  const unbufferedOutput = Buffer.from(decompressedOutput).toString('utf8');
  return unbufferedOutput;
};
