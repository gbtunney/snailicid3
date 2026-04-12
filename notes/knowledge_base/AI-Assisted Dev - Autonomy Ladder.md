# AI-Assisted Development — Autonomy Ladder

> Tools differ by **autonomy**, not philosophy.  
> **Spec strictness should increase as autonomy increases.**

---

## 1. Prompt-Only / Chat Assistance

\*(aka “independent prompting”, “rubber duck +

- You manually integrate everything

**Autonomy:** Very low  
**Control:** Very high  
**Spec needs:** Very low / vague is fine

---

## 2. Inline Assist / Suggestion Mode

_(aka “autocomplete”, “amplified typing”)_

- AI suggests code at the cursor
- Nothing applies unless you explicitly accept it
- Scope is usually local (line / function / file)

**Autonomy:** Low  
**Control:** High  
**Spec needs:** Low

---

## 3. Guided Edit / Apply-With-Approval

_(aka “pair-programming agent”)_

- AI proposes concrete diffs
- Often multi-file and repo-aware
- You explicitly review and approve changes

**Autonomy:** Medium  
**Control:** Medium–high  
**Spec needs:** Medium (partial constraints)

---

## 4. Task-Scoped Autonomous Agent

_(“do X and report back”)_

- You define a bounded task
- AI plans and executes independently
- You review results after execution (diff, output, PR)

**Autonomy:** High  
**Control:** Medium  
**Spec needs:** High (clear intent and bounds)

---

## 5. Continuous / Background Autonomous Agent

_(“set it and forget it” automation)_

- AI monitors, plans, and executes continuously
- Minimal human involvement
- Errors can compound silently

**Autonomy:** Very high  
**Control:** Low  
**Spec needs:** Very high (explicit, defensive specs + guardrails)

---

## Key Insight

- “Spec-driven” is **not a property of a tool**
- It’s a **process choice**
- The right amount of specification depends on **how autonomous the AI is**

Low autonomy tolerates vague intent.  
High autonomy requires explicit constraints.
