#!/usr/bin/env python3
"""
Direct Perplexity API caller for reddit-intel skill.
Usage: python perplexity_search.py "your query here"
Outputs JSON with the response text.
"""
import sys, os, json, urllib.request, urllib.error

API_KEY = os.environ.get("PERPLEXITY_API_KEY", "")
if not API_KEY:
    print(json.dumps({"error": "PERPLEXITY_API_KEY not set"}))
    sys.exit(1)

query = " ".join(sys.argv[1:])
if not query:
    print(json.dumps({"error": "No query provided"}))
    sys.exit(1)

payload = {
    "model": "sonar",
    "messages": [{"role": "user", "content": query}],
    "search_recency_filter": "year"
}

req = urllib.request.Request(
    "https://api.perplexity.ai/chat/completions",
    data=json.dumps(payload).encode(),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
        text = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])
        print(json.dumps({"text": text, "citations": citations}))
except urllib.error.HTTPError as e:
    print(json.dumps({"error": f"HTTP {e.code}: {e.read().decode()}"}))
    sys.exit(1)
