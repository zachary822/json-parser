import {
  altParser,
  apParser,
  append,
  bindMaybe,
  charP,
  choice,
  Cons,
  curry,
  fmapMaybe,
  fmapParser,
  fst,
  type List,
  listToArray,
  listToStr,
  lookup,
  manyParser,
  type Maybe,
  maybeHead,
  Nil,
  optional,
  Pair,
  type Parser,
  pureList,
  pureParser,
  satisfyP,
  sepBy,
  seqLeftParser,
  seqRightParser,
  snd,
  someParser,
  stringP,
  strToList,
  tail,
} from "@fun/parser-combinator";

// helper parsers

const isSpace = (x: string): boolean => /[ \n\r\t]/.test(x);
const space: Parser<List<string>> = manyParser(satisfyP(isSpace));

const isDigit = (x: string) => /\d/.test(x);
const isNonZeroDigit = (x: string) => /[1-9]/.test(x);
const isUnescapedChar = (a: string) => !/["\\\b\f\n\r\t]/.test(a);
const isHexDigit = (a: string) => /[0-9A-Fa-f]/.test(a);

const unicodeEscape = fmapParser(
  (xs: List<string>) => String.fromCharCode(parseInt(listToStr(xs), 16)),
  seqRightParser(
    charP("u"),
    apParser(
      apParser(
        apParser(
          fmapParser(
            (a) => (b) => (c) => (d) => Cons(a, Cons(b, Cons(c, pureList(d)))),
            satisfyP(isHexDigit),
          ),
          satisfyP(isHexDigit),
        ),
        satisfyP(isHexDigit),
      ),
      satisfyP(isHexDigit),
    ),
  ),
);

const escapeMap: List<Pair<string, string>> = Cons(
  Pair('"', '"'),
  Cons(
    Pair("\\", "\\"),
    Cons(
      Pair("/", "/"),
      Cons(
        Pair("b", "\b"),
        Cons(
          Pair("f", "\f"),
          Cons(
            Pair("n", "\n"),
            Cons(Pair("r", "\r"), Cons(Pair("t", "\t"), Nil)),
          ),
        ),
      ),
    ),
  ),
);

const escapedChar = seqRightParser(
  charP("\\"),
  altParser(
    (input) =>
      fmapMaybe(
        (c: string) => Pair(tail(input), c),
        bindMaybe(
          maybeHead(input),
          (h) => lookup(h, escapeMap),
        ),
      ),
    unicodeEscape,
  ),
);

// JSON parser

export type JsonValue =
  | string
  | boolean
  | number
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const stringLiteral = seqLeftParser(
  seqRightParser(
    charP('"'),
    manyParser(altParser(satisfyP(isUnescapedChar), escapedChar)),
  ),
  charP('"'),
);

const jsonString: Parser<JsonValue> = fmapParser(listToStr, stringLiteral);

const jsonBool = altParser(
  seqRightParser(stringP(strToList("true")), pureParser(true)),
  seqRightParser(stringP(strToList("false")), pureParser(false)),
);

const intLiteral = apParser(
  fmapParser(
    (m: Maybe<string>) => (xs: List<string>) => m(xs, (x) => Cons(x, xs)),
    optional(charP("-")),
  ),
  altParser(
    fmapParser(
      pureList,
      charP("0"),
    ),
    apParser(
      fmapParser(
        curry(Cons<string>),
        satisfyP(isNonZeroDigit),
      ),
      manyParser(satisfyP(isDigit)),
    ),
  ),
);

const fractionLiteral = apParser(
  fmapParser(
    curry(Cons<string>),
    charP("."),
  ),
  someParser(satisfyP(isDigit)),
);

const exponentLiteral = apParser(
  fmapParser(
    curry(Cons<string>),
    altParser(charP("e"), charP("E")),
  ),
  apParser(
    fmapParser(
      (m: Maybe<string>) => (xs: List<string>) => m(xs, (x) => Cons(x, xs)),
      optional(altParser(charP("-"), charP("+"))),
    ),
    someParser(satisfyP(isDigit)),
  ),
);

const jsonNumber = fmapParser(
  (xs: List<string>) => +listToStr(xs),
  apParser(
    fmapParser(
      (xs: List<string>) => (mys: Maybe<List<string>>) =>
        mys(xs, (ys: List<string>) => append(xs, ys)),
      apParser(
        fmapParser(
          (xs) => (mys: Maybe<List<string>>) =>
            mys(xs, (ys: List<string>) => append(xs, ys)),
          intLiteral,
        ),
        optional(fractionLiteral),
      ),
    ),
    optional(exponentLiteral),
  ),
);

const jsonNull = seqRightParser(stringP(strToList("null")), pureParser(null));

const jsonArray: Parser<JsonValue[]> = (input) =>
  fmapParser(
    (xs: List<JsonValue>) => listToArray(xs),
    seqLeftParser(
      seqRightParser(
        charP("["),
        seqRightParser(
          space,
          sepBy(
            jsonValue,
            seqLeftParser(seqRightParser(space, charP(",")), space),
          ),
        ),
      ),
      seqLeftParser(space, charP("]")),
    ),
  )(input);

const kvPair = (input: List<string>) =>
  apParser(
    fmapParser(
      curry(Pair<List<string>, JsonValue>),
      seqLeftParser(stringLiteral, space),
    ),
    seqRightParser(charP(":"), seqRightParser(space, jsonValue)),
  )(input);

const jsonObject = fmapParser(
  (xs: List<Pair<List<string>, JsonValue>>) =>
    xs(
      (h, t) => ({ ...t, [listToStr(fst(h))]: snd(h) }),
      {} as { [key: string]: JsonValue },
    ),
  seqLeftParser(
    seqLeftParser(
      seqRightParser(
        seqRightParser(charP("{"), space),
        sepBy(kvPair, seqRightParser(space, seqLeftParser(charP(","), space))),
      ),
      space,
    ),
    charP("}"),
  ),
);

export const jsonValue: Parser<JsonValue> = choice(
  Cons(
    jsonString,
    Cons(
      jsonNumber,
      Cons(jsonObject, Cons(jsonArray, Cons(jsonBool, Cons(jsonNull, Nil)))),
    ),
  ),
);

export {
  fst,
  type List,
  listToStr,
  type Maybe,
  type Pair,
  type Parser,
  snd,
  strToList,
};
