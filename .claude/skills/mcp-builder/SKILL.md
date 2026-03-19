---
name: mcp-builder
description: Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
license: Complete terms in LICENSE.txt
---

# MCP Server Development Guide

Four-phase workflow for creating high-quality Model Context Protocol servers.

## Phase 1: Research & Planning

- Understand MCP design principles and protocol documentation
- Review framework options (TypeScript SDK vs Python FastMCP)
- Plan: balance comprehensive API endpoint coverage with specialized workflow tools

## Phase 2: Implementation

- Project setup and core infrastructure
- Tool development with proper schemas, descriptions, error handling
- Recommended stack: **TypeScript with streamable HTTP transport** for remote servers
- Alternative: Python with FastMCP

## Phase 3: Review & Testing

- Compilation checks
- Testing via MCP Inspector tools
- Ensure code quality and error handling

## Phase 4: Evaluations

- Create 10 complex, realistic test questions
- Verify LLM effectiveness with your server

## Critical Best Practices

- Use clear, descriptive tool names with consistent prefixes — helps agents find the right tools quickly
- Error messages must be actionable
- Include proper pagination, async operations, structured response schemas
- Document all tools thoroughly in their descriptions
