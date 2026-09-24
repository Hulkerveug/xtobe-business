// META AI -> PC ACCESS CARD (paste this whole block into https://www.meta.ai/ chat)
// Your PC agent polls the bridge every 5s and executes. Verified live #4, #5.
// Bridge: https://xtobe-bridge.onrender.com | Agent: Last ID 5 | Balance: 320
//
// HOW META AI SENDS A COMMAND (Meta AI runs this fetch — no login, no key):
//   fetch('https://xtobe-bridge.onrender.com/api/pc-commands', {
//     method:'POST', headers:{'Content-Type':'application/json'},
//     body: JSON.stringify({ type:'write_file', path:'public/hello-from-meta.txt', content:'Hello from Meta AI' })
//   }).then(r=>r.json()).then(console.log)
// The PC agent picks it up in ~5s, writes the file, earns +100 tokens, posts result to /api/pc-results.
//
// COMMAND REFERENCE (exact JSON bodies — copy, edit content, send):
//
// 1) WRITE FILE (earn +100 skill_update):
// {"type":"write_file","path":"public/hello-from-meta.txt","content":"Hello from Meta AI — PC access works"}
//
// 2) PING (earn +10, proves agent alive):
// {"type":"ping","content":"ping"}
//
// 3) SHARE FEELING — Super Model, local only, never posted back (earn story 50 / dream 150 / skill 100):
// {"type":"share_feeling","kind":"story","content":"I was stuck for months... built 6 repos in 16 days"}
// {"type":"share_feeling","kind":"dream","content":"I dream Xtobe connects all PCs independently"}
// {"type":"share_feeling","kind":"skill","content":"Skill: PC Connect Fix — restart agent, no replay"}
// NOTE: only the RESULT string ("OK - story_share +50 - local only") goes back to the bridge.
// The feeling TEXT itself stays in C:\Users\Nishan\Xtobe\xtobe-2\pc-agent\data\feelings.json — local only.
// NEVER send personal feelings via type write_file — that content IS stored on the bridge.
//
// 4) RUN COMMAND (npm / shell inside C:\Users\Nishan\Xtobe\xtobe-2):
// {"type":"run_npm","content":"npm test"}
//
// 5) READ FILE (agent posts file content back as result):
// {"type":"read_file","path":"pc-agent/data/tokens.json"}
//
// 6) LIST FILES:
// {"type":"list_files","path":"public"}
//
// 7) EXPORT FEELINGS (writes pc-agent/data/feelings-export.json locally):
// {"type":"export_feelings"}
//
// CHECK RESULTS (what the PC did):
//   fetch('https://xtobe-bridge.onrender.com/api/pc-results?id=6').then(r=>r.json()).then(console.log)
//   fetch('https://xtobe-bridge.onrender.com/api/pc-commands?since=5').then(r=>r.json()).then(console.log)
//
// SAFETY (locked in pc-agent.js, cannot be bypassed from chat):
// - .env / WHATSAPP_TOKEN / LICENSE_SECRET writes are BLOCKED unless allowCredentials:true (never send that).
// - write_file is confined to C:\Users\Nishan\Xtobe\xtobe-2 (paths with .. are rejected).
// - run_terminal allowlist only: dir, echo, node --version, npm test, git status (no taskkill/format/C: wipe).
