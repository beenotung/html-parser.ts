import {parseFile, textContent} from "../src";

if (process.argv.length != 3) {
  console.error('Error: expect 1 argument as filename, got ' + (process.argv.length - 2) + '.');
  process.exit(1);
}
let filename = process.argv[2];
parseFile(filename).then(res => {
  let [nodes, offset] = res;
  let text = nodes.map(e => textContent(e)).join('');
  console.log(text);
});
