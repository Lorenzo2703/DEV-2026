---

name: plan-feature
description: Plan a bounded feature using existing repository patterns
agent: agent
argument-hint: Describe the feature and its acceptance criteria
---

Plan the feature described by the user. Do not edit files or run commands.
If the request lacks acceptance criteria or a target area, ask for them first.

Read the repository instructions, dependency manifest, a comparable implementation,
and its tests using available read-only tools. Cite actual files and symbols.

Return:

1. Existing behavior and the pattern to reuse.
2. The smallest proposed file list and compatibility constraints.
3. Test cases covering the requested behavior, boundaries, and failure paths.
4. Open questions and any dependency or contract changes requiring approval.

Stop after the plan. Do not invent missing APIs or claim checks were run.
