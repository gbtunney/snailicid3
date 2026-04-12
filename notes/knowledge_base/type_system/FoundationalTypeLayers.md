# Foundational Type Layers

This document provides a detailed reference for understanding and designing attributes using three
**foundational** type layers: **Conceptual**, **Technical**, and **User Interface**. By separating these
layers, we can ensure flexibility and adaptability across different systems, platforms, and contexts.

---

## Definitions

- **Conceptual Type**: _Describes the real-world meaning of the value_, independent of how it is stored or
  displayed. Conceptual types are **human-meaningful**, **stable** across systems, and **portable** between
  platforms.
- **Technical Type**: _Describes the **structural** representation of the value in code or data_. Technical
  types focus on the data's **shape** and **format**, rather than its meaning or how it is presented to users.
- **User Interface Type**: _Describes how the value is presented to or interacted with by a human user_. User
  Interface (**_UI_**) types define **affordances**—design features that provide **visual** or **interactive**
  cues to suggest how user can interact with an element (e.g., _buttons_, _sliders_, _text inputs_).

---

## Table of Contents

- [Definitions](#definitions)
- [Type Layers](#type-layers)
  - [Conceptual Type (Meaning)](#conceptual-type-meaning)
    - [Examples](#examples)
  - [Technical Type (Structure)](#technical-type-structure)
    - [Examples](#examples-1)
  - [User Interface Type (Interactive)](#user-interface-type-interactive)
    - [Examples](#examples-2)
- [Additional Options](#additional-options)
  - [Presence and Defaults](#presence-and-defaults)
  - [Type Constraints Reference](#type-constraints-reference)

---

## Type Layers

### Conceptual Type (Meaning)

> **_“What kind of thing is this?”_**

A **conceptual type** describes the **real-world meaning** of a value, independent of how it is stored,
transmitted, or rendered. This layer of type focuses on the _essence_ of the data, rather than its technical
or user interface representation.

### Examples

- **Date**: _A calendar date._
- **DateTime**: _A specific point in time._
- **Duration**: _A length of time._
- **Identifier**: _A stable ID for a thing._
- **Boolean flag**: _A true/false indicator._
- **Reference**: _Points to another entity._
- **Measurement**: _A value with a unit._
- **Money**: _An amount with a currency._
- **File**: _A file object or reference._
- **Enum**: _A closed set of predefined values._

---

### Technical Type (Structure)

> **_“What shape is this data?”_**

A **technical type** describes the structural form that a system uses to store or transmit the raw data value.
It focuses on the data's **shape** and **format**, rather than its meaning or how it is presented to users.
This layer includes **scalar types**, **containers**, and **primitive families**. These are _essential_ for
defining how data is **stored**, **validated**, and **transmitted** between systems. Some examples include:

- **Primitive Families**:
  - **Text**: _A string of characters._
  - **Number**: _A numeric value (integer or floating-point)._
  - **Boolean**: _A true/false value._
  - **Binary**: _A sequence of bytes or blobs._
  - **Null**: _An absence marker, usually paired with another type._

- **Structures**:
  - **Scalar**: _A single value (e.g., `Text`, `Number`, `Boolean`, `Binary`)._
  - **Enum**: _A scalar with a fixed set of allowed values (e.g., `Enum<Text>` or `Enum<Number>`)._
  - **Object / Record**: _A structured collection of fields (e.g., `Object{ field: T, ... }`)._
  - **List / Sequence**: _An ordered collection of items (e.g., `List<T>`)._
  - **Tuple (fixed)**: _A fixed-length collection of items (e.g., `Tuple<T1, T2, ...>`)._
  - **Map / Dictionary**: _A key-value lookup structure (e.g., `Map<Text, T>`)._

#### Examples

- `Text`
- `Enum<Text>`
- `List<Text>`
- `Object{ id: Text, label: Text }`
- `Map<Text, Text>`

---

### User Interface Type (Interactive)

> **_“How should someone input or read this?”_**

A **User Interface (UI) Type** describes how the value is **presented** to a human user and guides their
behavior. It focuses on the **experience** of interacting with the data, rather than how it is stored or
structured. It defines **affordances**—design features that use **visual or interactive cues** to help users
understand how to engage with an element. For example:

- A **button** suggests it can be clicked.
- A **slider** suggests it can be dragged to adjust a value.
- A **text input field** suggests it can be typed into.

#### Examples

- **Text**: _text (single-line), textarea (multi-line), richtext, code_
- **Choice**: _select, multi-select, radio-group, checkbox-group, combobox_
- **Boolean**: _switch, checkbox_
- **Number**: _number-input, stepper, slider_
- **Time**: _date-picker, time-picker, datetime-picker, duration-input_
- **Files**: _file-upload, image-upload_
- **Collections**: _repeater, table-editor, key-value-editor_
- **Display**: _read-only-text, badge, json-viewer_

---

## Additional Options

### Presence and Defaults

> These are orthogonal to the TS type.

- **Required:** The field must be present in the object. (TS: omit ?)
- **Optional:** The field may be absent. (TS: field?: T)
- **Default:** Value assumed if missing. Does not imply required.
- **other**:
  - **Nullable:** Field may explicitly be null. `T | null`
  - **Optional + Nullable:** `{ field?: T | null}`

### Type Constraints Reference

> **Warning** : _This list of constraints is not exhaustive and serves as a general reference. Always validate
> against your system's requirements and data models._

- **Text (string):**
  - `minLength`: Minimum length of the string.
  - `maxLength`: Maximum length of the string.
  - `pattern`: Regex pattern the string must match.
  - `trim`: Remove leading/trailing whitespace.
  - `lowercase / uppercase`: Enforce case policy.
  - `oneOf`: Allowed values for enums.
  - `nonEmpty`: Ensures the string is not empty.
  - `unique`: Ensures uniqueness across records.

- **Numbers (number):**
  - `integerOnly`: Must be an integer.
  - `min / max`: Minimum and maximum value.
  - `exclusiveMin / exclusiveMax`: Strictly less/greater than.
  - `multipleOf`: Value must be a multiple of this number.

- **Dates/times (string):**
  - `minDate / maxDate`: Earliest/latest allowed date.
  - `notInFuture`: Date must not be in the future.
  - `notInPast`: Date must not be in the past.

- **Lists** `T[]`
  - `minItems` / `maxItems`: Minimum and maximum number of items allowed in the list.
  - `uniqueItems`: Ensures all items in the list are unique.
  - `itemPattern` / `itemConstraints`: Constraints applied to each item in the list.

- **Objects** `{...}`
  - `noExtraKeys`: Ensures the object does not have keys outside the defined schema.
  - `requiredKeys`: Specifies keys that must be present in the object.

- **Maps** `Record<string, T>`
  - `keyPattern`: Regex pattern that keys must match.
  - `maxKeys`: Maximum number of keys allowed in the map.

- **Cross-field**(usually stays in notes)
  - `requiredIf`: A field is required if another field has a specific value.
  - `dependsOn`: A field's value depends on another field's value.
  - `mutuallyExclusiveWith`: Ensures two fields cannot both be present.
  - `computedFrom`: Indicates that a field's value is derived from other fields.

---
