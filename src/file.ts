import * as fs from 'fs';
import { parseHtml } from './core';

export function parseFile (filename: string) {
  console.log('parseFile:', { filename });
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString());
      }
    });
  }).then((text) => parseHtml(text, 0));
}
