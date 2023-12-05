import { readFileSync } from 'fs'
import { HTMLElement, parseHtmlDocument } from '../src'
import { test } from 'node:test'

test('escape attribute string', () => {
  let html = readFileSync('examples/escape-attribute-quote.html').toString()
  let doc = parseHtmlDocument(html)

  let elements = doc.childNodes.filter(node => node instanceof HTMLElement)

  let div1 = elements[0] as HTMLElement
  let div2 = elements[1] as HTMLElement
  let div3 = elements[2] as HTMLElement

  let title = div1.attributes?.getValue('title')
  console.assert(
    title == '/ normal text \\',
    "should not escape string by '\\' but got " + JSON.stringify(title),
  )

  title = div2.attributes?.getValue('title')
  console.assert(
    title == `"'double'"`,
    'should escape string with &quot; but got ' + JSON.stringify(title),
  )

  title = div3.attributes?.getValue('title')
  console.assert(
    title == 'a&b',
    'should not escape when not needed but got ' + JSON.stringify(title),
  )
})

test('add attribute', () => {
  let input = /* html */ `<a data-href="link" href="/profile.html">text</a>`
  let href = '/profile.html?id=1'
  let expected = /* html */ `<a data-href="link" href="/profile.html?id=1">text</a>`

  let doc = parseHtmlDocument(input)
  let a: HTMLElement = doc.childNodes[0] as any
  console.assert(
    a.outerHTML === input,
    'the a should be parsed and reconstructed',
  )

  a.setAttribute('href', href)
  console.assert(a.outerHTML === expected, 'the href should be updated')
})

test('update attribute', () => {
  let input = /* html */ `<a data-href="link" href="/profile.html">text</a>`
  let href = '/profile.html?id=1'
  let expected = /* html */ `<a data-href="link" href="/profile.html?id=1">text</a>`

  let doc = parseHtmlDocument(input)
  let a: HTMLElement = doc.childNodes[0] as any
  console.assert(
    a.outerHTML === input,
    'the a should be parsed and reconstructed',
  )

  a.setAttribute('href', href)
  console.assert(a.outerHTML === expected, 'the href should be updated')
})
