---
tags:”
  - development
  - dx
——-

# DX Developer Experience Info

## Concise Checklist
Use this to judge **any dev library in ~5 minutes**.
Translation: *“Would Future‑Me curse Present‑Me for choosing this?”*

---

### 1. Type Safety

- ❓ Do types come **from the library**, or do I have to bolt them on?
- ❓ Does autocomplete _actually_ reflect reality?
- ❓ Do types get worse as the project grows?

**Green flag:** end‑to‑end types, few `any`s  
**Red flag:** docs say “TypeScript supported” but examples are JS

---

### 2. Error Messages

When something breaks, does the error:

- tell me **what** broke?
- tell me **where**?
- suggest **how to fix it**?

**Green flag:** actionable, human‑readable errors  
**Red flag:** stack traces into internals you didn’t write

---

### 3. Common Tasks Are Easy

Ask: _what will I do 90% of the time?_

- create / update / delete data
- rename a field
- run migrations
- add a new environment
- reset local state

**Green flag:** 1–2 commands or obvious APIs  
**Red flag:** wiki pages + cargo‑cult incantations

---

### 4. Escape Hatches Exist

No abstraction survives reality.

- ❓ Can I drop down a level when I need to?
- ❓ Can I write raw SQL / custom logic / bypass magic?

**Green flag:** explicit, documented escape hatches  
**Red flag:** “you’re not supposed to do that”

---

### 5. Refactors Are Safe

- ❓ If I rename a field, does TypeScript help me fix _all_ usages?
- ❓ Can I trust my editor + compiler?

**Green flag:** compiler‑driven refactors  
**Red flag:** “hope you caught all of those”

---

### 6. Tooling & Workflow Fit

- ❓ Does it fight my stack?
  - Node vs Bun vs Deno
  - ESM vs CJS
  - monorepo support
- ❓ Does it require global installs or weird runtime assumptions?

**Green flag:** works _with_ your tools  
**Red flag:** “just install this daemon and patch Node”

---

### 7. Docs & Examples

Are examples:

- current?
- idiomatic?
- actually copy‑pasteable?

**Green flag:** docs match latest release  
**Red flag:** blog posts from 2019

---

### 8. Community Signal

You don’t need hype — you need signal.

- ❓ Are issues responded to?
- ❓ Is the project actively maintained?
- ❓ Are people using it in production _now_?

**Green flag:** steady commits, sane discussions  
**Red flag:** abandoned PRs, “use fork X”

---

## 9. Mental Overhead

- ❓ How many concepts must I learn before being productive?
- ❓ Does it feel “obvious” after a day or two?

**Green flag:** small, composable ideas  
**Red flag:** framework‑specific vocabulary explosion

---

## 10. Future‑You Test

Ask honestly:

> _“If I open this repo in 6 months… will I understand what’s going on?”_

**Green flag:** boring, explicit, predictable  
**Red flag:** clever magic with no paper trail

---

## Applying This to ORMs (Example)

| Tool      | DX Summary                                                          |
| --------- | ------------------------------------------------------------------- |
| Prisma    | Excellent DX, strong types, great migrations, some abstraction cost |
| Drizzle   | Very good DX, SQL‑adjacent, lighter mental model                    |
| Kysely    | Amazing DX if you like SQL, minimal magic                           |
| TypeORM   | Heavy abstraction, mixed DX                                         |
| Sequelize | Stable but aging DX                                                 |

---

## One‑Liner Rule of Thumb

- **If the tool disappears while you’re working → good DX**
- **If you’re constantly thinking about the tool → bad DX**

---

## Want This Applied to _Your_ Stack?

Reply with:

- **Stack** (Node / Next / Bun / etc.)
- **Runtime** (server, serverless, edge)
- **Repo shape** (monorepo? pnpm?)
- **Project lifespan** (prototype vs years)
- **Team** (solo vs collaborators)
- **How SQL‑y it’ll get** (CRUD vs gnarly queries)

I’ll score libraries for your setup and pick a default.

[[deep-research-report]]
