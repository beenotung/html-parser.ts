import { readFileSync, writeFileSync } from 'fs'
import { parseHtmlDocument } from '../src'

let html = readFileSync('examples/inline-style.html').toString()
let doc = parseHtmlDocument(html)
writeFileSync('out.html', doc.outerHTML)
writeFileSync('out-cloned.html', doc.clone().outerHTML)
