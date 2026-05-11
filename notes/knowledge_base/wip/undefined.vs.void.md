# Void vs Undefined

> `void` vs `undefined` Use:

```ts
undefined
```

When a function may intentionally return “no value” as part of its runtime result.

Use:

```ts
void
```

when callers should ignore the return value entirely.

---

## Prefer `undefined` in unions

```ts
type Result = string | undefined
```

NOT:

```ts
type Result = string | void
```

Reason:

- `undefined` is an actual runtime value
- `void` is a TypeScript intent marker
- many lint/type rules reject `void` inside unions
- `undefined` narrows more predictably

---

## Prefer `void` for side-effect functions

```ts
function log(message: string): void {
  console.log(message)
}
```

Reason:

- communicates “return value should not be used”
- clearer API intent
- aligns with TypeScript conventions

---

## Runtime semantics

`void` does NOT mean “returns nothing”.

At runtime:

```ts
return
```

and:

```ts
return undefined
```

are effectively the same.

The distinction is type intent.

---

## Practical rule

| Situation                 | Use              |
| ------------------------- | ---------------- |
| optional/missing result   | `undefined`      |
| unions                    | `undefined`      |
| maybe-return helper       | `T \| undefined` |
| side-effect-only function | `void`           |
| callback ignored return   | `void`           |

---

## Examples

```ts
export function findUser(id: string): User | undefined {
  return users.get(id)
}
```

```ts
export function logUser(user: User): void {
  console.log(user)
}
```
