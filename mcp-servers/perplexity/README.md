# Perplexity AI MCP Server

A Model Context Protocol server that exposes Perplexity AI's web search and reasoning capabilities to Claude Code.

## What It Does

- **perplexity_search**: Searches the web using Perplexity's `sonar-pro` model for factual lookups, market research, competitor analysis, and current pricing/news
- **perplexity_reason**: Uses `sonar-reasoning-pro` for structured reasoning on complex questions like feasibility analysis and strategic tradeoffs

Both tools return cited sources.

## Setup

### 1. Install Dependencies (one-time)

```bash
pip install mcp requests
```

Or from the project root:

```bash
pip install -r mcp-servers/perplexity/requirements.txt
```

### 2. Get a Perplexity API Key

1. Go to https://www.perplexity.ai/settings/api
2. Generate an API key
3. Copy it

### 3. Add to Claude Code Settings

Edit `.claude/settings.local.json` and add this block to `mcpServers`:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "python",
      "args": ["d:\\Claude - PA\\mcp-servers\\perplexity\\server.py"],
      "env": {
        "PERPLEXITY_API_KEY": "pplx-your-key-here"
      }
    }
  }
}
```

(Replace `pplx-your-key-here` with your actual key.)

### 4. Restart Claude Code

MCP servers load at session start. Restart for the new server to register.

## Testing

### Direct Server Test

```bash
set PERPLEXITY_API_KEY=pplx-your-key-here
python "d:\Claude - PA\mcp-servers\perplexity\server.py"
```

The server should start and listen on stdin. (It's a stdio server — Claude Code communicates with it via stdin/stdout.)

### In Claude Code

Use the `researcher` subagent:

```
Use the researcher agent to find the top 3 competitors for a 3D printing marketplace in Europe.
```

The researcher subagent will call `perplexity_search` or `perplexity_reason` and return a structured response with citations.

## Models

- **sonar-pro**: Fast web search with good depth. Default for factual lookups.
- **sonar-reasoning-pro**: Slower, but includes structured reasoning. Good for feasibility and tradeoff analysis. Can take 30-60s.

## Troubleshooting

**"PERPLEXITY_API_KEY not set"**
- Make sure the key is in `.claude/settings.local.json`
- Make sure `.claude/settings.local.json` is readable

**"401 Unauthorized"**
- Your API key is invalid or expired
- Check https://www.perplexity.ai/settings/api

**Slow responses**
- If using `sonar-reasoning-pro`, expect 30-60s for complex questions
- This is normal; the model is thinking

**Server doesn't load in Claude Code**
- Verify the path to `server.py` is absolute and correct
- Try running it manually first to check for syntax errors
