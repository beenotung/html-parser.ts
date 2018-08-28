import * as fs from 'fs';

export function parseFile(filename: string) {
  console.log('parseFile:', {filename});
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString());
      }
    });
  }).then((text) => parseHtml(text, 0));
}

export type NodeContent = Node | string;

export interface Attribute {
  name: string;
  value?: string;
}

export interface Node {
  tagName: string;
  attributes: Attribute[];
  contents: NodeContent[];
}

export function textContent(nodeContent: NodeContent): string {
  if (typeof nodeContent === 'string') {
    return nodeContent;
  }
  const node: Node = nodeContent;
  const attr =
    node.attributes.length === 0
      ? ''
      : ' ' +
      node.attributes
        .map((x) => {
          if (x.value === undefined) {
            return x.name;
          } else {
            return x.name + '=' + JSON.stringify(x.value);
          }
        })
        .join(' ');
  const innerHTML = node.contents.map((x) => textContent(x)).join('');
  return `<${node.tagName}${attr}>${innerHTML}</${node.tagName}>`;
}

export type ParseResult = [NodeContent[], number];

function parseHtmlComment(text: string, offset: number): ParseResult {
  const start = offset + '<!--'.length;
  const end = text.indexOf('-->', offset);
  console.log({start, end, offset});
  const content = text.substring(start, end);
  offset = end + '-->'.length;
  return [[content], offset];
}

function isBetween(l, m, r) {
  return l <= m && m <= r;
}

function parseWord(text: string, offset: number): [string, number] {
  const start = offset;
  let end = offset;
  for (; end < text.length;) {
    const c = text[end];
    if (
      c === '_' ||
      isBetween('0', c, '9') ||
      isBetween('a', c, 'z') ||
      isBetween('A', c, 'Z')
    ) {
      end++;
    } else {
      break;
    }
  }
  const word = text.substring(start, end);
  if (word.length === 0) {
    debugLine(text, offset);
    throw new Error('no word to be parsed');
  }
  offset += word.length;
  return [word, offset];
}

function parseHtmlCommand(text: string, offset: number): ParseResult {
  offset = offset + '<!'.length;
  let name: string;
  [name, offset] = parseWord(text, offset);
  if (name.toUpperCase() === 'DOCTYPE') {
    offset = text.indexOf('>', offset) + 1;
    return [[], offset];
  } else {
    debugLine(text, offset);
    throw new Error('unsupported html command');
  }
}

function parseHtmlText(text: string, offset: number): ParseResult {
  const start = offset;
  let end = text.indexOf('<', start);
  if (end === -1) {
    end = text.length;
  }
  // TODO escape string
  const content = text.substring(start, end);
  return [[content], end];
}

function parseExact(pattern: string, text: string, offset: number): number {
  if (text.startsWith(pattern, offset)) {
    return offset + pattern.length;
  }
  debugLine(text, offset);
  throw new Error(`Expect pattern: '${pattern}'`);
}

function parseSpace(text: string, offset: number): number {
  for (; offset < text.length; offset++) {
    const c = text[offset];
    switch (c) {
      case ' ':
      case '\n':
        break;
      default:
        return offset;
    }
  }
}

function parseString(text: string, offset: number): [string, number] {
  console.log('parseString:', {len: text.length, offset});
  debugLine(text, offset);
  const q = text[offset];
  offset++;
  switch (q) {
    case '"':
    case "'":
      break;
    default:
      debugLine(text, offset);
      throw new Error('Expect quotemark for string');
  }
  let content = '';
  for (; offset < text.length;) {
    const c = text[offset];
    if (c === q) {
      break;
    }
    if (c === '\\') {
      content += text[offset + 1];
      offset += 2;
    } else {
      content += c;
      offset++;
    }
  }
  return [content, offset + 1];
}

function emit(event) {
  console.log('emit:', {event});
}

function last<A>(xs: A[]): A {
  return xs[xs.length - 1];
}

function parseTag(text: string, offset: number, stack: NodeContent[]): ParseResult {
  offset += '<'.length;
  let tagName: string;
  if (text[offset] === '/') {
    /* close tag */
    offset++;
    [tagName, offset] = parseWord(text, offset);
    offset = parseExact('>', text, offset);
    emit(['close tag', tagName]);
    for (; ;) {
      let top = last(stack);
      if (!top) {
        debugLine(text, offset);
        throw new Error(`close tag without opening it, tagName:'${tagName}'`);
      }
      if (typeof top !== "string") {
        if (top.tagName === tagName) {
          /* close top tag now */
        }
        /* close more */
      }
    }
    return [[], offset];
  }
  [tagName, offset] = parseWord(text, offset);
  console.log({tagName});
  const attributes: Attribute[] = [];
  for (; offset < text.length && text[offset] !== '>';) {
    console.log('for:', {offset, char: text[offset]});
    const attribute: Attribute = {
      name: '',
    };
    offset = parseSpace(text, offset);
    [attribute.name, offset] = parseWord(text, offset);
    console.log(attribute);
    offset = parseSpace(text, offset);
    if (text[offset] === '=') {
      offset++;
      [attribute.value, offset] = parseString(text, offset);
      console.log(attribute);
    }
    attributes.push(attribute);
  }
  offset = parseExact('>', text, offset);
  emit(['open tag', tagName]);
  const node: Node = {
    tagName,
    attributes,
    contents: [],
  };
  return [[node], offset];
}

export function parseHtmlOnce(text: string, offset: number, stack: NodeContent[]): ParseResult {
  console.log('parseHtmlOnce:', {len: text.length, offset});
  debugLine(text, offset);
  if (text.startsWith('<!--', offset)) {
    return parseHtmlComment(text, offset);
  }
  if (text.startsWith('<!', offset)) {
    return parseHtmlCommand(text, offset);
  }
  if (text.startsWith('<', offset)) {
    return parseTag(text, offset, stack);
  }
  return parseHtmlText(text, offset);
  debugLine(text, offset);
  throw new Error('unsupported html');
}

export function parseHtml(text: string, offset = 0): ParseResult {
  const root: NodeContent[] = [];
  for (; offset < text.length;) {
    let leaf: NodeContent[];
    [leaf, offset] = parseHtmlOnce(text, offset);
    root.push(...leaf);
  }
  return [root, offset];
}

export function debugLine(text: string, offset: number) {
  console.log('debugLine:', {len: text.length, offset, char: text[offset]});
  let start = 0;
  let line = 1;
  let col = 0;
  let i = 0;
  for (; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 0;
      start = i + 1;
    } else {
      col++;
    }
  }
  let end = offset;
  for (; end < text.length; end++) {
    if (text[end] === '\n') {
      break;
    }
  }
  const lineText = text.substring(start, end);
  const lineNum = line.toString();
  const space = ' '.repeat(lineNum.length + 1);
  console.debug(space + '='.repeat(lineText.length));
  console.debug(lineNum + ':' + lineText);
  console.debug(space + ' '.repeat(col) + '^');
  console.debug(space + '='.repeat(lineText.length));
  true ||
  console.log({
    offset,
    line,
    col,
    c: text[offset],
    start,
    end,
    lineText,
  });
}

export function debugLineOld(text: string, offset: number) {
  console.log('debugLine:', {len: text.length, offset});
  let line = 0;
  let col = 0;

  let start = 0;
  for (; start < text.length && start < offset;) {
    // console.log('for:', { start, end, line, col, offset });
    const idx = text.indexOf('\n', start);
    if (idx === -1) {
      break;
    }
    if (idx === start) {
      // console.log('!eq!', { line, col, idx, start });
      break;
    }
    line++;
    col += idx - start;
    start = idx + 1;
  }
  let end = text.length;
  const idx = text.indexOf('\n', start);
  if (idx !== -1) {
    end = idx;
  }
  const len = end - start + 1;
  const lineText = text.substring(start, end);
  const lineStr = line.toString();
  const borderLine =
    ' '.repeat(lineStr.length + 1) + '='.repeat(len + lineStr.length + 1);
  const nSpaceBefore = Math.max(0, col - offset - 1);
  console.debug(borderLine);
  console.debug(lineStr + ':' + lineText);
  console.debug(' '.repeat(lineStr.length + 1 + nSpaceBefore) + '^');
  console.debug(borderLine);
  console.debug('debugLine:', {
    len: text.length,
    offset,
    start,
    end,
    line,
    col,
    nSpaceBefore,
    c: text[offset],
  });
}

export function format(o) {
  return JSON.stringify(o, undefined, 2);
}
