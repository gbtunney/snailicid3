# Technical Types Vocabulary & Typescript Cheatsheet

## Table of Contents

- [Type Reference Table](#type-reference-table)
- [Vocabulary - Technical Types](#vocabulary---technical-types)
  - [Scalar (One Value, No Structure)](#scalar-one-value-no-structure)
  - [Enum (Scalar with a Fixed Allowed Set)](#enum-scalar-with-a-fixed-allowed-set)
  - [Object (Fixed Structure, Known Fields)](#object-fixed-structure-known-fields)
  - [List (Ordered Collection of Items)](#list-ordered-collection-of-items)
  - [Map / Dictionary (Key → Value Lookup, Variable Keys)](#map--dictionary-key--value-lookup-variable-keys)
  - [Notes: Object vs Map / Dictionary](#notes-object-vs-map--dictionary)
- [Conceptual Types Deep Dive](#conceptual-types-deep-dive)
  - [Time-Related](#time-related)
    - [Date](#date)
    - [DateTime](#datetime)
    - [Duration](#duration)
    - [Interval](#interval)
  - [Key Distinctions (Summary Table)](#key-distinctions-summary-table)

## Type Reference Table

> **Warning** : _This table is not exhaustive and serves as a general reference. The actual implementation may
> vary depending on specific use cases, system, requirements, or platform constraints. Always validate against
> your system's requirements and data models._

| Conceptual Type     | Meaning                           | Common Raw Types                                 | Typical UI Types             | Multi-Value? |
| ------------------- | --------------------------------- | ------------------------------------------------ | ---------------------------- | ------------ |
| Identifier          | Stable ID for a thing             | `string, number`                                 | text, read-only-text         | Single       |
| Reference           | Points to another entity          | `string, { id: string, label: string }`          | entity-picker, combobox      | Single       |
| Name                | Human-facing title                | `string`                                         | text                         | Single       |
| Description / Notes | Longer free text                  | `string`                                         | textarea, richtext           | Single       |
| Code / Slug         | Constrained token                 | `string`                                         | text, code                   | Single       |
| URL                 | Web/resource locator              | `string`                                         | text                         | Single       |
| Email               | Email address                     | `string`                                         | text                         | Single       |
| Phone               | Phone number                      | `string`                                         | text                         | Single       |
| Flag                | True/false indicator              | `boolean`                                        | switch, checkbox             | Single       |
| Status              | Closed set state (enum)           | `Enum<string>`                                   | select, radio-group          | Single       |
| Mode                | Behavior selector (enum)          | `Enum<string>`                                   | segmented-control, select    | Single       |
| Count               | Discrete quantity                 | `number`                                         | number-input, stepper        | Single       |
| Percentage          | Ratio value                       | `number`                                         | number-input, slider         | Single       |
| Rating              | Bounded score (enum)              | `number`, `Enum<number>`                         | slider, select               | Single       |
| Money               | Amount + currency                 | `{ amount: number, currency: string }`           | number-input + select        | Single       |
| Measurement         | Value + unit                      | `{ value: number, unit: string }`                | number-input + select        | Single       |
| Date                | Calendar date                     | `string`                                         | date-picker                  | Single       |
| Time                | Time of day                       | `string`                                         | time-picker                  | Single       |
| DateTime            | Timestamp                         | `string`, `number`                               | datetime-picker              | Single       |
| Duration            | Length of time                    | `number,string,{ value: number, unit: string }`  | duration-input               | Single       |
| Interval            | Start/end span                    | `{ start: string\|number, end: string\|number }` | datetime-picker (x2)         | Single       |
| Tag                 | Label for grouping                | `string, Array<string>`                          | tag-input, multi-select      | List         |
| Labels / Metadata   | Arbitrary key-value props         | `Record<string, string>`                         | key-value-editor             | Map          |
| Event               | Record of something that happened | `{ [key: string]: any }`                         | table-editor, repeater       | List         |
| File                | File object/ref                   | `Binary`, `{ id: string, name: string }`         | file-upload                  | Single       |
| Image               | Image file                        | Same as File                                     | image-upload                 | Single       |
| Enum                | Closed set of predefined values   | `Enum<string\|number>`                           | select, radio-group          | Single       |
| Multi-Select Enum   | List of predefined values         | `Array<Enum<string>>`                            | multi-select, checkbox-group | List         |

### Typescript Specific Reference

?? TODO: IDK WHERE TO PUT THIS ??

To better understand the raw data types used in this above table, here are some common data type definitions:

- **`boolean`:** Represents a true/false value, often used for flags or binary states.
- **`{ ... }`:** A structured object with named fields (e.g., `{ id: string, label: string }`).
- **`T[]` or `Array<T>`:** An ordered list of items of type `T`.
- **`Record<string, T>`:** A dictionary or map where keys are strings and values are of type `T`.

## Vocabulary - Technical Types

### Scalar (_One Value, No Structure_)

- A **scalar** is a single value. It is not nested, not iterable, and not a container.

#### Examples

- `string`
- `number`
- `boolean`
- `null` (rare; prefer `T | null`)
- Literal unions like `'a' | 'b'`
- Date strings: `2023-10-01`
- Time strings: `14:30:00`
- Email strings: `example@example.com`
- URL strings: `https://example.com`

> **Non-examples**: _objects, lists, maps._

---

### Enum (Scalar with a Fixed Allowed Set)

- An **enum** is a scalar type with a fixed set of allowed values.

#### Examples

- **String literal union:** `'a' | 'b' | 'c'`
- **Number literal union:** `1 | 2 | 3`

---

### Object (Fixed Structure, Known Fields)

- An **object** has a fixed structure with known fields. Each field has a specific meaning.

#### Examples

- **Inline object:** `{ id: string; name: string }`
- **Named object:** `type X = { id: string; name: string }`

---

### List (Ordered Collection of Items)

- A **list** is an ordered collection of items.

#### Examples

- **Array:** `T[]`
- **Readonly array:** `readonly T[]`
- **Tuple (fixed length):** `[T1, T2]`

---

### Map / Dictionary (Key → Value Lookup, Variable Keys)

- A **map** or **dictionary** is a key-value lookup structure with variable keys.

#### Examples

- `Record<string, T>`: A map where keys are strings and values are of type `T`.
- `Record<'k1' | 'k2', T>`: A map with a known set of keys, but still map-shaped.

---

### Notes: Object vs Map / Dictionary

- **Object:** Known fields, fixed meaning per field.
  - **Example**: `{ id: string; name: string }`
- **Map / Dictionary:** Variable keys, uniform value type.
  - **Example**: `Record<string, string>` where keys are data.

##### **Rule of Thumb:**

> If keys are part of the schema → `Object` If keys are part of the data → `Map`

---

## Conceptual Types Deep Dive

### Time-Related

Time-related concepts are often confused. They are **siblings**, not parent/child.

```text
Time-related
├─ Date
├─ DateTime
├─ Duration
└─ Interval
```

---

#### Date

**What it represents:**

- A calendar day

**Questions it answers:**

- _“On what day?”_

**Examples:**

- `2026-01-10`

**Common technical representations:**

- ISO 8601 date string (`YYYY-MM-DD`)

**Typical UI:**

- date-picker

---

#### DateTime

**What it represents:**

- A precise moment in time

**Questions it answers:**

- _“At what exact moment?”_

**Examples:**

- `2026-01-10T14:32:05Z`

**Common technical representations:**

- ISO 8601 datetime string
- Epoch milliseconds (`number`)

**Typical UI:**

- datetime-picker

---

#### Duration

**What it represents**

- A length of time

**Questions it answers:**

- _“How long?”_

**Examples:**

- 5 minutes
- 2 hours
- 7 days

**Common technical representations:**

- **Number-based** (most common)
  - milliseconds or seconds
  - Example: `3600000` (1 hour)

- **ISO 8601 duration string**
  - Example: `PT30M`, `P7D`

- **Structured object**

```ts
{ value: 5, unit: 'minutes' }
```

- **Typical UI:**

- duration input
- number + unit selector
- slider + unit

---

#### Interval

**What it represents:**

- A span between two points in time

**Questions it answers:**

- _From when to when?_

**Examples:**

- start + end datetime

**Common representations:**

```ts
{ start: DateTime, end: DateTime}
```

---

#### Key Distinctions (Summary Table)

| Concept  | Answers              | Example             |
| -------- | -------------------- | ------------------- |
| Date     | _What day?_          | `2026-01-10`        |
| DateTime | _What moment?_       | `2026-01-10T14:32Z` |
| Duration | _How long?_          | `30 minutes`        |
| Interval | _From when to when?_ | `start + end`       |
