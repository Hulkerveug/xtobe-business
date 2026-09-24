# SKILL: protect-files (give this to Cline / any coding agent)
# Stops Hermes mixing + Cline looping. Strict, one file per call.

You must use file-guard-strict.js for every file write:

1. Before writing ANY file under C:\Users\Nishan\Xtobe\xtobe-2, validate:
   node pc-agent/file-guard-strict.js guard <relpath> <tempContentFile>
   Only write when it prints ALLOW. If BLOCK, stop and report the reason — do not retry the same content.

2. One file per tool call. No multi-file mixing in a single write.

3. After writes, verify before commit:
   node pc-agent/file-guard-strict.js
   node lockdown.test.js
   Both must be green (guard 0 failures, lockdown 12/12).

4. Protected files and strict rules:
   - server/index.js: 800-900 lines, must contain /health, /api/appointments, /api/auth, /api/brand/session. Forbids while(true), hardcoded WHATSAPP_TOKEN.
   - public/true-app.html: must contain LOCAL ONLY + SECURE LOCAL. Forbids bridge POST (onrender.com/api/pc-results).
   - pc-agent/pc-agent.js: must contain firstPoll no-replay + POLL_INTERVAL + share_feeling. Forbids while(true).

5. Loop rule: if the new content has the same sha256 as the file written in the last 5s, the guard BLOCKS it — stop, do not loop.

6. Every ALLOW auto-backs-up to pc-agent/data/backups/. Every BLOCK is logged to pc-agent/data/guard-blocked.log — show the log line when blocked.
