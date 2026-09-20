'use strict';

/**
 * LDT stub for xtobe-2 — minimal loop detection telemetry.
 * Full implementation lives in MindMirror-production.
 */

class LoopDeadTeleporter {
  constructor() {
    this.history = [];
    this.maxHistory = 50;
    this.loopThreshold = 3;
    this.active = false;
    this.escapesAttempted = [];
  }

  record(action, result) {
    this.history.push({
      timestamp: Date.now(),
      action: typeof action === 'string' ? action : JSON.stringify(action).slice(0, 200),
      result: typeof result === 'string' ? result.slice(0, 200) : JSON.stringify(result).slice(0, 200),
      id: require('crypto').randomUUID()
    });
    if (this.history.length > this.maxHistory) this.history.shift();
    return this.detectLoop();
  }

  detectLoop() {
    if (this.history.length < 3) return null;
    const recent = this.history.slice(-10);
    const pairCounts = {};
    recent.forEach(h => {
      const pair = `${h.action}::${h.result}`;
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    });
    const repeatedPairs = Object.entries(pairCounts)
      .filter(([_, count]) => count >= this.loopThreshold)
      .map(([pair, count]) => {
        const [action, result] = pair.split('::');
        return { action, result, count };
      });
    if (repeatedPairs.length > 0) {
      this.active = true;
      return { loopDetected: true, repeatedPairs, historyLength: this.history.length };
    }
    this.active = false;
    return null;
  }

  getEscapeRoutes(loopInfo) {
    return [
      { id: 'A', label: 'Stop current action chain', action: 'STOP' },
      { id: 'B', label: 'Change approach entirely', action: 'CHANGE_APPROACH' },
      { id: 'C', label: 'Ask user directly', action: 'ASK_USER' },
      { id: 'D', label: 'Simplify to single step', action: 'SIMPLIFY' },
      { id: 'E', label: 'Declare block and stop', action: 'DECLARE_BLOCK' }
    ];
  }

  getStatus() {
    return { active: this.active, historyLength: this.history.length, totalEscapes: this.escapesAttempted.length };
  }

  reset() {
    this.history = [];
    this.active = false;
    this.escapesAttempted = [];
  }

  middleware() {
    return (req, res, next) => next();
  }
}

const ldt = new LoopDeadTeleporter();

module.exports = { LoopDeadTeleporter, ldt };
