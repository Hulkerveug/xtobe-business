'use strict';
/**
 * Xtobe-2 — Promo Reborn engine (AI video creator).
 * Clinic uploads OLD promotion videos → engine creates NEW promo videos:
 * same face, new offer, new caption, fresh cut — ready to post.
 *
 * TIER GATE: Growth + Elite only (Starter sees "upgrade" screen).
 * APPROVAL GATE: every generated video waits for staff approval. Nothing auto-posts.
 *
 * Pipeline: upload → analyze → script (AI) → assemble (ffmpeg/moviepy)
 *         → caption overlay (EN+AR) → preview → APPROVE → download/queue
 */

const { execFile } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

module.exports = function videoModule(db, cfg) {
  const nowIso = () => new Date().toISOString();
  const VIDEOS_DIR = path.join(cfg.root || process.cwd(), 'data', 'videos');
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });

  /* ---------- tier gate ---------- */
  const TIER_ACCESS = { starter: false, growth: true, elite: true, pilot: true };

  function canUse(tier) {
    return TIER_ACCESS[String(tier || '').toLowerCase()] === true;
  }

  /* ---------- project model ---------- */
  function createProject({ clinicId, name, sourceFile, offerText, style, language, voice }) {
    const id = 'vid-' + crypto.randomBytes(6).toString('hex');
    db.prepare(`INSERT INTO video_projects
      (id, clinic_id, name, status, source_file, offer_text, style, language, voice, created_at)
      VALUES (?, ?, ?, 'uploaded', ?, ?, ?, ?, ?, ?)`)
      .run(id, clinicId || 'default', name || 'Untitled promo', sourceFile,
        offerText || '', style || 'luxury', language || 'en', voice || 'female', nowIso());
    return getProject(id);
  }

  function getProject(id) {
    return db.prepare('SELECT * FROM video_projects WHERE id = ?').get(id);
  }

  function listProjects({ clinicId, status, limit } = {}) {
    let sql = 'SELECT * FROM video_projects';
    const where = []; const params = [];
    if (clinicId) { where.push('clinic_id = ?'); params.push(clinicId); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit) || 50);
    return db.prepare(sql).all(...params);
  }

  function setStatus(id, status, extra) {
    const allowed = ['uploaded', 'analyzing', 'scripted', 'assembling', 'preview', 'approved', 'rejected', 'posted', 'failed'];
    if (!allowed.includes(status)) throw new Error('invalid status: ' + status);
    db.prepare('UPDATE video_projects SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
    if (extra && typeof extra === 'object') {
      const cols = Object.keys(extra).filter(k => ['script', 'caption_en', 'caption_ar', 'hashtags', 'output_file', 'thumb_file', 'error'].includes(k));
      cols.forEach(k => db.prepare(`UPDATE video_projects SET ${k} = ? WHERE id = ?`).run(JSON.stringify(extra[k]) || extra[k], id));
    }
    return getProject(id);
  }

  /* ---------- AI script generation (Groq, same key family as xtobe stack) ---------- */
  async function generateScript(project) {
    const prompt = `You are a Dubai beauty clinic content creator. Create a 15-second Instagram Reel promo.

CLINIC OFFER: ${project.offer_text}
STYLE: ${project.style} (luxury = premium calm, friendly = warm chatty, urgent = limited-time energy)
LANGUAGE: ${project.language}

Return STRICT JSON:
{
  "hook": "first 2 seconds, stop-the-scroll line",
  "scenes": [
    {"text": "overlay text for this scene (max 6 words)", "seconds": 3},
    {"text": "...", "seconds": 3},
    {"text": "...", "seconds": 3},
    {"text": "...", "seconds": 3}
  ],
  "voiceover": "15-second voiceover script, warm professional tone",
  "caption_en": "Instagram caption with emojis, ends with booking CTA",
  "caption_ar": "same caption in Gulf Arabic",
  "hashtags": ["#dubai", "... 15-18 tags total, mix dubai + beauty + treatment"],
  "first_comment": "what to comment right after posting (booking link or question)"
}

RULES: No medical claims (no 'guaranteed results'). No before/after on injectables (DHA rules). Premium Dubai tone.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.aiKey,
      },
      body: JSON.stringify({
        model: cfg.aiModel || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error('AI script failed: ' + res.status);
    const data = await res.json();
    const script = JSON.parse(data.choices[0].message.content);
    setStatus(project.id, 'scripted', {
      script: script,
      caption_en: script.caption_en,
      caption_ar: script.caption_ar,
      hashtags: script.hashtags,
    });
    return script;
  }

  /* ---------- video assembly via ffmpeg (face-preserving: we only cut/overlay, never regenerate faces) ---------- */
  function run(cmd, args) {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { timeout: 120000 }, (err, stdout, stderr) => {
        if (err) { reject(new Error(stderr || err.message)); } else { resolve(stdout); }
      });
    });
  }

  async function assemble(project, script) {
    setStatus(project.id, 'assembling');
    const src = path.join(VIDEOS_DIR, project.source_file);
    const outName = project.id + '.mp4';
    const out = path.join(VIDEOS_DIR, outName);

    // 1. probe duration
    const probe = await run('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', src]);
    const info = JSON.parse(probe);
    const dur = Math.min(parseFloat(info.format.duration || 15), 60);

    // 2. cut best 15s (middle of the video, where the action is)
    const start = Math.max(0, (dur - 15) / 2);

    // 3. assemble: cut + scale to 1080x1920 + scene text overlays
    const filters = [];
    filters.push(`scale=1080:1920:force_original_aspect_ratio=increase`);
    filters.push(`crop=1080:1920`);
    script.scenes.forEach((sc, i) => {
      const t = (i * 3.75).toFixed(2);
      const text = String(sc.text).replace(/[':\\]/g, '').slice(0, 40);
      filters.push(`drawtext=text='${text}':fontsize=72:fontcolor=white:borderw=4:bordercolor=black@0.7:x=(w-text_w)/2:y=h*0.78:enable='between(t,${t},${(parseFloat(t) + 3.75).toFixed(2)})'`);
    });

    const args = [
      '-y', '-ss', String(start), '-t', '15', '-i', src,
      '-vf', filters.join(','),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      out,
    ];
    await run('ffmpeg', args);

    setStatus(project.id, 'preview', { output_file: outName });
    return { output: '/api/videos/' + outName };
  }

  /* ---------- full pipeline ---------- */
  async function runPipeline(projectId) {
    const project = getProject(projectId);
    if (!project) throw new Error('project not found');
    try {
      const script = await generateScript(project);
      const result = await assemble(project, script);
      return { ok: true, ...result };
    } catch (e) {
      setStatus(projectId, 'failed', { error: e.message });
      return { ok: false, error: e.message };
    }
  }

  /* ---------- approval (THE rule) ---------- */
  function approve(projectId, staffName) {
    db.prepare('UPDATE video_projects SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?')
      .run('approved', staffName || 'staff', nowIso(), projectId);
    return getProject(projectId);
  }
  function reject(projectId, reason) {
    return setStatus(projectId, 'rejected', { error: reason || 'staff rejected' });
  }

  return { canUse, createProject, getProject, listProjects, setStatus, runPipeline, approve, reject, VIDEOS_DIR };
};
