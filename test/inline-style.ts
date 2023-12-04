import { readFileSync, writeFileSync } from 'fs'
import { parseHtmlDocument } from '../src'

let html = readFileSync('examples/inline-style.html').toString()
let doc = parseHtmlDocument(html)
let text = doc.outerHTML
writeFileSync('out.html', text)
