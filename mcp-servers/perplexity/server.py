#!/usr/bin/env python3
"""
Perplexity AI MCP Server
Exposes two tools: perplexity_search and perplexity_reason
"""

import os
import sys
import json
import requests
from mcp.server.fastmcp import FastMCP

PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY", "")
PERPLEXITY_BASE_URL = "https://api.perplexity.ai"

mcp = FastMCP("perplexity")

def call_perplexity(model: str, system: str, query: str) -> str:
    """Call Perplexity API and return response with citations."""
    if not PERPLEXITY_API_KEY:
        return "Error: PERPLEXITY_API_KEY environment variable not set."

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ],
        "return_citations": True,
    }

    try:
        resp = requests.post(
            f"{PERPLEXITY_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()

        content = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])

        if citations:
            sources = "\n\nSources:\n" + "\n".join(f"- {c}" for c in citations)
            return content + sources

        return content
    except requests.exceptions.RequestException as e:
        return f"Error calling Perplexity API: {str(e)}"


@mcp.tool()
def perplexity_search(query: str) -> str:
    """
    Search the web using Perplexity AI (sonar-pro model).

    Use for: market research, competitor analysis, factual lookups,
    current pricing, news, regulations, technology landscape, or any
    question requiring up-to-date web information with citations.

    Returns: Answer with specific data points, numbers, dates, and cited sources.
    """
    return call_perplexity(
        model="sonar-pro",
        system=(
            "You are a research assistant. Provide accurate, well-cited answers. "
            "Include specific data points, numbers, and dates when available. "
            "Always cite your sources. Be concise and direct."
        ),
        query=query,
    )


@mcp.tool()
def perplexity_reason(question: str) -> str:
    """
    Ask Perplexity AI to reason through a complex question (sonar-reasoning-pro model).

    Use for: feasibility analysis, strategic tradeoffs, 'should I do X?' questions,
    multi-step business analysis, or anything requiring structured thinking plus
    web-grounded facts. This model thinks step-by-step and cites sources.

    Note: This model can take 30-60 seconds for complex questions.

    Returns: Reasoning chain with conclusions and cited sources.
    """
    return call_perplexity(
        model="sonar-reasoning-pro",
        system=(
            "You are a strategic analyst. Think step by step. "
            "Ground your reasoning in real-world data where possible. "
            "Be direct about uncertainty and limitations. Cite sources. "
            "Provide actionable insights."
        ),
        query=question,
    )


if __name__ == "__main__":
    mcp.run()
