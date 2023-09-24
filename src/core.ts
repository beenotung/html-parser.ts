export let config = {
  dev: false,
  debug: false,
  debugStream: false,
  autoRepair: false,
};
// config.dev = true;
// config.debug = true;
// config.autoRepair = true;

interface ParseResult<T> {
  res: string;
  data: T;
}

export abstract class Node {
  abstract outerHTML: string;
  abstract minifiedOuterHTML: string;
  abstract textContent: string | null;
  childNodes?: Node[];

  forEachChildNode (f: (node: Node, idx: number, childNodes: Node[]) => void) {
    if (this.childNodes) {
      this.childNodes.forEach((node, i, nodes) => f(node, i, nodes));
    }
  }

  abstract clone (): this;
}

export interface NodeConstructor<T extends Node> {
  name: string;

  new (): T;

  parse (html: string): ParseResult<T>;
}

/* tslint:disable:no-unused-variable */
const dev = console.log.bind(console, '[parser]');

/* tslint:enable:no-unused-variable */

export function walkNode (
  node: Node,
  f: (node: Node, parent: Node, idx: number) => void,
  parent = node,
  idx = -1,
) {
  f(node, parent, idx);
  if (node.childNodes) {
    node.childNodes.forEach((child, idx) => walkNode(child, f, node, idx));
  }
}

export function walkNodeReversed (
  node: Node,
  f: (node: Node, parent: Node, idx: number) => void,
  parent = node,
) {
  const stack: Array<{ node: Node; parent: Node; idx: number }> = [];
  walkNode(
    node,
    (node, parent, idx) => stack.push({ node, parent, idx }),
    parent,
  );
  for (let i = stack.length; i > 0; i--) {
    const { node, parent, idx } = stack.pop();
    f(node, parent, idx);
  }
}

/**
 * trim the left and right whitespace, but preserve at most one whitespace if it exist
 * */
export function trimText (s: string): string {
  let t = s.trimLeft();
  if (t.length !== s.length) {
    t = s[0] + s.substr(1).trimLeft();
  }
  s = t;
  t = s.trimRight();
  if (t.length !== s.length) {
    t = s.substr(0, s.length - 1).trimRight() + s[s.length - 1];
  }
  return t;
}

type ForCharResult = 'stop' | 'skip' | { res: string; stop?: boolean };

function forChar (
  html: string,
  f: (c: string, i: number, html: string) => ForCharResult | undefined,
): { res: string } {
  let i: number;
  main: for (i = 0; i < html.length; i++) {
    const c = html[i];
    const res = f(c, i, html);
    switch (res) {
      case 'stop':
        break main;
      case 'skip':
        i++;
        break;
      default: {
        if (res && res.res) {
          html = res.res;
          i = -1;
          if (res.stop) {
            break main;
          }
        }
      }
    }
  }
  return { res: html.substr(i) };
}

function assert (b: boolean, error) {
  if (!b) {
    if (typeof error === 'string') {
      throw new Error(error);
    }
    throw error;
  }
}

function newObject<T> (o: T): T {
  return new (o.constructor as any)();
}

export class Text extends Node {
  outerHTML: string;

  clone (): this {
    const node = newObject(this);
    node.outerHTML = this.outerHTML;
    node.childNodes = node.childNodes
      ? this.childNodes.slice()
      : this.childNodes;
    return node;
  }

  get minifiedOuterHTML (): string {
    return trimText(this.outerHTML);
  }

  get textContent (): string {
    return this.outerHTML;
  }

  static parse (html: string): ParseResult<Text> {
    let acc = '';
    const { res } = forChar(html, (c) => {
      switch (c) {
        case '<':
          return 'stop';
        default:
          acc += c;
      }
    });
    const node = new Text();
    node.outerHTML = acc;
    return {
      res,
      data: node,
    };
  }
}

function parseTagName (html: string): ParseResult<string> {
  if (html[0] === '!') {
    throw new Error('expect non-command opening');
  }
  if (html[0] === '/') {
    console.error('html:', html.substr(0, 20));
    throw new Error('expect non-closing-tag');
  }
  let name = '';
  const { res } = forChar(html, (c) => {
    switch (c) {
      case '>':
      case ' ':
      case '\t':
      case '\r':
      case '\n':
        return 'stop';
      default:
        name += c;
    }
  });
  return { res, data: name };
}

function parseAttrName (html: string): ParseResult<string> {
  let name = '';
  const { res } = forChar(html, (c) => {
    switch (c) {
      case '=':
      case ' ':
      case '\t':
      case '\r':
      case '\n':
      case '/':
      case '>':
        return 'stop';
      default:
        name += c;
    }
  });
  return { res, data: name };
}

function s (json): string {
  return JSON.stringify(json, null, 2);
}

function parseString (html: string, deliminator: string): ParseResult<string> {
  {
    const head = html[0];
    assert(
      head === deliminator,
      `expect string quote ${s(deliminator)}, got ${s(head)}`,
    );
  }
  let acc = deliminator;
  const { res } = forChar(html.substr(1), (c, i, html) => {
    switch (c) {
      case deliminator:
        acc += c;
        return 'stop';
      case '\\':
        acc += '\\' + html[i + 1];
        return 'skip';
      default:
        acc += c;
    }
  });
  return { res: res.substr(1), data: acc };
}

function parseAttrWhitespace (html: string): ParseResult<string> {
  const c = html[0];
  switch (c) {
    case ' ':
    case '\t':
    case '\r':
    case '\n':
      let acc = c;
      const { res } = forChar(html.substr(1), (c, i, html) => {
        switch (c) {
          case ' ':
          case '\t':
          case '\r':
          case '\n':
            acc += c;
            break;
          default:
            return 'stop';
        }
      });
      return { res, data: acc };
    default:
      return { res: html, data: '' };
  }
}

function parseAttrValue (html: string): ParseResult<string> {
  const c = html[0];
  switch (c) {
    case '"':
    case "'":
      return parseString(html, c);
    case '/': {
      let acc = c;
      const { res } = forChar(html.substr(1), (c, i, html) => {
        if (c.trim().length === 0) {
          return 'stop';
        }
        if (c === '>') {
          return 'stop';
        }
        if (c === '/' && html[i + 1] === '>') {
          acc += c;
          // return { res: html.substr(i + 1) ,stop:true}
          return 'stop';
        }
        acc += c;
      });
      return { res, data: acc };
    }
    default:
      return parseTagName(html);
  }
}

export interface Attr {
  name: string;
  extraAfterName?: string;
  extraBeforeValue?: string;
  value?: string;
}

export class Attributes extends Node {
  // to preserve spaces
  attrs: Array<Attr | string> = [];

  textContent: null = null;

  clone (): this {
    const node = newObject(this);
    node.attrs = this.attrs.slice();
    node.childNodes = node.childNodes
      ? this.childNodes.slice()
      : this.childNodes;
    return node;
  }

  get outerHTML (): string {
    let html = '';
    this.attrs.forEach((attrOrSpace) => {
      if (typeof attrOrSpace === 'string') {
        const space: string = attrOrSpace;
        html += space;
      } else {
        const attr: Attr = attrOrSpace;
        const { name, extraAfterName, extraBeforeValue, value } = attr;
        html += name;
        if (typeof extraAfterName === 'string') {
          html += extraAfterName;
        }
        if (typeof value === 'string') {
          html += '=';
          if (typeof extraBeforeValue === 'string') {
            html += extraBeforeValue;
          }
          html += value;
        }
      }
    });
    return html;
  }

  get minifiedOuterHTML (): string {
    let html = '';
    this.attrs.forEach((attr) => {
      if (typeof attr === 'string') {
        return;
      }
      const { name, value } = attr;
      html += ' ' + name;
      if (typeof value === 'string') {
        html += '=' + value;
      }
    });
    return html;
  }

  forEachAttr (f: (attr: Attr) => void) {
    this.attrs.forEach((attr) => {
      if (typeof attr === 'object') {
        f(attr);
      }
    });
  }

  toObject (): Record<string, string> {
    const attrs: Record<string, string> = {};
    this.forEachAttr((attr) => {
      attrs[attr.name] = attr.value;
    });
    return attrs;
  }

  hasName (name: string): boolean {
    return this.attrs.some(
      (attr) => typeof attr === 'object' && attr.name === name,
    );
  }

  getValue (name: string): string | undefined {
    const attr = this.attrs.find(
      (attr) => typeof attr === 'object' && attr.name === name,
    ) as Attr;
    if (!attr) {
      return;
    }
    const value = attr.value;
    if (!value) {
      return;
    }
    const c = value[0];
    if (c === value[value.length - 1]) {
      switch (c) {
        case '"':
        case "'":
          return value.substring(1, value.length - 1);
      }
    }
    return value;
  }

  static parse (html: string): ParseResult<Attributes> {
    const attributes = new Attributes();
    const { res } = forChar(html, (c, i, html) => {
      switch (c) {
        case ' ':
        case '\t':
        case '\r':
        case '\n':
          attributes.attrs.push(c);
          break;
        case '/':
        case '>':
          return 'stop';
        default: {
          let attr: Attr;
          // TODO remove this extra bracket level
          {
            html = html.substr(i);
            switch (html[0]) {
              case '"':
              case "'": {
                const { res, data } = parseString(html, html[0]);
                attr = {
                  name: data,
                };
                // check extra string quote
                if (res[0] === html[0]) {
                  // extra string quote, e.g.:
                  // <li class=" visible-country-us"">
                  html = res.substr(1);
                } else {
                  html = res;
                }
                break;
              }
              default: {
                const { res, data } = parseAttrName(html);
                attr = {
                  name: data,
                };
                html = res;
              }
            }
          }
          attributes.attrs.push(attr);
          if (html[0] !== '=') {
            const whitespace = parseAttrWhitespace(html);
            if (whitespace.data) {
              attr.extraAfterName = whitespace.data;
              html = whitespace.res;
            }
          }
          if (html[0] === '=') {
            html = html.substr(1);
            const whitespace = parseAttrWhitespace(html);
            if (whitespace.data) {
              attr.extraBeforeValue = whitespace.data;
              html = whitespace.res;
            }
            const { res, data } = parseAttrValue(html);
            attr.value = data;
            // check extra string quote
            switch (html[0]) {
              case '"':
              case "'":
                if (res[0] === html[0]) {
                  // extra string quote, e.g.:
                  // <li class=" visible-country-us"">
                  attributes.attrs.push(res[0]);
                  html = res.substr(1);
                } else {
                  html = res;
                }
                break;
              default:
                html = res;
            }
          }
          return { res: html };
        }
      }
    });
    return { res, data: attributes };
  }
}

function noBody (tagName: string) {
  switch (tagName.toLowerCase()) {
    case 'br':
    case 'input':
    case 'meta':
    case 'img':
    case 'link':
    case 'base':
    // inside object
    case 'param':
    case 'embed':
      return true;
    default:
      return false;
  }
}

/**
 * parse until the body of the element (not recursively)
 * */
function parseHTMLElementHead (html: string): ParseResult<HTMLElement> {
  assert(html[0] === '<', 'expect tag open bracket');
  html = html.substr(1);
  /* tslint:disable:no-use-before-declare */
  const node = new HTMLElement();
  /* tslint:enable:no-use-before-declare */
  {
    if (html[0] === '/') {
      // extra closing tag, invalid html
      node.extraClosing = true;
      html = html.substr(1);
    }
    const { res, data } = parseTagName(html);
    node.tagName = data;
    html = res;
  }
  {
    const { res, data } = Attributes.parse(html);
    node.attributes = data;
    html = res;
  }
  if (html.startsWith('/>')) {
    node.noBody = true;
    html = html.substr(2);
    return { res: html, data: node };
  }
  // html starts with '>'
  html = html.substr(1);
  return { res: html, data: node };
}

/**
 * start from end of body, must not be still inside open tag
 * */
function parseHTMLElementTail (
  html: string,
  node: HTMLElement,
  closeTagHTML: string,
): ParseResult<void> {
  assert(html[0] === '<', 'expect tag close bracket');
  // TODO support edge case of different cases of opening and closing (e.g. <p></P>)
  if (html.startsWith(closeTagHTML)) {
    // normal close
    node.notClosed = false;
    html = html.substr(closeTagHTML.length);
  } else {
    // auto repair close
    node.notClosed = true;
    if (config.debug) {
      console.log('auto repair:', node);
    }
  }
  return { res: html, data: void 0 };
}

export function isTagName (node: Node, tagName: string): boolean {
  /* tslint:disable:no-use-before-declare */
  return node instanceof HTMLElement && node.isTagName(tagName);
  /* tslint:enable:no-use-before-declare */
}

export function isAnyTagName (node: Node, tagNames: string[]): boolean {
  /* tslint:disable:no-use-before-declare */
  return node instanceof HTMLElement && node.isAnyTagName(tagNames);
  /* tslint:enable:no-use-before-declare */
}

export class HTMLElement extends Node {
  tagName: string;
  noBody?: boolean;
  attributes?: Attributes;
  /* auto repair */
  notClosed = true;
  extraClosing?: boolean;

  clone (): this {
    const node = newObject(this);
    node.tagName = this.tagName;
    node.noBody = this.noBody;
    node.attributes = this.attributes.clone();
    node.notClosed = this.notClosed;
    node.childNodes = node.childNodes
      ? this.childNodes.slice()
      : this.childNodes;
    return node;
  }

  get innerHTML (): string {
    if (!this.childNodes) {
      return '';
    }
    return this.childNodes.reduce((acc, c) => acc + c.outerHTML, '');
  }

  get outerHTML (): string {
    if (this.extraClosing) {
      return (
        (config.autoRepair ? '' : `</${this.tagName}>`) +
        (this.childNodes || []).map((node) => node.outerHTML).join('')
      );
    }
    let html = `<${this.tagName}`;
    html += this.attributes.outerHTML;
    if (this.noBody) {
      html += '/>';
      return html;
    }
    html += '>';
    (this.childNodes || []).forEach((node) => (html += node.outerHTML));
    if (!noBody(this.tagName) && (config.autoRepair || !this.notClosed)) {
      html += `</${this.tagName}>`;
    }
    return html;
  }

  get minifiedOuterHTML (): string {
    if (this.extraClosing) {
      return '' + (this.childNodes || []).map((node) => node.outerHTML).join('');
    }
    let html = `<${this.tagName}`;
    html += this.attributes.minifiedOuterHTML;
    if (this.noBody) {
      html += '/>';
      return html;
    }
    html += '>';
    if (this.childNodes) {
      this.childNodes.forEach((node) => (html += node.minifiedOuterHTML));
    }
    if (!noBody(this.tagName) && (config.autoRepair || !this.notClosed)) {
      html += `</${this.tagName}>`;
    }
    return html;
  }

  get textContent (): string {
    let text = '';
    if (this.childNodes) {
      this.childNodes.forEach((node) => (text += node.textContent));
    }
    return text;
  }

  /**
   * @param tagName assume to be in lower case
   * TODO optimize this part if possible
   * */
  isTagName (tagName: string): boolean {
    return this.tagName.toLowerCase() === tagName;
  }

  /**
   * @param tagNames assume to be in lower case
   * TODO optimize this part if possible
   * */
  isAnyTagName (tagNames: string[]): boolean {
    const tagName = this.tagName.toLowerCase();
    return tagNames.some((tag) => tag === tagName);
  }

  hasText (): boolean {
    return (
      this.childNodes &&
      this.childNodes.some(
        (node) =>
          node instanceof Text ||
          (node instanceof HTMLElement && node.hasText()),
      )
    );
  }

  /**
   * not including this element
   * */
  getElementsByTagName (tagName: string): HTMLElement[] {
    const elements: HTMLElement[] = [];
    walkNode(this, (node) => {
      if (node !== this && isTagName(node, tagName)) {
        elements.push(node as HTMLElement);
      }
    });
    return elements;
  }

  /**
   * not including this element
   * */
  hasElementByTagName (tagName: string): boolean {
    const f = (node: Node) =>
      (node !== this && isTagName(node, tagName)) ||
      (node.childNodes && node.childNodes.some((node) => f(node)));
    return f(this);
  }

  /**
   * not including this element
   * */
  hasElementByAnyTagName (tagNames: string[]): boolean {
    const f = (node: Node) =>
      (node !== this && isAnyTagName(node, tagNames)) ||
      (node.childNodes && node.childNodes.some((node) => f(node)));
    return f(this);
  }

  static parse (html: string /* TODO ,parent:Node*/): ParseResult<Node> {
    // const originalHtml = html;
    let node: HTMLElement;
    {
      const { res, data } = parseHTMLElementHead(html);
      if (data instanceof HTMLElement) {
        if (data.extraClosing) {
          // TODO distinct auto closing and extra closing
        }
      }
      node = data;
      html = res;
    }
    if (node.tagName.toLowerCase() === 'style') {
      return continueParseStyleFromHTMLElement(html, node);
    }
    if (node.tagName.toLowerCase() === 'script') {
      return continueParseScriptFromHTMLElement(html, node);
    }
    if (node.noBody || noBody(node.tagName)) {
      return { res: html, data: node };
    }
    node.childNodes = [];
    for (; html.length > 0; ) {
      const c = html[0];
      if (c === '<') {
        // meet open/close tag
        if (html.startsWith('</')) {
          // close node
          const selfCloseTagHtml = `</${node.tagName}>`;
          if (html.startsWith(selfCloseTagHtml)) {
            // normal close
            node.notClosed = false;
            html = html.substr(selfCloseTagHtml.length);
            break;
          } else {
            // auto repair close
            if (config.debug) {
              console.log('auto repair:', {
                /* tslint:disable:no-use-before-declare */
                level: parseLevel,
                /* tslint:enable:no-use-before-declare */
                expect: selfCloseTagHtml,
                html: html
                  .substr(0, 10)
                  .replace(/>.*/g, '>')
                  .split('\n')[0],
              });
            }
            const { res, data } = HTMLElement.parse(html);
            if (data instanceof HTMLElement) {
              if (noBody(data.tagName)) {
                node.childNodes.push(data);
                html = res;
                continue;
              }
            }
            node.notClosed = true;
            if (config.debug) {
              console.log('auto repair:', node);
            }

            break;
          }
        } else {
          // open node
          /* tslint:disable:no-use-before-declare */
          const { res, data } = parse(Document, html);
          /* tslint:enable:no-use-before-declare */
          node.childNodes.push(data);
          html = res;
        }
      } else {
        // meet body content
        const { res, data } = parse(Text, html);
        node.childNodes.push(data);
        html = res;
      }
    }
    return { res: html, data: node };
  }
}

/**
 * including the given node
 * */
export function getElementByTagName (
  node: Node,
  tagName: string,
): HTMLElement | undefined {
  if (node instanceof HTMLElement && node.isTagName(tagName)) {
    return node;
  }
  if (node.childNodes) {
    for (const child of node.childNodes) {
      const element = getElementByTagName(child, tagName);
      if (element) {
        return element;
      }
    }
  }
}

/**
 * including the given node
 * */
export function getElementsByTagName (
  node: Node,
  tagName: string,
): HTMLElement[] {
  const elements: HTMLElement[] = [];
  walkNode(node, (node) => {
    if (isTagName(node, tagName)) {
      elements.push(node as HTMLElement);
    }
  });
  return elements;
}

/**
 * including the given node
 * */
export function hasElementByTagName (node: Node, tagName: string): boolean {
  const f = (node: Node) =>
    isTagName(node, tagName) ||
    (node.childNodes && node.childNodes.some((node) => f(node)));
  return f(node);
}

/**
 * including the given node
 * */
export function hasElementByAnyTagName (
  node: Node,
  tagNames: string[],
): boolean {
  const f = (node: Node) =>
    isAnyTagName(node, tagNames) ||
    (node.childNodes && node.childNodes.some((node) => f(node)));
  return f(node);
}

export class Command extends HTMLElement {
  constructor () {
    super();
    this.noBody = true;
  }

  get outerHTML (): string {
    let html = `<!${this.tagName}`;
    html += this.attributes.outerHTML;
    html += `>`;
    return html;
  }

  get minifiedOuterHTML (): string {
    let html = `<!${this.tagName}`;
    html += this.attributes.minifiedOuterHTML;
    html += '>';
    return html;
  }

  static parse (html: string): ParseResult<HTMLElement> {
    assert(html[0] === '<', `expect open command tag ${s('<')}`);
    assert(html[1] === '!', `expect open command prefix ${s('<!')}`);
    html = html.substr(2);
    const command = new Command();
    {
      const { res, data } = parseTagName(html);
      command.tagName = data;
      html = res;
    }
    {
      const { res, data } = Attributes.parse(html);
      command.attributes = data;
      html = res;
    }
    assert(html[0] === '>', `expect close command tag ${s('>')}`);
    html = html.substr(1);
    return { res: html, data: command };
  }
}

export class Comment extends Command {
  tagName = '';
  content: string;

  clone (): this {
    const node = newObject(this);
    node.content = this.content;
    node.childNodes = node.childNodes
      ? this.childNodes.slice()
      : this.childNodes;
    return node;
  }

  get outerHTML (): string {
    return `<!--${this.content}-->`;
  }

  get minifiedOuterHTML (): string {
    return '';
  }

  static parse (html: string): ParseResult<Comment> {
    assert(html[0] === '<', `expect open comment tag ${s('<')}`);
    assert(html[1] === '!', `expect open comment prefix ${s('!')}`);
    assert(html[2] === '-', `expect open comment prefix ${s('-')}`);
    assert(html[3] === '-', `expect open comment prefix ${s('-')}`);
    html = html.substr(4);
    let acc = '';
    const { res } = forChar(html, (c, i, html) => {
      switch (c) {
        case '-':
          // if (html.startsWith('-->', i)) {
          if (html[i + 1] === '-' && html[i + 2] === '>') {
            return 'stop';
          }
          acc += c;
          break;
        default:
          acc += c;
      }
    });
    html = res;
    assert(html[0] === '-', `expect close comment suffix ${s('-')}`);
    assert(html[1] === '-', `expect close comment suffix ${s('-')}`);
    assert(html[2] === '>', `expect close comment suffix ${s('>')}`);
    html = html.substr(3);
    const comment = new Comment();
    comment.content = acc;
    return { res: html, data: comment };
  }
}

function parseStyleComment (html: string): ParseResult<string> {
  assert(html[0] === '/', `expect start style comment prefix ${s('/')}`);
  assert(html[1] === '*', `expect start style comment prefix ${s('*')}`);
  html = html.substr(2);
  let acc = '';
  const { res } = forChar(html, (c, i, html) => {
    if (c === '*' && html[i + 1] === '/') {
      return 'stop';
    }
    acc += c;
  });
  html = res;
  assert(html[0] === '*', `expect start style comment suffix ${s('*')}`);
  assert(html[1] === '/', `expect start style comment suffix ${s('/')}`);
  return { res: html.substr(2), data: acc };
}

function parseStyleBody (
  html: string,
  closeTagHTML: string,
): ParseResult<string> {
  let acc = '';
  const { res } = forChar(html, (c, i, html) => {
    if (c === '/' && html[i + 1] === '*') {
      const { res, data } = parseStyleComment(html.substr(i));
      acc += '/*' + data + '*/';
      return { res };
    }
    // TODO support edge case of different cases, e.g. <style></STYLE>
    if (html.startsWith(closeTagHTML, i)) {
      return 'stop';
    }
    acc += c;
  });
  return { res, data: acc };
}

export abstract class DSLElement extends HTMLElement {
  get textContent (): string {
    return this._textContent;
  }

  set textContent (value: string) {
    this._textContent = value;
  }

  get outerHTML (): string {
    let html = `<${this.tagName}`;
    html += this.attributes.outerHTML;
    if (this.noBody) {
      html += '/>';
      return html;
    }
    html += '>';
    html += this.textContent;
    html += `</${this.tagName}>`;
    return html;
  }

  get minifiedOuterHTML (): string {
    let html = `<${this.tagName}`;
    html += this.attributes.minifiedOuterHTML;
    if (this.noBody) {
      html += '/>';
      return html;
    }
    html += '>';
    html += this.minifiedTextContent;
    html += `</${this.tagName}>`;
    return html;
  }
  abstract minifiedTextContent: string;
  private _textContent: string;

  clone (): this {
    const node = newObject(this);
    node.textContent = this.textContent;
    node.childNodes = node.childNodes
      ? this.childNodes.slice()
      : this.childNodes;
    return node;
  }
}

export class Style extends DSLElement {
  get minifiedTextContent (): string {
    let acc = '';
    forChar(this.textContent, (c, i, html) => {
      switch (c) {
        case '/': {
          if (html[i + 1] === '*') {
            i += 2;
            let end = html.indexOf('*/', i);
            if (end === -1) {
              end = html.length;
            }
            return { res: html.substr(end) };
          }
          acc += c;
          break;
        }
        case '"':
        case "'": {
          const { res, data } = parseString(html.substr(i), c);
          acc += data;
          return { res };
        }
        default: {
          if (
            c.trim().length !== 0 ||
            acc.length === 0 ||
            acc[acc.length - 1].trim().length !== 0
          ) {
            acc += c;
          }
        }
      }
    });
    return acc;
  }
}

function continueParseStyleFromHTMLElement (
  html: string,
  node: HTMLElement,
): ParseResult<Style> {
  const style = new Style();
  Object.assign(style, node);
  if (style.noBody) {
    return { res: html, data: style };
  }
  const closeTagHTML = `</${node.tagName}>`;
  {
    const { res, data } = parseStyleBody(html, closeTagHTML);
    style.textContent = data;
    html = res;
  }
  {
    const { res } = parseHTMLElementTail(html, style, closeTagHTML);
    html = res;
  }
  return { res: html, data: style };
}

export class Script extends DSLElement {
  get minifiedTextContent (): string {
    let acc = '';
    forChar(this.textContent, (c, i, html) => {
      switch (c) {
        case '/': {
          const nextC = html[i + 1];
          if (nextC === '/') {
            let end = html.indexOf('\n', i);
            if (end === -1) {
              end = html.length;
            }
            return { res: html.substr(end) };
          }
          if (nextC === '*') {
            let end = html.indexOf('*/', i);
            if (end === -1) {
              end = html.length;
            }
            return { res: html.substr(end) };
          }
          acc += c;
          break;
        }
        case '"':
        case "'": {
          const { res, data } = parseString(html.substr(i), c);
          acc += data;
          return { res };
        }
        case '`': {
          const { res, data } = parseStringWithDashQuote(html.substr(i));
          acc += data;
          return { res };
        }
        default: {
          if (
            acc.length === 0 ||
            c.trim().length !== 0 ||
            acc[acc.length - 1].trim().length !== 0
          ) {
            acc += c;
          }
        }
      }
    });
    return acc;
  }
}

function parseStringWithDashQuote (html: string): ParseResult<string> {
  assert(
    html[0] === '`',
    new Error('expect string with dash quote starting quote'),
  );
  let acc = '';
  const { res } = forChar(html.substr(1), (c, i, html) => {
    if (c === '$' && html[i + 1] === '{') {
      const { res, data } = parseScriptBody(html.substr(i + 2), '}');
      acc += '${' + data;
      if (res[0] === '}') {
        acc += '}';
        return { res: res.substr(1) };
      }
      return { res };
    }
    if (c === '`') {
      return 'stop';
    }
    acc += c;
  });
  acc = '`' + acc + '`';
  return { res: res.substr(1), data: acc };
}

function parseScriptBody (
  html: string,
  closeTagHTML: string,
): ParseResult<string> {
  let acc = '';
  const { res } = forChar(html, (c, i, html) => {
    switch (c) {
      case '"':
      case "'": {
        const { res, data } = parseString(html.substr(i), c);
        acc += data;
        return { res };
      }
      case '`': {
        const { res, data } = parseStringWithDashQuote(html.substr(i));
        acc += data;
        return { res };
      }
      case '/': {
        if (html[i + 1] === '/') {
          // single line comment
          html = html.substr(i + 2);
          let end = html.indexOf('\n');
          if (end === -1) {
            end = html.length;
          }
          acc += '//' + html.substring(0, end);
          return { res: html.substr(end) };
        }
        if (html[i + 1] === '*') {
          // multiple line comment
          html = html.substring(i + 2);
          let end = html.indexOf('*/');
          if (end === -1) {
            end = html.length;
          }
          acc += '/*' + html.substring(0, end) + '*/';
          return { res: html.substring(end + 2) };
        }
        // detect regex
        {
          let nextSlash = i + 1;
          for (; nextSlash < html.length; ) {
            if (html[nextSlash] === '/') {
              break;
            }
            if (html[nextSlash] === '\\') {
              nextSlash += 2;
            } else {
              nextSlash++;
            }
          }
          if (nextSlash !== -1 && nextSlash < html.length) {
            const end = nextSlash + 1;
            const regexp = html.substring(i, end);
            try {
              // tslint:disable:no-eval
              // TODO parse regex instead of using eval
              const x = eval(regexp);
              // tslint:enable:no-eval
              if (x instanceof RegExp) {
                acc += regexp;
                return { res: html.substr(end) };
              }
              // not regex
            } catch (e) {
              // not regex
            }
          }
        }
        // not comment nor regex
        acc += c;
        break;
      }
      default:
        if (html.startsWith(closeTagHTML, i)) {
          return 'stop';
        }
        acc += c;
    }
  });
  return { res, data: acc };
}

function parseJSONScriptBody (
  html: string,
  closeTagHTML: string,
): ParseResult<string> {
  // TODO escape string
  let end = html.indexOf(closeTagHTML);
  if (end === -1) {
    end = html.length;
  }
  const acc = html.substr(0, end);
  const res = html.substr(end);
  return { res, data: acc };
}

function continueParseScriptFromHTMLElement (
  html: string,
  node: HTMLElement,
): ParseResult<Script> {
  const script = new Script();
  Object.assign(script, node);
  if (script.noBody) {
    return { res: html, data: script };
  }
  const closeTagHTML = `</${node.tagName}>`;
  if (
    script.attributes.hasName('type') &&
    script.attributes.getValue('type') === 'application/json'
  ) {
    const { res, data } = parseJSONScriptBody(html, closeTagHTML);
    script.textContent = data;
    html = res;
  } else {
    const { res, data } = parseScriptBody(html, closeTagHTML);
    script.textContent = data;
    html = res;
  }
  {
    const { res } = parseHTMLElementTail(html, script, closeTagHTML);
    html = res;
  }
  return { res: html, data: script };
}

export class Document extends Node {
  childNodes: Node[] = [];

  clone (): this {
    const node = newObject(this);
    node.childNodes = node.childNodes
      ? this.childNodes.slice()
      : this.childNodes;
    return node;
  }

  get outerHTML (): string {
    return this.childNodes.map((node) => node.outerHTML).join('');
  }

  get minifiedOuterHTML (): string {
    return this.childNodes.map((node) => node.minifiedOuterHTML).join('');
  }

  get textContent (): string {
    return this.childNodes.map((node) => node.textContent).join('');
  }

  static parse (html: string): ParseResult<Node> {
    if (html[0] === '<') {
      if (html[1] === '!') {
        if (html[2] === '-' && html[2] === '-') {
          return parse(Comment, html);
        }
        // not '<!--'
        return parse(Command, html);
      }
      // not '<!'
      return parse(HTMLElement, html);
    }
    // not '<'
    return parse(Text, html);
  }
}

let parseLevel = 0;

function parse<T extends Node> (
  context: NodeConstructor<T>,
  html: string,
): ParseResult<T> {
  const prefix = ' '.repeat(parseLevel * 2);
  if (config.dev) {
    console.log(prefix + 'enter context:', context.name);
  }
  if (config.debugStream) {
    console.log('|>>>:html(first-10)|', html.substr(0, 10), '|html:<<<|');
    /*
    console.log({
      len: html.length,
      s: s(html),
      0: html.charCodeAt(0),
      1: html.charCodeAt(1),
    });
    */
  }
  parseLevel++;
  const res = context.parse(html);
  parseLevel--;
  if (config.dev) {
    console.log(prefix + 'leave context:', context.name);
  }
  if (config.debugStream) {
    console.log('|>>>:res(first-10)|', res.res.substr(0, 10), '|res:<<<|');
    console.log('|>>>:data|');
    logNode(res.data);
    console.log('|data:<<<|');
  }
  return res;
}

export function parseHtmlDocument (html: string, skipTrim = false): Document {
  if (!skipTrim) {
    // to escape 5 leading 0xFEFF
    html = html.trimLeft();
  }
  const root = new Document();
  for (; html.length > 0; ) {
    const c = html[0];
    const p = (context: NodeConstructor<any>) => {
      const { res, data } = parse(context, html);
      root.childNodes.push(data);
      html = res;
    };
    switch (c) {
      case '<':
        p(Document);
        break;
      default:
        p(Text);
    }
  }
  return root;
}

/**@deprecated*/
export let parseHtml = parseHtmlDocument;

/* for debug */
export function wrapNode (node: Node) {
  const constructor = ((node as any) as HTMLElement)
    .constructor as NodeConstructor<any>;
  const name = constructor.name;
  return {
    name,
    node: {
      ...node,
      childNodes: node.childNodes
        ? node.childNodes.map((node) => wrapNode(node))
        : [],
    },
  };
}

export function logNode (node: Node) {
  console.log(JSON.stringify(wrapNode(node), null, 2));
}

// for easy reference
export let NodeClasses: Array<typeof Node> = [
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
