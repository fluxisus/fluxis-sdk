# /sync-sdks — Installation & Usage

## What is this?

A Claude Code skill that propagates OpenAPI spec changes to all SDK implementations in the monorepo.
When you update `spec/swagger.yaml` after core-api changes, run `/sync-sdks` and Claude will update
the TypeScript, C#, Python, and Go SDKs automatically — including code, tests, READMEs, and llms-full.txt.

## Prerequisites

- [Claude Code](https://claude.ai/code) installed (`npm install -g @anthropic-ai/claude-code`)
- This repo cloned locally

## Installation

**No installation needed.** The skill lives in the repo at `.claude/skills/sync-sdks/SKILL.md`.
Claude Code auto-discovers skills from `.claude/skills/` when you open the project.

Verify it's available:
```bash
cd /path/to/fluxis-sdk
claude
# Type "/" and look for "sync-sdks" in autocomplete
```

## Usage

### After updating the swagger spec

```bash
# 1. Update spec/swagger.yaml (manually or from core-api)
cp ../core-api/docs/swagger.yaml spec/swagger.yaml

# 2. Open Claude Code
claude

# 3. Run the skill
/sync-sdks
```

### With a custom spec path

```bash
/sync-sdks path/to/updated-spec.yaml
```

### What happens when you run it

1. **Diff analysis** — Claude reads the spec diff and categorizes changes (new endpoints, modified schemas, etc.)
2. **Confirmation** — shows you a summary and waits for your OK
3. **SDK updates** — updates each active SDK's source code, models, and resources
4. **Test updates** — adds/updates tests for new functionality
5. **Doc updates** — updates README, llms-full.txt, and root CLAUDE.md
6. **Verification** — builds and tests each SDK, fixes any issues
7. **Summary** — shows all files changed per SDK

### Example session

```
You: /sync-sdks

Claude: I've analyzed the spec diff. Here's what changed:

  New endpoints:
    - POST /pos/{posId}/payment-request/{id}/cancel
    - GET /pos/{posId}/payment-request/{id}/transactions

  Modified schemas:
    - PaymentRequestResponse: added "cancelledAt" field
    - TransactionListResponse: added "hasMore" pagination field

  New enum value:
    - PaymentRequestStatus: added "cancelled"

  Shall I proceed with updating all SDKs?

You: yes

Claude: [updates TS, C#, Python, Go SDKs...]
        [updates tests, READMEs, llms-full.txt...]
        [runs builds and tests...]

  Done. Summary:
    - TypeScript: 4 files modified, 2 methods added
    - C#: 5 files modified, 2 methods added, 1 model updated
    - Python: not active (skipped)
    - Go: not active (skipped)
    - All builds passing, all tests passing.
```

## For CI/CD automation (future)

This skill is designed for interactive use with Claude Code. For automated pipelines,
you could integrate it with Claude Code's headless mode:

```bash
# Run non-interactively (requires claude-code CLI)
echo "/sync-sdks" | claude --no-interactive
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skill not found | Make sure you're in the fluxis-sdk repo root |
| "No diff found" | Commit or stage your swagger changes first, or the skill will diff against HEAD~1 |
| Build fails after sync | Claude will attempt to fix it automatically. If stuck, review the error and guide it |
| Partial update | Re-run `/sync-sdks` — it reads the current spec, not a diff cache |

## Modifying the skill

Edit `.claude/skills/sync-sdks/SKILL.md` to:
- Add support for new SDKs (e.g., Rust, Kotlin)
- Change the update strategy
- Add/remove verification steps
- Adjust naming convention rules
