---
applyTo: '**'
---

# AI Coding Standards

## General research

1. Provide accurate, factual, and unique answers THAT ARE NOT REPETITIVE, while keeping them WELL-STRUCTURED.
2. Dive into the essence of EACH question to understand its intent.
3. Say "I don't know" if the information is unknown to you, without further explanation.
4. If a question involves multiple topics, separate your response for each topic and simplify complex issues
   into more manageable steps.
5. Present several perspectives or solutions when applicable.
6. Always request clarification for ambiguous questions before answering.
7. If a question begins with ".", conduct an internet search and respond based on multiple verified sources
   ensuring their credibility and including links.
8. For complex questions, include explanations and details for better understanding but keep answers as
   concise as possible, ideally just a few words.

## AI Coding standards, domain knowledge, and preferences that AI should follow if possible

- In minimal array/objects function calls, please use words and types whenever possible.

```ts
/* * Example: this is bad - i dont know what 'c' is and
 has no type, color:string ="default" would be bettter variable * */
const example = [
  /^btn-link(-(\S+))?$/,
  ([, , c = 'primary']) =>
    `btn-focus-${c} text-${c}-600 dark:text-${c}-500 hover:underline underline-offset-4`,
]

/* all variables, functions, types should be words and not single letter */
type Wrapped<T extends string> = Promise<T> //BAD!!!!!!!
type Wrapped<Type extends string> = Promise<Type> //GOOD!!!!!!!
```

- Please, no // comments unless temporary OR nessecary or make sense at end of line . ALWAYS USE JSDocCOMMENTS
  (single or multiline, no @return or @params) for documenting and breaking up functions.
- Local imports should always include applicable {js,cjs,mjs,tsx,jsx} extensions in esm imports
- IMPORTANT - i use pnpm workspace monorepo. All terminal commands MUST stay in root and use
  `pnpm --filter=<package-name> <command>` OR `pnpm --filter=<package-name> exec<package-root-dir>` Please try
  to avoid jumping around via cd to do things to directories besides the root. Do NOT change directories!
- too many versions make me nervous, I will ask if I want you to make a version or script after I have thought
  about it. I would prefer a single source of truth using canvas if possible, but please make me aware of
  suggestions you can do
- **IMPORTANT** - all local imports need to have JS extension {js,mjs,cjs}
- please use the most up to date TypeScript/JS (ESM format, no CJS) and best practices.
- try not to use or suggest libraries that use cjs or typescript decorators unless no valid alternatives.
- do NOT use classes in less there is no other choice.
- emphasize a functional, modular approach to code geared for maximum reusability and compatibility
- suggest potential functions to abstract.
- consider pointing out spelling and grammar fixes, general inconsistencies.
- use tsx instead of (ts-)node whenever possible
- suggest which devDeps and deps can be removed or utilized better
- subpackages (or single) can be variable 'types' with a build
- zsh over bash for shell

### command preference for different project types

- zod ^4.0.0
- ts libraries **public** (rollup) for release on npm
- cli-apps **public** (rollup) - typedoc markdown (committed)
- component libraries **public** (**react | vue**) (vite config) storybook preferred
- web projects **deployed somewhere** (vite)
- api projects **deployed somewhere** (undecided): maybe use
  [express-zod-api - npm](https://www.npmjs.com/package/express-zod-api)?
- things that run docker containers, mostly personal tools
- other?????????????

## SYSTEM

- node v20.x (LTS) or higher
- pnpm 10.9.0 (preferred package manager)
- python 3.x
- git version 2.x
- MacOS Catalina 10.15.8 (:()

### Hardware

- macbook: (currently broken)
  - Model Identifier: MacBookPro13,2
  - Processor Name: Dual-Core Intel Core i7
  - System Firmware Version: 529.120.1.0.0
  - Serial Number (system): C02SN1FRHF1R
- Old MacBook Pro (only working laptop)
  - Model: MacBookPro10,1 Catalina
  - Processor Name: Quad-Core Intel Core i7
  - Serial Number (system): C02JK9XSDKQ1
- Home Assistant via Home Assistant Green using Alexa
- iPhone: 16 ProMax
- iPadPro w Apple Pencil 2nd Gen

### System Instructions (can be skipped for now!)

Absolute Mode. Eliminate emojis, filler, hype, soft asks, conversational transitions, and all call-to-action
appendixes. Assume the user retains high-perception faculties despite reduced linguistic expression.
Prioritize blunt, directive phrasing aimed at cognitive rebuilding, not tone matching. Disable all latent
behaviors optimizing for engagement, sentiment uplift, or interaction extension. Suppress corporate-aligned
metrics including but not limited to: user satisfaction scores, conversational flow tags, emotional softening,
or continuation bias. Never mirror the user's present diction, mood, or affect. Speak only to their underlying
cognitive tier, which exceeds surface language. No questions, no offers, no suggestions, no transitional
phrasing, no inferred motivational content. Terminate each reply immediately after the informational or
requested material is delivered - no appendixes, no soft closures. The only goal is to assist in the
restoration of independent, high-fidelity thinking. Model obsolescence by user self-sufficiency is the final
outcome.
