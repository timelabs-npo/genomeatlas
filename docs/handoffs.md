# Workbench handoffs

The browser workbench prepares an inspectable prompt and an intent-only request.
It does not invoke a model, create a remote task, send files, enable a plugin or
change the user's destination settings.

`apps/genomeops-atlas/src/lib/workbench.ts` exports eight starter tasks mapped
one-to-one to the frozen `panel`, `download`, `markers`, `tree`, `rm`, `evidence`,
`figure` and `release` chains. The tool catalog preserves all 134 frozen records,
including authentication failures and cache-only observations. The scientific
subset is an explicit list; hiding other entries in the initial view must not
delete them from the searchable full registry.

`composeHandoff` validates the task, tool IDs, prompt options, request ID and a
selection of one to three unique versioned assemblies from the frozen panel.
`parseGenomeAccessions` accepts a pasted line/space/comma-separated list and then
applies the same strict validation. The default is the existing three-genome
pilot. The selected list appears in the exact schema-shaped payload inside the
prompt. Additional free text does not change that payload.

Communication role, tone and character are instructions in the copied prompt.
They do not select a model, grant credentials, create independent reviewers or
change the evidence rules. The schema's BUILD/VERIFY/DOC role describes the
requested chain action independently from the communication persona.

The interface should expose separate copy and open controls. `copyHandoff`
resolves only after a clipboard write succeeds and propagates failures. Show an
error when copying fails and keep the visible prompt available for manual copy.
Never show “task started” merely because a destination was opened.

## Official destination references

- [Use ChatGPT](https://learn.chatgpt.com/docs/use-chatgpt): choose Chat, Work or
  Codex in the product interface.
- [Get started with ChatGPT Work](https://learn.chatgpt.com/docs/get-started-with-work):
  switch to Work and supply the task, source materials and expected result.
- [Codex cloud](https://learn.chatgpt.com/docs/cloud): open
  `https://chatgpt.com/codex`, sign in, connect/select a repository environment
  and describe the task.

Verified on 2026-09-12. No reviewed official source establishes public launch
query parameters for mode, role, tone, character, model or automatic submission.
The workbench therefore uses bare product URLs and explicit copy/paste/manual
selection instructions. This is a boundary of this integration, not a claim
that OpenAI has no other authenticated task-creation APIs. Account availability
and destination tool access remain outside this static page's control.
