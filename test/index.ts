import {parseFile, outerHtml} from "../src";
import * as fs from 'fs';

if (process.argv.length != 3) {
  console.error('Error: expect 1 argument as filename, got ' + (process.argv.length - 2) + '.');
  process.exit(1);
}
let filename = process.argv[2];
parseFile(filename).then(res => {
  let [nodes, offset] = res;
  let parsedText = nodes.map(e => outerHtml(e)).join('');
  console.log(parsedText);
  let fileText = fs.readFileSync(filename).toString();
  let match = parsedText == fileText;
  console.log({
    file_len: fileText.length,
    parsed_len: parsedText.length,
    match,
    line: {f: fileText.split('\n').length, p: parsedText.split('\n').length},
    head: {f: fileText[0], p: parsedText[0]},
    tail: {f: fileText[fileText.length - 1], p: parsedText[parsedText.length - 1]},
  });
});
