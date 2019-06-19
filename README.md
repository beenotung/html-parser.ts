# @beenotung/html-parser
[![npm Package Version](https://img.shields.io/npm/v/@beenotung/html-parser.svg?maxAge=2592000)](https://www.npmjs.com/package/@beenotung/html-parser)

The zero-dependency parser for html that return the dom (tree) structure.

## Why @beenotung/html-parser
I tried to find a html parser for node.js.

I found many complicated libraries that don't work for me.

And I found some simple libraries that is too low level, requiring me to handle open and close of element, are you kidding me?
That looks like tokenizer (higher level though) than a parser.

## Core Progress

handle: parse and encode

- [x] text
- [x] normal element
- [x] command
- [x] short-closed elements
- [x] comment
- [ ] auto fix not properly closed elements*, e.g. li, td
- [x] style
- [x] script
- [x] svg

### auto fix not properly closed element
```
when unexpected closing tag is saw

  if the tag name is in the parent
    auto close until the matching parent
    auto create new opening tag to wrap following element

  if the tag name is not in the parent
    ignore the unexpected closing tag
```

## Future work
To implement more query selector if needed.
