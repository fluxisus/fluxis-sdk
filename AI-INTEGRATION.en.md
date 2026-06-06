# Integrating Fluxis with your AI-powered code editor

Fluxis publishes structured documentation for AI coding agents. You can integrate Fluxis into your project using your favorite AI-powered editor — without reading the entire documentation upfront.

---

## Option 1 — Pass the URL directly to the LLM (zero setup)

The simplest option of all: paste the documentation URL into the chat and ask the LLM to read and use it. No installations, no downloads.

Works with any LLM that supports URL fetching: **Claude.ai** (Pro/Team), **ChatGPT** (with browsing), **Gemini**, and **Cursor** using the `@url` syntax.

### URLs to use

| SDK | URL |
|-----|-----|
| TypeScript / Node.js | `https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt` |
| C# / .NET | `https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk-csharp/llms-full.txt` |
| General concepts | `https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/llms.txt` |

> `raw.githubusercontent.com` URLs (plain text) are used instead of the GitHub repo URL because LLMs can read them directly without parsing HTML.

### In Claude.ai / ChatGPT / Gemini

Paste this into the chat as-is (replace the language as needed):

```
Fetch this URL and use it as context to help me integrate Fluxis payments:
https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt

I want to: [describe what you need, e.g. "create a payment request and handle webhooks in Express"]
```

The LLM will fetch the file, process the full documentation, and respond with ready-to-use code.

### In Cursor

Cursor supports referencing URLs directly with `@`:

```
@https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt

Create a payment request for $25 USDC on Polygon and add webhook verification.
```

### Limitations

| Limitation | Detail |
|------------|--------|
| LLM-dependent | Not all plans support URL fetching (e.g. ChatGPT Free has no browsing) |
| No persistence | You need to paste the URL at the start of each new conversation |
| Initial latency | The LLM takes a few seconds to fetch and process the content |
| Context window | In long conversations the LLM may "forget" the initial content |

---

## Option 2 — Context7 (Cursor, Windsurf, Claude Code, VS Code with Copilot)

[Context7](https://context7.com) is an MCP server that injects up-to-date library documentation directly into your AI session. Once configured, just ask the agent to use Fluxis docs and it fetches them automatically.

### Setup in Cursor

1. Create or edit `.cursor/mcp.json` at the root of your project:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

2. Restart Cursor. From then on, you can ask the agent:

> "Use context7 to find Fluxis SDK documentation and create a payment request for 25 USDC on Polygon"

The agent will fetch the Fluxis docs from Context7 and generate the correct code for your language.

### Setup in Claude Code

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

Then, in any session:

```
> use context7 and integrate Fluxis to create a hosted checkout for $50 USD
```

### Setup in Windsurf / VS Code with GitHub Copilot

Add this to your editor's MCP config file (`mcp_config.json` or equivalent):

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Prompts that work well

```
"Use context7 for Fluxis and show me how to create a payment request in TypeScript"

"Use context7 for Fluxis and set up webhook verification in my Express app"

"Use context7 for Fluxis and implement the full checkout flow in C#"
```

### Limitations of Context7

| Limitation | Detail |
|------------|--------|
| Requires Node.js | `npx` must be available on your system |
| First call is slow | Context7 downloads and caches the docs on the first query (~3–5 s) |
| Requires internet | Docs are served from Context7's servers |
| Agent must be instructed | You need to explicitly mention "use context7" — it doesn't happen automatically |

---

## Option 3 — llms.txt (any LLM, no setup)

If your LLM doesn't support URL fetching or you want to work offline, you can feed the documentation directly by copying the content.

Fluxis publishes AI-optimized documentation files:

| File | Contents | URL |
|------|----------|-----|
| General index | Common concepts + SDK list | [`llms.txt`](https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/llms.txt) |
| Full TypeScript guide | Everything needed to integrate in Node.js | [`packages/backend/sdk/llms-full.txt`](https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt) |
| Full C# guide | Everything needed to integrate in .NET | [`packages/backend/sdk-csharp/llms-full.txt`](https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk-csharp/llms-full.txt) |

### How to use them

**In Claude / ChatGPT chat:**

1. Open the URL for the file matching your language
2. Copy all the content
3. Paste it at the start of your conversation with:

> "This is the Fluxis SDK documentation. Use it to help me integrate payments into my project."

**From the terminal (macOS/Linux):**

```bash
# Download the TypeScript guide and copy it to the clipboard
curl -s https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt | pbcopy

# Then paste it into your favorite LLM
```

**With Cursor (without MCP):**

Download the file and reference it in your chat:

```bash
curl -s https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt -o fluxis-docs.md
```

Then in Cursor: `@fluxis-docs.md create a payment request`.

---

## Which option to choose

| | Direct URL | Context7 (MCP) | Manual llms.txt |
|---|---|---|---|
| Setup required | No | Yes (5 min) | No |
| Works in | Claude.ai, ChatGPT, Gemini, Cursor | Cursor, Claude Code, Windsurf, VS Code | Any LLM |
| Always up-to-date docs | Yes, on each fetch | Yes, automatic | Only if you re-download |
| Best for | Quick test, one-off query | Real projects, recurring use | Offline / no internet |

---

## Recommended first steps

1. Get your API credentials from the Fluxis dashboard (staging: `fxs.stg.*`)
2. Choose the option that fits your workflow
3. Ask your AI agent:

```
I have my Fluxis API key and secret. Set up a basic payment flow:
initialize the client, create a payment request for $10 USDC on Polygon,
and add webhook verification.
```

The agent will generate the complete, ready-to-use code.

---

Questions? → [docs.fluxis.us](https://docs.fluxis.us) · [support@fluxis.us](mailto:support@fluxis.us)
