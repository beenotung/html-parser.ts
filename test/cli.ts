import { test, testAll } from './main';

if (process.argv.length < 3) {
  console.error('Error: expect at least 1 argument as filename, got ' + (process.argv.length - 2) + '.');
  process.exit(1);
}
let filenames = process.argv.slice(2);
testAll(filenames);

