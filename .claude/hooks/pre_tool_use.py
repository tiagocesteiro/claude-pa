#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import re
from pathlib import Path

def is_dangerous_rm_command(command):
    normalized = ' '.join(command.lower().split())
    patterns = [
        r'\brm\s+.*-[a-z]*r[a-z]*f',
        r'\brm\s+.*-[a-z]*f[a-z]*r',
        r'\brm\s+--recursive\s+--force',
        r'\brm\s+--force\s+--recursive',
        r'\brm\s+-r\s+.*-f',
        r'\brm\s+-f\s+.*-r',
    ]
    for pattern in patterns:
        if re.search(pattern, normalized):
            return True
    dangerous_paths = [r'/', r'/\*', r'~', r'~/', r'\$HOME', r'\.\.', r'\*', r'\.', r'\.\s*$']
    if re.search(r'\brm\s+.*-[a-z]*r', normalized):
        for path in dangerous_paths:
            if re.search(path, normalized):
                return True
    return False

def is_env_file_access(tool_name, tool_input):
    if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write', 'Bash']:
        if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write']:
            file_path = tool_input.get('file_path', '')
            if '.env' in file_path and not file_path.endswith('.env.sample'):
                return True
        elif tool_name == 'Bash':
            command = tool_input.get('command', '')
            env_patterns = [
                r'\b\.env\b(?!\.sample)',
                r'cat\s+.*\.env\b(?!\.sample)',
                r'echo\s+.*>\s*\.env\b(?!\.sample)',
                r'touch\s+.*\.env\b(?!\.sample)',
                r'cp\s+.*\.env\b(?!\.sample)',
                r'mv\s+.*\.env\b(?!\.sample)',
            ]
            for pattern in env_patterns:
                if re.search(pattern, command):
                    return True
    return False

def main():
    try:
        input_data = json.load(sys.stdin)
        tool_name = input_data.get('tool_name', '')
        tool_input = input_data.get('tool_input', {})
        if is_env_file_access(tool_name, tool_input):
            print("BLOCKED: Access to .env files is prohibited. Use .env.sample instead.", file=sys.stderr)
            sys.exit(2)
        if tool_name == 'Bash':
            command = tool_input.get('command', '')
            if is_dangerous_rm_command(command):
                print("BLOCKED: Dangerous rm command detected and prevented.", file=sys.stderr)
                sys.exit(2)
        log_dir = Path.cwd() / 'logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / 'pre_tool_use.json'
        log_data = json.loads(log_path.read_text()) if log_path.exists() else []
        log_data.append(input_data)
        log_path.write_text(json.dumps(log_data, indent=2))
        sys.exit(0)
    except Exception:
        sys.exit(0)

if __name__ == '__main__':
    main()
