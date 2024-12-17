# JSON Parser

```typescript
const input = strToList('"abc"');

const maybeParse = jsonValue(input);

// retrieving the value from Maybe
const result = maybeParse(
  // default return value if parser doesn't match input
  null,
  // the javascript object from the JSON string
  (x) => snd(x),
);
```
