import { parseHtmlDocument, getElementByTagName } from '../src/core'

let html = `
<div>
  <h1 class="title">Hello World</h1>
  <p>This is my first blog post!</p>
</div>
`

let doc1 = parseHtmlDocument(html)
let doc2 = doc1.clone()

let title1 = getElementByTagName(doc1, 'h1')!
title1.attributes!.attrs.push(' ')
title1.attributes!.attrs.push({ name: 'data-id', value: '1' })

let title2 = getElementByTagName(doc2, 'h1')!
title2.attributes!.attrs.push(' ')
title2.attributes!.attrs.push({ name: 'data-id', value: '2' })

// console.log('== doc1 ==')
// console.log(doc1.outerHTML)

// console.log('== doc2 ==')
// console.log(doc2.outerHTML)

// console.log('== assertions ==')

console.assert(
  doc1.outerHTML != doc2.outerHTML,
  'two document should be distinct',
)

console.assert(
  doc1.outerHTML.includes('data-id=1'),
  'doc1 should has data-id=1',
)
console.assert(
  !doc1.outerHTML.includes('data-id=2'),
  'doc1 should not has data-id=2',
)

console.assert(
  !doc2.outerHTML.includes('data-id=1'),
  'doc2 should not has data-id=1',
)
console.assert(
  doc2.outerHTML.includes('data-id=2'),
  'doc2 should has data-id=2',
)
