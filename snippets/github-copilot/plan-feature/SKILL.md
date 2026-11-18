---

name: plan-feature
description: Plan a bounded feature using repository patterns. Use when asked to plan a feature before implementation.
disable-model-invocation: true
---

# Plan a feature

1. Read the user's feature request. Ask for the target area and acceptance criteria
   if either is missing. Do not edit files or run commands.
2. Read project instructions, the dependency manifest, a comparable implementation,
   and its tests using available read-only tools. Cite actual files and symbols.
3. Explain existing behavior, the pattern to reuse, the smallest proposed file list,
   and compatibility constraints.
4. Propose behavioral tests, including boundaries, failure paths, and authorization
   checks where relevant. Identify dependency or contract changes needing approval.
5. Report open questions and stop after the plan. Do not invent APIs or claim that
   proposed checks have run.

The read-only request is guidance, not a tool permission boundary. Configure
permissions separately before invocation.
