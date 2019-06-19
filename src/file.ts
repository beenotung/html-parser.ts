import * as fs from 'fs';
import * as util from 'util';
import { parseHtmlDocument } from './core';

const readFile = util.promisify(fs.readFile);

export async function parseFile (filename: string, skipTrim = false) {
  const bin = await readFile(filename);
  const html = bin.toString();
  return parseHtmlDocument(html, skipTrim);
}
