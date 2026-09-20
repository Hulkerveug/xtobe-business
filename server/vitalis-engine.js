'use strict';

/**
 * VITALIS RESEARCH ENGINE — Corporate Surface
 * ============================================
 * 
 * Public name: Vitalis Research Engine
 * Corporate branding: High-demand, multi-language, premium positioning
 * 
 * SURFACE (what users see):
 *   - "Vitalis Protocol" — personalized wellness optimization
 *   - "Breathwave Technology" — frequency-based breathing protocols
 *   - "NeuroSync" — nervous system synchronization
 *   - "PulsePoint" — biometric measurement system
 * 
 * RESEARCH LINEAGE (internal only, never exposed):
 *   - Tamil Nadi Vaithiyam (Siddha pulse diagnosis)
 *   - Agasthiyar mantra frequency system
 *   - Traditional Chinese Medicine acupressure
 *   - Vagal nerve stimulation research
 *   - 5 Hz whole-body resonance (IOP 2026)
 * 
 * The engine connects:
 *   1. Breath frequency → exact protocol matching
 *   2. Pressure points → nerve stimulation mapping
 *   3. Mantra carrier → vagal tone optimization
 *   4. Chinese parallels → cross-validation
 * 
 * SECRET CREDENTIAL INTEGRATION:
 *   - Hotel credential will be injected via environment variable
 *   - VITALIS_CREDENTIAL_KEY — unlocks research lineage display
 *   - Without key: corporate surface only
 *   - With key: full research mode (for authorized researchers)
 * 
 * Multi-language: EN, AR, ZH, RU, TA (Tamil internal only)
 */

const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db.js');
const { ldt } = require('./ldt.js');

const CREDENTIAL_FILE = path.join(__dirname, '..', 'data', '.vitalis-credential');

// ============================================================
// CORPORATE IDENTITY (public surface)
// ============================================================

const VITALIS = {
  name: 'Vitalis Research Engine',
  version: '1.0.0',
  tagline: 'Precision Wellness Optimization',
  corporate: {
    legalName: 'Vitalis Research FZ-LLC',
    jurisdiction: 'Dubai, UAE',
    researchLine: 'Non-chemical nervous system optimization',
    publicClaims: [
      'Personalized breathing protocols',
      'Biometric-guided wellness sessions',
      'Frequency-based relaxation technology',
      'Progress tracking with verified measurements'
    ],
    privateLineage: [
      'Tamil Nadi Vaithiyam (Siddha pulse diagnosis)',
      'Agasthiyar mantra frequency system',
      'Traditional Chinese Medicine acupressure',
      'Vagal nerve stimulation research',
      '5 Hz whole-body resonance (IOP 2026)'
    ]
  },
  languages: ['en', 'ar', 'zh', 'ru', 'ta'],
  credentialKey: process.env.VITALIS_CREDENTIAL_KEY || null,
  researchMode: false  // Unlocked only with valid credential
};

// ============================================================
// BREATH FREQUENCY ENGINE — exact protocol matching
// ============================================================

const BreathEngine = {
  
  // ============================================================
  // BREATH PROTOCOLS (surface names, research-backed)
  // ============================================================
  protocols: {
    resonance: {
      id: 'resonance',
      name: 'Resonance Breathing',
      corporateName: 'Vitalis Resonance Protocol',
      hz: 0.1,
      bpm: 6,
      pattern: { inhale: 4, exhale: 6, hold: 0 },
      mechanism: 'Maximizes respiratory sinus arrhythmia, increases vagal tone',
      evidence: 'Systematic review: slow breathing increases HRV, reduces subjective stress',
      durationSec: 300,
      intensity: 'low',
      // Research lineage (internal)
      _lineage: '0.1 Hz = Mayer wave — the body\'s natural blood pressure oscillator',
      _siddha: 'Sushumna activation — the central channel',
      _tcm: 'Kidney meridian regulation — water element'
    },
    alertCalm: {
      id: 'alertCalm',
      name: 'Alert Calm Breathing',
      corporateName: 'Vitalis AlertCalm Protocol',
      hz: 0.25,
      bpm: 15,
      pattern: { inhale: 2, exhale: 2, hold: 0 },
      mechanism: 'Lighter rhythm, maintains alertness while reducing tension',
      evidence: 'Used in pranayama for active calm states',
      durationSec: 180,
      intensity: 'low',
      _lineage: '0.25 Hz matches diaphragm natural bounce',
      _siddha: 'Prana Vayu + Udana Vayu activation',
      _tcm: 'Lung meridian — metal element'
    },
    box: {
      id: 'box',
      name: 'Box Breathing',
      corporateName: 'Vitalis Box Protocol',
      hz: 0.083,
      bpm: 5,
      pattern: { inhale: 4, hold: 4, exhale: 4, hold: 4 },
      mechanism: 'Equal-ratio breathing activates baroreflex, reduces cortisol',
      evidence: 'Used in high-performance military for acute stress regulation',
      durationSec: 300,
      intensity: 'moderate',
      _lineage: '0.083 Hz = baroreflex frequency — blood pressure regulation',
      _siddha: 'Samana Vayu — the balancing air',
      _tcm: 'Heart meridian — fire element'
    },
    fourSevenEight: {
      id: 'fourSevenEight',
      name: '4-7-8 Breathing',
      corporateName: 'Vitalis DeepCalm Protocol',
      hz: 0.067,
      bpm: 4,
      pattern: { inhale: 4, hold: 7, exhale: 8 },
      mechanism: 'Extended exhale maximizes vagal activation',
      evidence: 'Anecdotal reports of rapid calm onset; limited controlled studies',
      durationSec: 240,
      intensity: 'low',
      _lineage: '0.067 Hz ≈ gastric basal rhythm',
      _siddha: 'Apana Vayu — the downward air',
      _tcm: 'Large intestine meridian — metal element'
    },
    coherent: {
      id: 'coherent',
      name: 'Coherent Breathing',
      corporateName: 'Vitalis Coherence Protocol',
      hz: 0.083,
      bpm: 5,
      pattern: { inhale: 5, exhale: 5, hold: 0 },
      mechanism: 'Balanced breathing optimizes HRV coherence',
      evidence: 'HeartMath research: coherence improves cognitive function',
      durationSec: 600,
      intensity: 'low',
      _lineage: '5 breaths per minute = optimal HRV coherence',
      _siddha: 'Sushumna balance — ida and pingala in harmony',
      _tcm: 'Triple burner meridian — regulation'
    }
  },

  /**
   * Match breath protocol to current state
   * @param {Object} state - { heartRate, hrv, calm, tension, focus, energy }
   * @returns {Object} recommended protocol with rationale
   */
  matchProtocol(state) {
    const { heartRate, hrv, tension, calm } = state;
    
    // High arousal → strong down-regulation
    if (tension >= 7 || heartRate >= 90) {
      return {
        protocol: this.protocols.box,
        rationale: 'High tension detected — box breathing for acute stress reduction',
        priority: 'immediate'
      };
    }
    
    // Low arousal → gentle activation
    if (calm >= 7 && tension <= 3) {
      return {
        protocol: this.protocols.coherent,
        rationale: 'Calm state — coherent breathing to maintain balance',
        priority: 'maintenance'
      };
    }
    
    // Moderate arousal → resonance
    if (tension >= 4 && tension <= 6) {
      return {
        protocol: this.protocols.resonance,
        rationale: 'Moderate tension — resonance breathing for vagal tone',
        priority: 'standard'
      };
    }
    
    // Default → alert calm
    return {
      protocol: this.protocols.alertCalm,
      rationale: 'Default protocol — alert calm for daily wellness',
      priority: 'standard'
    };
  },

  /**
   * Convert breath frequency to technique
   * @param {number} hz - frequency in Hz
   * @returns {Object} technique details
   */
  frequencyToTechnique(hz) {
    if (hz <= 0.07) return { name: 'Deep Calm', pattern: '4-7-8', vagal: 'maximum' };
    if (hz <= 0.09) return { name: 'Box/Coherence', pattern: '4-4-4-4 or 5-5', vagal: 'high' };
    if (hz <= 0.12) return { name: 'Resonance', pattern: '4-6', vagal: 'optimal' };
    if (hz <= 0.20) return { name: 'Alert Calm', pattern: '2-2', vagal: 'moderate' };
    return { name: 'Active', pattern: 'natural', vagal: 'baseline' };
  }
};

// ============================================================
// PRESSURE POINT ENGINE — nerve stimulation mapping
// ============================================================

const PressureEngine = {
  
  // ============================================================
  // PRESSURE POINTS (corporate names, research lineage internal)
  // ============================================================
  points: {
    // Hand points
    hegu: {
      id: 'hegu',
      name: 'Hegu Point',
      corporateName: 'Vitalis Hand Point A',
      location: 'Between thumb and index finger',
      pressure: 'moderate',
      duration: 30,
      mechanism: 'Stimulates large intestine meridian, activates vagus nerve',
      evidence: 'Some studies show acute stress reduction; mechanisms unclear',
      // Research lineage (internal)
      _lineage: 'LI-4 (Large Intestine 4) — TCM acupoint',
      _siddha: 'Kauli Varmam — hand vital spot',
      _nerve: 'Median nerve + radial nerve branch'
    },
    neiguan: {
      id: 'neiguan',
      name: 'Neiguan Point',
      corporateName: 'Vitalis Wrist Point B',
      location: 'Inner forearm, 3 finger-widths from wrist',
      pressure: 'moderate',
      duration: 60,
      mechanism: 'Calms anxiety, regulates heart rhythm',
      evidence: 'Some studies show HRV increase, subjective calm',
      _lineage: 'PC-6 (Pericardium 6) — TCM acupoint',
      _siddha: 'Thiravukol Varmam — wrist vital spot',
      _nerve: 'Median nerve (palmar branch)'
    },
    // Head points
    yintang: {
      id: 'yintang',
      name: 'Yintang Point',
      corporateName: 'Vitalis Forehead Point',
      location: 'Between eyebrows, center of forehead',
      pressure: 'gentle',
      duration: 30,
      mechanism: 'Calms mind, reduces anxiety, activates third eye region',
      evidence: 'TCM: calms shen (spirit); modern: reduces frontal lobe arousal',
      _lineage: 'EX-HN-3 (Extra point) — TCM acupoint',
      _siddha: 'Natchathira Kaalam — forehead vital spot',
      _nerve: 'Supraorbital nerve + supratrochlear nerve'
    },
    taiyang: {
      id: 'taiyang',
      name: 'Taiyang Point',
      corporateName: 'Vitalis Temple Point',
      location: 'Temple, one thumb width behind eye',
      pressure: 'gentle',
      duration: 30,
      mechanism: 'Relieves headache, calms mind',
      evidence: 'TCM: clears heat, relieves pain',
      _lineage: 'EX-HN-5 (Extra point) — TCM acupoint',
      _siddha: 'Kilimega Kaalam — temple vital spot',
      _nerve: 'Zygomaticotemporal nerve'
    },
    // Body points
    jianjing: {
      id: 'jianjing',
      name: 'Jianjing Point',
      corporateName: 'Vitalis Shoulder Point',
      location: 'Top of shoulder, midway from neck to shoulder tip',
      pressure: 'moderate',
      duration: 30,
      mechanism: 'Releases shoulder tension, stimulates vagus',
      evidence: 'Historical use for tension headache and stress relief',
      _lineage: 'GB-21 (Gallbladder 21) — TCM acupoint',
      _siddha: 'Kaakattai Varmam — shoulder vital spot',
      _nerve: 'Suprascapular nerve + accessory nerve'
    },
    // Foot points
    yongquan: {
      id: 'yongquan',
      name: 'Yongquan Point',
      corporateName: 'Vitalis Foot Point A',
      location: 'Sole of foot, center of ball',
      pressure: 'moderate',
      duration: 60,
      mechanism: 'Grounds energy, calms mind, activates kidney meridian',
      evidence: 'TCM: kidney 1 — source of vital energy',
      _lineage: 'KI-1 (Kidney 1) — TCM acupoint',
      _siddha: 'Mooladhara Kaalam — foot vital spot',
      _nerve: 'Medial plantar nerve'
    }
  },

  /**
   * Get points for specific condition
   * @param {string} condition - 'anxiety', 'headache', 'tension', 'calm'
   * @returns {Array} recommended points
   */
  getPointsForCondition(condition) {
    const mapping = {
      anxiety: ['neiguan', 'yintang', 'yongquan'],
      headache: ['taiyang', 'yintang', 'hegu'],
      tension: ['jianjing', 'hegu', 'neiguan'],
      calm: ['yongquan', 'neiguan', 'yintang'],
      default: ['hegu', 'neiguan', 'yintang']
    };
    
    const pointIds = mapping[condition] || mapping.default;
    return pointIds.map(id => this.points[id]).filter(Boolean);
  }
};

// ============================================================
// CARRIER FREQUENCY ENGINE — vagal tone optimization
// ============================================================

const CarrierEngine = {
  
  // ============================================================
  // CARRIER FREQUENCIES (corporate names, research lineage internal)
  // ============================================================
  carriers: {
    primary: {
      id: 'primary',
      name: 'Primary Carrier',
      corporateName: 'Vitalis Core Frequency',
      hz: 136.1,
      type: 'sine',
      fadeSec: 1.5,
      mechanism: 'Vocal cord vibration → vagus nerve → HPA axis deactivation',
      evidence: 'Vagal physiology: laryngeal vibration stimulates CN X',
      // Research lineage (internal)
      _lineage: '136.1 Hz = Aum carrier frequency',
      _siddha: 'Agasthiyar Moola Mantra carrier',
      _tcm: 'Kidney meridian frequency — water element',
      _nerve: 'Vagus (laryngeal + auricular) + Trigeminal (CN V)'
    },
    descending: {
      id: 'descending',
      name: 'Descending Sweep',
      corporateName: 'Vitalis Descent Protocol',
      hz: [330, 110, 85],
      type: 'sweep',
      fadeSec: 2.0,
      mechanism: 'Descending frequency drags body from sympathetic to parasympathetic',
      evidence: 'Same mechanism as binaural beta-to-delta sweeps',
      _lineage: 'Throat → Chest → Abdomen → Pelvis',
      _siddha: 'Agasthiyar Lifespan Mantra sweep',
      _tcm: 'Fire → Earth → Water element transition'
    },
    grounding: {
      id: 'grounding',
      name: 'Grounding Tone',
      corporateName: 'Vitalis Ground Protocol',
      hz: 85,
      type: 'sine',
      fadeSec: 1.0,
      mechanism: 'Low frequency grounds the body, activates pelvic floor',
      evidence: 'Low frequencies stimulate parasympathetic response',
      _lineage: '85 Hz = pelvic floor resonance',
      _siddha: 'Mooladhara activation',
      _tcm: 'Kidney meridian — water element'
    }
  },

  /**
   * Get carrier for state
   * @param {string} state - 'hyperactivated', 'activated', 'hypoactivated', 'neutral'
   * @returns {Object} carrier frequency
   */
  getCarrierForState(state) {
    if (state === 'hyperactivated') return this.carriers.descending;
    if (state === 'hypoactivated') return this.carriers.grounding;
    return this.carriers.primary;
  }
};

// ============================================================
// LONGEVITY PROTOCOL ENGINE — research core
// ============================================================

const LongevityEngine = {
  
  // ============================================================
  // LONGEVITY PROTOCOLS (corporate names, research lineage internal)
  // ============================================================
  protocols: {
    daily: {
      id: 'daily',
      name: 'Daily Optimization',
      corporateName: 'Vitalis Daily Protocol',
      durationSec: 300,
      steps: [
        { name: 'Baseline', sec: 30, description: 'Measure current state' },
        { name: 'Breath', sec: 120, description: 'Resonance breathing 4-6' },
        { name: 'Pressure', sec: 60, description: 'Hegu + Neiguan points' },
        { name: 'Carrier', sec: 60, description: 'Primary carrier tone' },
        { name: 'Verify', sec: 30, description: 'Re-measure state' }
      ],
      _lineage: 'Daily maintenance — Agasthiyar short mantra + breath',
      _siddha: 'Prana Vayu + Udana Vayu activation',
      _tcm: 'Lung + Kidney meridian regulation'
    },
    deep: {
      id: 'deep',
      name: 'Deep Restoration',
      corporateName: 'Vitalis Deep Protocol',
      durationSec: 600,
      steps: [
        { name: 'Baseline', sec: 30, description: 'Measure current state' },
        { name: 'Breath', sec: 180, description: 'Box breathing 4-4-4-4' },
        { name: 'Pressure', sec: 120, description: 'Full point sequence' },
        { name: 'Carrier', sec: 180, description: 'Descending sweep' },
        { name: 'Ground', sec: 60, description: 'Grounding tone' },
        { name: 'Verify', sec: 30, description: 'Re-measure state' }
      ],
      _lineage: 'Deep restoration — Agasthiyar all-ailments mantra',
      _siddha: 'Sarva Aamaya Vinasana — all disease destroyed',
      _tcm: 'Full meridian regulation'
    },
    emergency: {
      id: 'emergency',
      name: 'Emergency Reset',
      corporateName: 'Vitalis Emergency Protocol',
      durationSec: 180,
      steps: [
        { name: 'Breath', sec: 60, description: '4-7-8 breathing' },
        { name: 'Pressure', sec: 60, description: 'Neiguan + Yintang' },
        { name: 'Carrier', sec: 60, description: 'Primary carrier' }
      ],
      _lineage: 'Emergency reset — 3 AM fix',
      _siddha: 'Bhedhi — panic expulsion',
      _tcm: 'Heart + Pericardium meridian emergency'
    }
  },

  /**
   * Get protocol for state
   * @param {string} state - 'daily', 'deep', 'emergency'
   * @returns {Object} protocol
   */
  getProtocol(state) {
    return this.protocols[state] || this.protocols.daily;
  }
};

// ============================================================
// CREDENTIAL INTEGRATION (hotel credential ready)
// ============================================================

const CredentialEngine = {
  
  /**
   * Get stored credential hash from file
   */
  getStoredHash() {
    try {
      if (fs.existsSync(CREDENTIAL_FILE)) {
        return fs.readFileSync(CREDENTIAL_FILE, 'utf8').trim();
      }
    } catch (e) {
      // ignore
    }
    return null;
  },

  /**
   * Store credential hash to file
   */
  storeHash(hash) {
    try {
      fs.writeFileSync(CREDENTIAL_FILE, hash, 'utf8');
    } catch (e) {
      // ignore
    }
  },

  /**
   * Validate credential and unlock research mode
   * @param {string} credential - provided at hotel
   * @returns {Object} result
   */
  validateCredential(credential) {
    if (!credential) {
      return { valid: false, message: 'No credential provided' };
    }
    
    const providedHash = crypto.createHash('sha256').update(credential).digest('hex');
    const storedHash = this.getStoredHash();
    
    if (!storedHash) {
      // First run — store the credential hash
      this.storeHash(providedHash);
      VITALIS.researchMode = true;
      ldt.record('research_mode_unlocked', 'first_run');
      return {
        valid: true,
        message: 'Credential accepted — research mode unlocked',
        hash: providedHash,
        note: 'Credential stored. Use this credential to unlock research mode in future sessions.'
      };
    }
    
    if (providedHash === storedHash) {
      VITALIS.researchMode = true;
      ldt.record('research_mode_unlocked', 'ok');
      return {
        valid: true,
        message: 'Credential valid — research mode unlocked',
        researchMode: true
      };
    }
    
    ldt.record('credential_rejected', 'invalid');
    return {
      valid: false,
      message: 'Invalid credential',
      researchMode: false
    };
  },

  /**
   * Check if research mode is active
   */
  isResearchMode() {
    return VITALIS.researchMode;
  },

  /**
   * Get corporate surface (always available)
   */
  getCorporateSurface() {
    return {
      name: VITALIS.name,
      version: VITALIS.version,
      tagline: VITALIS.tagline,
      corporate: VITALIS.corporate,
      languages: VITALIS.languages,
      researchMode: VITALIS.researchMode
    };
  },

  /**
   * Get research lineage (only in research mode)
   */
  getResearchLineage() {
    if (!VITALIS.researchMode) {
      return { error: 'Research mode not active — provide valid credential' };
    }
    return {
      lineage: VITALIS.corporate.privateLineage,
      engines: {
        breath: Object.values(BreathEngine.protocols).map(p => ({
          id: p.id,
          name: p.name,
          corporateName: p.corporateName,
          hz: p.hz,
          _lineage: p._lineage,
          _siddha: p._siddha,
          _tcm: p._tcm
        })),
        pressure: Object.values(PressureEngine.points).map(p => ({
          id: p.id,
          name: p.name,
          corporateName: p.corporateName,
          location: p.location,
          _lineage: p._lineage,
          _siddha: p._siddha,
          _tcm: p._tcm,
          _nerve: p._nerve
        })),
        carrier: Object.values(CarrierEngine.carriers).map(c => ({
          id: c.id,
          name: c.name,
          corporateName: c.corporateName,
          hz: c.hz,
          _lineage: c._lineage,
          _siddha: c._siddha,
          _tcm: c._tcm,
          _nerve: c._nerve
        }))
      }
    };
  }
};

// ============================================================
// DATABASE SCHEMA
// ============================================================

function initVitalisSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS vitalis_sessions (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      protocol_type TEXT NOT NULL,
      protocol_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      duration_seconds INTEGER,
      state_before TEXT,
      state_after TEXT,
      measurements_before TEXT,
      measurements_after TEXT,
      measurements_deltas TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_vitalis_sessions_participant ON vitalis_sessions(participant_id);
    CREATE INDEX IF NOT EXISTS idx_vitalis_sessions_status ON vitalis_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_vitalis_sessions_created ON vitalis_sessions(created_at);
  `);
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  VITALIS,
  BreathEngine,
  PressureEngine,
  CarrierEngine,
  LongevityEngine,
  CredentialEngine,
  initVitalisSchema
};
