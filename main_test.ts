import { assertEquals } from "@std/assert";
import { assertSpyCallArgs, assertSpyCalls, spy } from "@std/testing/mock";
import { fst, jsonValue, listToStr, snd, strToList } from "./main.ts";

Deno.test("should return null for bad input", () => {
  const thing = strToList('"yay');

  const func = spy();

  jsonValue(thing)(null, (x) => func(snd(x)));

  assertSpyCalls(func, 0);
});

Deno.test("should return string for good input", () => {
  const thing = strToList('"yay2"');

  const func = spy();

  jsonValue(thing)(null, (x) => func(snd(x)));

  assertSpyCallArgs(func, 0, ["yay2"]);
});

for (
  const [input, result] of [
    ['"yay\\n"', "yay\n"],
    ['"\\u0061"', "a"],
    ['"\\u0061bc"', "abc"],
    ['"\\u0061bc"aa', "abc"],
    ['"\\/"', "/"],
    ['"\\""', '"'],
    ['"\\uD83D\\uDCA9"', "💩"],
  ]
) {
  Deno.test(
    `should return string '${result}' for input with escape '${input}'`,
    () => {
      const thing = strToList(input);

      assertEquals(
        jsonValue(thing)(null, (x) => snd(x)),
        result,
      );
    },
  );
}

Deno.test("should return remaining input", () => {
  const thing = strToList('"yay2"rest');

  assertEquals(
    jsonValue(thing)(null, (x) => listToStr(fst(x))),
    "rest",
  );
});

Deno.test("should return null for good input", () => {
  const thing = strToList("null");

  const func = spy();

  jsonValue(thing)(null, (x) => func(snd(x)));

  assertSpyCallArgs(func, 0, [null]);
});

for (const s of ["true", "false"]) {
  Deno.test(`should return ${s}`, () => {
    const thing = strToList(s);

    assertEquals(
      jsonValue(thing)(null, (x) => snd(x)),
      JSON.parse(s),
    );
  });
}

Deno.test("should return array for good input", () => {
  const thing = strToList('[  true, "yay", 12, -12, 0.12, 1.2e-1 ]');

  assertEquals(
    jsonValue(thing)(null, (x) => snd(x)),
    [true, "yay", 12, -12, 0.12, 0.12],
  );
});

Deno.test("should return sentinel for array with bad number", () => {
  const thing = strToList('[  true, "yay", 12, -012 ]');

  const func = spy();

  jsonValue(thing)(null, (x) => func(snd(x)));

  assertSpyCalls(func, 0);
});

Deno.test("should return int for good input", () => {
  const thing = strToList("123abc");

  assertEquals(
    jsonValue(thing)(null, (x) => snd(x)),
    123,
  );
});

Deno.test("should return float for good input", () => {
  const thing = strToList("123.25abc");

  assertEquals(
    jsonValue(thing)(null, (x) => snd(x)),
    123.25,
  );
});

Deno.test("should return 0 for number with leading 0", () => {
  const thing = strToList("0123.25abc");

  const func = spy();

  jsonValue(thing)(null, (x) => func(listToStr(fst(x)), snd(x)));

  assertSpyCallArgs(func, 0, ["123.25abc", 0]);
});

Deno.test("should return float with exponent for good input", () => {
  const thing = strToList("1.2e-2abc");

  assertEquals(
    jsonValue(thing)(null, (x) => snd(x)),
    0.012,
  );
});

Deno.test("should return object for good input", () => {
  const thing = strToList('{ "abc" : 123   }');

  assertEquals(
    jsonValue(thing)(null, (x) => snd(x)),
    { abc: 123 },
  );
});

Deno.test("should return default for bad input", () => {
  const thing = strToList('{"abc": }');

  const func = spy();

  assertEquals(
    jsonValue(thing)(null, (x) => func(snd(x))),
    null,
  );

  assertSpyCalls(func, 0);
});

Deno.test("should return default for string with control codes", () => {
  const thing = strToList('"ab\u0000"');

  const func = spy();

  assertEquals(
    jsonValue(thing)(null, (x) => func(snd(x))),
    null,
  );

  assertSpyCalls(func, 0);
});

Deno.test("should return default for string with bad unicode escape", () => {
  const thing = strToList('"ab\\ud83d\\udca9"');

  const func = spy();

  assertEquals(
    jsonValue(thing)(null, (x) => func(snd(x))),
    null,
  );

  assertSpyCalls(func, 0);
});
