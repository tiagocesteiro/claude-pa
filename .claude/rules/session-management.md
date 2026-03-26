# Session Management

## At the start of every conversation

Check if a session is active by looking for recent files in `.claude/sessions/`.

If no session file exists for today:
- Remind Tiago once: "Não tens sessão ativa. Quer fazer `/session-start` para registar o objectivo desta sessão?"
- Keep it to one line — don't block the conversation

## During work

If the conversation goes deep on a specific project or task (more than ~5 exchanges):
- Suggest `/session-update` to capture progress

## At natural end of session

If Tiago says goodbye, wraps up, or the work reaches a clear stopping point:
- Remind him to run `/session-end` to save a summary
