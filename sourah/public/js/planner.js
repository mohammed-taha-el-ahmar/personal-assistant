/* Sourah planner — pure logic, no I/O. Works in the browser (window.Planner) and in Node (module.exports). */
(function (root) {
  'use strict';

  var DEFAULTS = {
    sabqiToManzilDays: 21,   // S threshold to move from sabqi to manzil
    maxIntervalDays: 45,     // every memorized page comes back at least this often
    lapseFactor: 0.3,
    minManzilShare: 0.2,     // share of the daily budget reserved for manzil
    overloadFactor: 1.5,     // consolidation mode when due review > 1.5 x budget
    maxRedShare: 0.1,        // consolidation mode when more than 10% of manzil pages are red
    estMinutes: { sabqi: 3, manzil: 2, sabaqPage: 20 }
  };

  // ---------- dates (local calendar days) ----------
  function dayNumber(date) {
    var d = date instanceof Date ? date : new Date(date);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  }
  function dayToISO(n) { return new Date(n * 864e5).toISOString().slice(0, 10); }

  // ---------- memory model ----------
  function retention(daysSince, S) {
    if (!S || S <= 0) return 0;
    return Math.pow(0.9, Math.max(0, daysSince) / S);
  }
  function interval(S, cfg) {
    cfg = cfg || DEFAULTS;
    return Math.max(1, Math.min(Math.round(S), cfg.maxIntervalDays));
  }
  function pageR(ps, today) {
    if (!ps || ps.status === 'sabaq' || ps.last == null) return null;
    return retention(today - ps.last, ps.S);
  }
  function isDue(ps, today, cfg) {
    if (!ps || ps.last == null) return false;
    if (ps.status === 'sabqi') return today - ps.last >= 1;
    if (ps.status === 'manzil') return today - ps.last >= interval(ps.S, cfg);
    return false;
  }

  /** Grade proposed from the errors the learner marked.
   *  errors: number of wrong words; words: words in the passage; forgotAyah: a whole ayah was forgotten. */
  function gradeFromErrors(errors, words, forgotAyah) {
    if (forgotAyah) return 1;
    var scale = Math.max(0.5, (words || 130) / 130);   // thresholds are per full page (~130 words)
    if (errors === 0) return 4;
    if (errors <= Math.max(1, Math.round(2 * scale))) return 3;
    if (errors <= Math.max(2, Math.round(5 * scale))) return 2;
    return 1;
  }

  /** Returns a NEW page state after a review of a page already in sabqi or manzil. */
  function applyReview(ps, grade, today, cfg) {
    cfg = cfg || DEFAULTS;
    var n = Object.assign({}, ps);
    var D = n.D == null ? 5 : n.D;
    var S = n.S || 1;
    if (grade <= 1) {
      S = Math.max(1, S * cfg.lapseFactor);
      n.lapses = (n.lapses || 0) + 1;
      n.status = 'sabqi';
    } else if (grade === 2) {
      S = S * 1.2;
    } else if (grade === 3) {
      S = S * Math.max(1.3, 2.5 - 0.15 * D);
    } else {
      S = S * Math.max(1.5, 3.5 - 0.15 * D);
    }
    if (grade <= 2) D = Math.min(10, D + 1);
    if (grade === 4) D = Math.max(1, D - 0.5);
    n.S = Math.round(S * 100) / 100;
    n.D = D;
    n.last = today;
    n.reviews = (n.reviews || 0) + 1;
    if (n.status === 'sabqi' && n.S >= cfg.sabqiToManzilDays) n.status = 'manzil';
    return n;
  }

  /** Sabaq: one part of a page learned. parts = number of parts the page is split into. */
  function applySabaq(ps, grade, today, parts) {
    var n = Object.assign({ status: 'sabaq', part: 0, parts: parts }, ps || {});
    n.parts = n.parts || parts;
    if (grade < 3) { n.lastSabaq = today; return n; }   // same part again next time
    n.part = (n.part || 0) + 1;
    n.lastSabaq = today;
    if (n.part >= n.parts) {
      n = { status: 'sabqi', S: 1, D: 5, last: today, lapses: 0, reviews: 0, memorized: today };
    }
    return n;
  }

  /** Pages already known at onboarding: spread their first reviews over the coming weeks. */
  function seedKnownPages(pageIds, today, S) {
    S = S || 14;
    var out = {};
    pageIds.forEach(function (p, i) {
      out[p] = { status: 'manzil', S: S, D: 5, last: today - (i % S), lapses: 0, reviews: 0, memorized: today, seeded: true };
    });
    return out;
  }

  function nextSabaqPage(pages, direction) {
    // a page already in progress comes first
    for (var k in pages) if (pages[k].status === 'sabaq') return +k;
    if (direction === 'fatiha') { for (var p = 1; p <= 604; p++) if (!pages[p]) return p; }
    else { for (var q = 604; q >= 1; q--) if (!pages[q]) return q; }
    return null;
  }

  function avgMinutes(durations, kind, fallback) {
    var arr = (durations && durations[kind]) || [];
    if (arr.length < 5) return fallback;
    var s = 0; arr.forEach(function (x) { s += x; });
    return s / arr.length / 60;
  }

  /**
   * Builds today's session.
   * state = { settings:{minutes, pace, direction}, pages:{[id]:pageState}, durations:{sabqi:[s], manzil:[s], sabaq:[s]} }
   * Returns { sabqi:[ids], manzil:[ids], sabaq:{page, part, parts}|null, minutes:{...}, consolidation:null|reason, backlog }
   */
  function buildSession(state, today, cfg) {
    cfg = cfg || DEFAULTS;
    var st = state.settings || {};
    var B = st.minutes || 20;
    var pace = st.pace || 1;
    var pages = state.pages || {};
    var mSabqi = avgMinutes(state.durations, 'sabqi', cfg.estMinutes.sabqi);
    var mManzil = avgMinutes(state.durations, 'manzil', cfg.estMinutes.manzil);
    var mSabaq = avgMinutes(state.durations, 'sabaq', cfg.estMinutes.sabaqPage * pace);

    var sabqi = [], dueManzil = [], manzilCount = 0, red = 0;
    Object.keys(pages).forEach(function (k) {
      var ps = pages[k], id = +k;
      if (ps.status === 'sabqi' && isDue(ps, today, cfg)) sabqi.push(id);
      if (ps.status === 'manzil') {
        manzilCount++;
        var R = pageR(ps, today);
        if (R < 0.8) red++;
        if (isDue(ps, today, cfg)) dueManzil.push({ id: id, R: R });
      }
    });
    sabqi.sort(function (a, b) { return a - b; });
    dueManzil.sort(function (a, b) { return a.R - b.R || a.id - b.id; });

    var tSabqi = sabqi.length * mSabqi;
    var tDue = dueManzil.length * mManzil;

    var consolidation = null;
    if (tSabqi + tDue > cfg.overloadFactor * B) consolidation = 'overload';
    else if (manzilCount >= 10 && red / manzilCount > cfg.maxRedShare) consolidation = 'fragile';

    // sabaq for today (one part per day)
    var sabaq = null;
    var doneSabaqToday = Object.keys(pages).some(function (k) {
      var ps = pages[k]; return ps.lastSabaq === today || ps.memorized === today && !ps.seeded;
    });
    if (!consolidation && !doneSabaqToday) {
      var p = nextSabaqPage(pages, st.direction);
      if (p) {
        var cur = pages[p];
        var parts = cur && cur.parts ? cur.parts : Math.max(1, Math.round(1 / pace));
        sabaq = { page: p, part: cur ? cur.part || 0 : 0, parts: parts };
      }
    }
    var tSabaq = sabaq ? mSabaq : 0;

    var manzilBudget = Math.max(cfg.minManzilShare * B, B - tSabqi - tSabaq);
    var nManzil = Math.min(dueManzil.length, Math.max(dueManzil.length ? 1 : 0, Math.floor(manzilBudget / mManzil + 1e-9)));
    var manzil = dueManzil.slice(0, nManzil).map(function (x) { return x.id; });

    return {
      sabqi: sabqi,
      manzil: manzil,
      sabaq: sabaq,
      backlog: dueManzil.length - manzil.length,
      consolidation: consolidation,
      minutes: {
        sabqi: Math.round(sabqi.length * mSabqi),
        manzil: Math.round(manzil.length * mManzil),
        sabaq: Math.round(tSabaq),
        total: Math.round(sabqi.length * mSabqi + manzil.length * mManzil + tSabaq)
      }
    };
  }

  /** Streak: consecutive active days ending today (or yesterday), one missed day tolerated per 7 ("gel"). */
  function streak(activeDays, today) {
    var set = {}; (activeDays || []).forEach(function (d) { set[d] = true; });
    var d = set[today] ? today : today - 1;
    if (!set[d]) return 0;
    var count = 0, sinceFreeze = Infinity;
    while (true) {
      if (set[d]) { count++; sinceFreeze++; d--; continue; }
      if (set[d - 1] && sinceFreeze >= 7) { sinceFreeze = 0; d--; continue; }
      break;
    }
    return count;
  }

  function clonePages(pages) { var o = {}; for (var k in pages) o[k] = Object.assign({}, pages[k]); return o; }

  /**
   * Projects the coming days, assuming every planned review is done with grade 3 and every sabaq part is validated.
   * Returns { days: [{day, sabqi, manzil, sabaq, minutes, consolidation}], milestones: [{day, juz}], doneDay }
   */
  function forecast(state, today, horizon, juzOfPage, cfg) {
    var sim = { settings: state.settings, durations: state.durations, pages: clonePages(state.pages || {}) };
    var days = [], milestones = [], doneDay = null;
    var juzLeft = {};
    if (juzOfPage) {
      for (var p = 1; p <= 604; p++) {
        var j = juzOfPage[p - 1], ps = sim.pages[p];
        if (!ps || ps.status === 'sabaq') juzLeft[j] = (juzLeft[j] || 0) + 1;
      }
    }
    for (var i = 0; i < horizon; i++) {
      var d = today + i;
      var s = buildSession(sim, d, cfg);
      days.push({ day: d, sabqi: s.sabqi.length, manzil: s.manzil.length, sabaq: s.sabaq, minutes: s.minutes, consolidation: s.consolidation });
      s.sabqi.concat(s.manzil).forEach(function (id) { sim.pages[id] = applyReview(sim.pages[id], 3, d, cfg); });
      if (s.sabaq) {
        var np = applySabaq(sim.pages[s.sabaq.page], 4, d, s.sabaq.parts);
        sim.pages[s.sabaq.page] = np;
        if (np.status !== 'sabaq' && juzOfPage) {
          var jj = juzOfPage[s.sabaq.page - 1];
          juzLeft[jj]--;
          if (juzLeft[jj] === 0) milestones.push({ day: d, juz: jj });
        }
      }
      if (doneDay == null && nextSabaqPage(sim.pages, state.settings.direction) == null) doneDay = d;
    }
    return { days: days, milestones: milestones, doneDay: doneDay };
  }

  var api = {
    forecast: forecast,
    DEFAULTS: DEFAULTS, dayNumber: dayNumber, dayToISO: dayToISO, retention: retention, interval: interval,
    pageR: pageR, isDue: isDue, gradeFromErrors: gradeFromErrors, applyReview: applyReview, applySabaq: applySabaq,
    seedKnownPages: seedKnownPages, nextSabaqPage: nextSabaqPage, buildSession: buildSession, streak: streak
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Planner = api;
})(typeof window !== 'undefined' ? window : this);
