# html-parser.ts
[![npm Package Version](https://img.shields.io/npm/v/html-parser.ts.svg?maxAge=2592000)](https://www.npmjs.com/package/html-parser.ts)

The zero-dependency robust and fast html parser for node.js and browser that return the dom (tree) structure.

## Why html-parser.ts
I tried to find a html parser for node.js.

I found many complicated libraries that were matching my need.

And I found some simple libraries that were too low level, requiring user to handle open and close of element.
(That looks like tokenizer (higher level though) than a parser.)

## Typescript Signature (Named Exported Library)

Details refer to [core.ts](./src/core.ts) on Github repo or `html-parser.ts/dist/core.d.ts` on npm package.

### Main Functions
```typescript
function parseHtmlDocument (html: string, skipTrim?: boolean): Document;
function parseFile     (filename: string, skipTrim?: boolean): Promise<Document>;

function walkNode         (node: Node, f: (node: Node, parent: Node, idx: number) => void, parent?: Node, idx?: number): void;
function walkNodeReversed (node: Node, f: (node: Node, parent: Node, idx: number) => void, parent?: Node): void;

function isTagName    (node: Node, tagName : string  ): boolean;
function isAnyTagName (node: Node, tagNames: string[]): boolean;

/** including the given node */
function getElementByTagName    (node: Node, tagName: string): HTMLElement | undefined;
/** including the given node */
function getElementsByTagName   (node: Node, tagName: string): HTMLElement[];
/** including the given node */
function hasElementByTagName    (node: Node, tagName: string): boolean;
/** including the given node */
function hasElementByAnyTagName (node: Node, tagNames: string[]): boolean;
```

### Main Classes
```typescript
abstract class Node {
    abstract outerHTML: string;
    abstract minifiedOuterHTML: string;
    abstract textContent: string | null;
    childNodes?: Node[];
    forEachChildNode(f: (node: Node, idx: number, childNodes: Node[]) => void): void;
    abstract clone(): this;
}
class Text extends Node {}
interface Attr {
    name: string;
    extraAfterName?: string;
    extraBeforeValue?: string;
    value?: string;
}
class Attributes extends Node {
    attrs: Array<Attr | string>;
    textContent: null;
    forEachAttr(f: (attr: Attr) => void): void;
    toObject(): Record<string, string>
    hasName(name: string): boolean;
    getValue(name: string): string | undefined;
}
class HTMLElement extends Node {
    tagName: string;
    noBody?: boolean;
    attributes?: Attributes;
    notClosed: boolean;
    extraClosing?: boolean;
    textContent: string;
    innerHTML: string;
    /** @param tagName assume to be in lower case */
    isTagName(tagName: string): boolean;
    /** @param tagNames assume to be in lower case */
    isAnyTagName(tagNames: string[]): boolean;
    hasText(): boolean;
    /** not including this element */
    getElementsByTagName(tagName: string): HTMLElement[];
    /** not including this element */
    hasElementByTagName(tagName: string): boolean;
    /** not including this element */
    hasElementByAnyTagName(tagNames: string[]): boolean;
}
class Command extends HTMLElement {}
class Comment extends Command {
    tagName: string;
    content: string;
}
abstract class DSLElement extends HTMLElement {
    textContent: string;
    abstract minifiedTextContent: string;
}
class Style extends DSLElement {}
class Script extends DSLElement {}
class Document extends Node {
    childNodes: Node[];
}
// for easy reference
let NodeClasses = [
  Text,
  Attributes,
  HTMLElement,
  Command,
  Comment,
  DSLElement,
  Style,
  Script,
  Document,
];
```

## Core Progress

Parse and encode html document / fragment:

- [x] text
- [x] normal element
- [x] command
- [x] short-closed elements
- [x] comment
- [ ] auto fix not properly closed elements*, e.g. li, td
- [x] style
- [x] script
  - [x] regex
- [x] svg
- [x] extra string quote in attr*

Auto recover from extra string quote in attr*: e.g. `<li class=" my-class"">`

### Auto fix not properly closed element
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

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
