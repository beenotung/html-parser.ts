import { getElementByTagName, parseHtmlDocument } from '../src'

let html = `
<ul>
 <li></li>
</ul>
`

let doc = parseHtmlDocument(html)
let ul = getElementByTagName(doc, 'ul')!
let li = getElementByTagName(ul, 'li')!
console.assert(li.parentElement == ul, 'expect parentElement to be ui')

ul = ul.clone()
li = getElementByTagName(ul, 'li')!
console.assert(li.parentElement == ul, 'expect parentElement to be cloned ul')
