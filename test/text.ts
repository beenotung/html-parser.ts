import { parseHtmlDocument } from '../src/core'

let name = '.textContent should get the direct text node'
let td = parseHtmlDocument('<td>08:15</td>')
if (td.textContent == '08:15') {
  console.log('[pass]', name)
} else {
  console.log('[fail]', name)
  console.log('textContent:', td.textContent)
  console.log()
}

name = '.textContent should get the text node in children'
td = parseHtmlDocument('<td><a>08:15</a></td>')
if (td.textContent == '08:15') {
  console.log('[pass]', name)
} else {
  console.log('[fail]', name)
  console.log('textContent:', td.textContent)
}
