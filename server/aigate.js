'use strict';
/**
 * Xtobe-2 — AI Creator access gate + usage billing.
 * LOCKED (see .roorules):
 *   Elite: 20 videos/month included
 *   Addon (AED 399/mo, Starter/Growth): 8 videos/month
 *   Extra beyond limit: AED 49 per video (our profit)
 *   No Elite/Addon: NO access — show upgrade screen.
 */

module.exports = function aiGateModule(db) {
  const nowIso = () => new Date().toISOString();
  const monthKey = () => new Date().toISOString().slice(0, 7); // 2026-09

  const EXTRA_COST_AED = 49;   // LOCKED
  const ADDON_PRICE_AED = 399; // LOCKED
  const ELITE_LIMIT = 20;      // LOCKED
  const ADDON_LIMIT = 8;       // LOCKED

  function getClinic(clinicId) {
    let c = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!c) {
      // auto-create default clinic row (single-tenant mode)
      db.prepare(`INSERT INTO clinics (id, name, plan, ai_creator_enabled, ai_videos_used, ai_videos_limit, ai_extra_count, usage_month, created_at)
        VALUES (?, 'My Clinic', 'growth', 0, 0, 0, 0, ?, ?)`).run(clinicId || 'default', monthKey(), nowIso());
      c = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId || 'default');
    }
    // month rollover: reset counters
    if (c.usage_month !== monthKey()) {
      db.prepare('UPDATE clinics SET ai_videos_used = 0, ai_extra_count = 0, usage_month = ? WHERE id = ?')
        .run(monthKey(), c.id);
      c = db.prepare('SELECT * FROM clinics WHERE id = ?').get(c.id);
    }
    return c;
  }

  function effectiveLimit(c) {
    if (c.plan === 'elite') return ELITE_LIMIT;
    if (c.ai_creator_enabled) return ADDON_LIMIT; // addon on starter/growth
    return 0;
  }

  /** The single source of truth for the UI + generate endpoint. */
  function checkAccess(clinicId) {
    const c = getClinic(clinicId);
    const limit = effectiveLimit(c);
    const used = c.ai_videos_used || 0;
    const hasAccess = limit > 0;
    const overLimit = hasAccess && used >= limit;
    return {
      has_access: hasAccess,
      plan: c.plan,
      addon_active: !!c.ai_creator_enabled,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      over_limit: overLimit,
      extra_cost_aed: EXTRA_COST_AED,
      addon_price_aed: ADDON_PRICE_AED,
      extra_used_this_month: c.ai_extra_count || 0,
      // what the UI shows next
      next_action: !hasAccess ? 'upgrade' : overLimit ? 'pay_extra' : 'generate',
      upgrade_cta: c.plan === 'elite' ? null : 'Upgrade to Elite — AI Creator included (20/mo)',
      addon_cta: hasAccess ? null : 'Add AI Creator — AED 399/mo (8 videos/mo)',
      roi_line: '1 patient = AED 400, 1 AI video = AED 49 = 8x ROI',
    };
  }

  /**
   * Called BEFORE generating.
   * - no access → throws UpgradeRequired
   * - over limit → returns {needs_payment: true, amount_aed: 49} — UI shows confirm modal,
   *   then calls confirmExtra() after clinic taps "Continue".
   */
  function beforeGenerate(clinicId) {
    const a = checkAccess(clinicId);
    if (!a.has_access) {
      const err = new Error('AI Creator requires Elite plan or the AED 399/mo addon');
      err.code = 'UPGRADE_REQUIRED';
      err.access = a;
      throw err;
    }
    if (a.over_limit) {
      return { needs_payment: true, amount_aed: EXTRA_COST_AED, access: a };
    }
    return { needs_payment: false, access: a };
  }

  /** Clinic confirmed the AED 49 extra charge (Stripe hook lands here later). */
  function confirmExtra(clinicId) {
    const c = getClinic(clinicId);
    db.prepare('UPDATE clinics SET ai_extra_count = ai_extra_count + 1, updated_at = ? WHERE id = ?')
      .run(nowIso(), c.id);
    return { ok: true, charged_aed: EXTRA_COST_AED, extra_total: (c.ai_extra_count || 0) + 1 };
  }

  /** After a successful generation (free or paid). */
  function recordUsage(clinicId) {
    const c = getClinic(clinicId);
    db.prepare('UPDATE clinics SET ai_videos_used = ai_videos_used + 1, updated_at = ? WHERE id = ?')
      .run(nowIso(), c.id);
    return checkAccess(clinicId);
  }

  /** Activate the addon (after payment). */
  function activateAddon(clinicId) {
    const c = getClinic(clinicId);
    if (c.plan === 'elite') return { ok: true, note: 'Elite already includes AI Creator' };
    db.prepare('UPDATE clinics SET ai_creator_enabled = 1, updated_at = ? WHERE id = ?').run(nowIso(), c.id);
    return { ok: true, addon_price_aed: ADDON_PRICE_AED, videos_per_month: ADDON_LIMIT };
  }

  function setPlan(clinicId, plan) {
    const allowed = ['starter', 'growth', 'elite', 'pilot'];
    if (!allowed.includes(plan)) throw new Error('invalid plan');
    db.prepare('UPDATE clinics SET plan = ?, updated_at = ? WHERE id = ?').run(plan, nowIso(), clinicId);
    return checkAccess(clinicId);
  }

  return { checkAccess, beforeGenerate, confirmExtra, recordUsage, activateAddon, setPlan, getClinic };
};
