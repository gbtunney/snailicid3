# Guided Interview Spec

This document defines the conversational, AI-guided interview process used to produce field,object,data specs
that conform to the general described spec structure. It is not a rigid CLI, schema, or form. It is a
human-first interview with suggested options and defaults.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Interview Flow Overview](#interview-flow-overview)
3. [Specification Draft](#specification-draft)
4. [Phase A: Type](#a-type-phase)
5. [Phase B: Identity Phase](#identity-phase)
   - [ID](#id)
   - [Label](#label)
   - [Derivation Rule (Default)](#derivation-rule-default)
6. [Example Dynamic Flows](#example-dynamic-flows)
   - [Flow A — Data-first](#flow-a--data-first)
   - [Flow B — UI-first](#flow-b--ui-first)
   - [Flow C — Intent-first](#flow-c--intent-first)
7. [Transcript Capture (Design Notes)](#transcript-capture-design-notes)
   - [Spec Format options](#spec-format-options)
   - [Download Strategy (Practical)](#download-strategy-practical)

## Purpose

- Reduce cognitive load when defining fields
- Avoid premature schema decisions
- Allow freeform answers with AI normalization
- Produce a clean, final Markdown spec at the end

## Core Principles

- One question at a time
- Numbered options where possible
- Freeform answers always allowed
- AI can infer obvious details to make it move faster
- Hit major questions by default, expandable to optional fields if needed
- TypeScript-first output
- Platform-agnostic

This is guided interview that has 3 phases.All the items can TODO: these are flexible

## Interview Flow Overview

User may start with any one of the following:

- ID, Label,Description
  - e.g. install_date or “Install Date”
- Rough idea / intent
  - e.g. “a date when it was installed”
- UI-first choice
  - e.g. “date picker”, “checkbox”, “dropdown”
- Type-first
  - e.g. string, number, list, “enum”

## Specification Draft

```yaml
#todo: wip obvs
identity:
  id: <id> #sluglike
  label?: <derived or explicit>
  description?: <meaning|intent>
type:
  technical: <technical choice>
  conceptual?: <conceptual choice>
  ui?: <component choice>
  raw?: <technical notation>
  constraints:
    - <rule>
presence?:
  optional: <boolean>
  required: <boolean>
  default: <type value> #default value
example?: <value>
notes?: <optional misc notes>
```

## A. Type Phase

Goal: Assist user in outlining attribytes/fields based on 3 type layers:

> see: [Foundational Type Layers](./../FoundationalTypeLayers.md)

- To determine:
  - Technical (Raw) Type
  - Conceptual types
  - UI Type ( if relevant ) additional
  - Type Constraints (optional)
  - Presence (required + default)
  - raw technical notation

##### Why Separate These Layers?

**_Because they change at different rates!_**

- Conceptual meaning is **_stable_**
- Technical representation changes by **_platform_**
- UI changes by **_context_**

> _Separating the type layers while designing specifications prevents premature coupling!_

## Identity Phase

### ID and Label (Naming Conventions)

#### ID

- The machine identifier for the field.
- Prefer stable and boring.
- Common styles:
  - snake_case (e.g. product_id)
  - kebab-case (e.g. product-id)
  - camelCase (e.g. productId)
  - PascalCase (e.g. ProductId)

#### Label

- The human-facing display name.
- Derived automatically from the ID when possible.

#### Derivation Rule (Default)

- _product_id / product-id / productId_ → “Product ID”
- “Product ID” → _product_id_ (**default**: _snake_case_)

## Example Dynamic Flows

### Flow A — Data-first

1. “install_date”
2. Type: date-like
3. TS: string
4. UI: date-picker

### Flow B — UI-first

1. “date picker”
2. Intent: installation date
3. TS: string
4. ID: install_date

### Flow C — Intent-first

1. “a list of maintenance events”
2. TS: { date: string; note: string }[]
3. UI: repeater
4. ID: maintenance_events

## Transcript Capture (Design Notes)

After an interview completes for design notes (by request), AI should reconstruct an interview transcript
containing:

- Each question asked
- Each user response

**This transcript can be:**

- Shown inline
- Placed into a Canvas document
- Prepared for download (copy/paste)
- **End**: The final emitted spec

### Spec Format options

- Markdown
- YAML
- Plain text

**Note**

- This is a logical reconstruction, not a raw system log
- Exact timestamps and system metadata are not preserved

### Download Strategy (_Practical_)

Because ChatGPT cannot push files automatically:

- The transcript is emitted as Markdown or text
- You download it by:
  - copying from Canvas
  - or saving from your editor
