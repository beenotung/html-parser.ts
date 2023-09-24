import { HTMLElement, parseFile, parseHtmlDocument } from '../src'

async function main() {
  let doc = await parseFile('examples/multi-line-element.html')
  console.dir(doc, { depth: 20 })
  console.assert(doc.childNodes.length == 1, 'expect 1 element')
  let node = doc.childNodes[0]
  console.assert(node instanceof HTMLElement, 'expect HTMLElement')
  let div = node as HTMLElement
  console.assert(div.tagName == 'div', 'expect div')
  console.assert(div.attributes?.getValue('id') == 'main', 'expect id=main')
  console.assert(
    div.attributes?.getValue('class') == 'container',
    'expect class=container',
  )
  console.assert(div.attributes?.getValue('data-id') == '1', 'expect data-id=1')
}
main().catch(e => console.error(e))
