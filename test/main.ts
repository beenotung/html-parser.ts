import { parseFile } from '../src';
import * as fs from 'fs';
import * as util from 'util';

let writeFile = util.promisify(fs.writeFile);
let readFile = util.promisify(fs.readFile);

export async function test(filename: string) {
  let { root, fullyParsed } = await parseFile(filename);
  if (!fullyParsed) {
    console.error('html not fully parsed');
  }
  let parsedText = root.outerHTML;
  // console.log(parsedText);
  let fileText = (await readFile(filename)).toString();
  let match = parsedText == fileText;
  console.log({
    match,
    file_len: fileText.length,
    parsed_len: parsedText.length,
    line: { f: fileText.split('\n').length, p: parsedText.split('\n').length },
    head: { f: fileText[0], p: parsedText[0] },
    tail: { f: fileText[fileText.length - 1], p: parsedText[parsedText.length - 1] },
  });
  if (!match) {
    await Promise.all([
      writeFile('in.html', fileText),
      writeFile('out.html', parsedText),
    ]);
    throw new Error('not match on file: ' + filename);
  }
}

export async function testAll(filenames: string[]) {
  try {
    for (let filename of filenames) {
      await test(filename);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
