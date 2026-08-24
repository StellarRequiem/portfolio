/**
 * THE LONG HAUL — the colonist manifest.
 *
 * Supporters get their name on the roster. The point of this module is that the
 * listing is not decorative: a manifest name joins the same draw as every other
 * crew surname, so it can be assigned a role, can carry the run, and can die of
 * hypoxia four days out from Mars. That is the deal, and the manifest page says so
 * in as many words — a credit that cannot lose is not a credit, it is a logo.
 *
 * Everything derived from a name is derived, never stored: berth, deck, and the
 * personal voyage seed all fall out of the same hash the simulation uses, so the
 * data file stays a list of names and the roster still looks like a ship's document.
 *
 * Degrades to nothing. If data/manifest.json is absent, unparseable, or empty, the
 * game runs on its built-in name pool and the page shows an honest empty roster.
 * That is the expected state until there are real supporters to list.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulManifest = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SOURCE = "data/manifest.json";
  const TIERS = ["founder", "contract", "lottery"];
  const TIER_LABEL = { founder: "FOUNDERS BERTH", contract: "CONTRACT CREW", lottery: "LOTTERY COLONIST" };

  let LOADED = { updated: null, colonists: [] };
  let BY_NAME = {};

  /** Same mixer the sim uses, kept local so this module has no load-order dependency. */
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function clean(raw) {
    return String(raw == null ? "" : raw).trim().replace(/\s+/g, " ").toUpperCase();
  }

  /** A name is listable if it fits the roster and reads as a name, not as markup. */
  function valid(name) {
    return name.length >= 2 && name.length <= 18 && /^[A-Z0-9ÀÁÂÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÖØÙÚÛÜÝĆČĐŁŃŇŘŠŚŤŽŻŹ'’\- .]+$/.test(name);
  }

  /**
   * Berth, deck, and voyage seed, all derived from the name. Deriving means the roster
   * is reproducible from the name list alone — no berth registry to keep in sync, and
   * a supporter's berth never silently changes because someone edited a row above them.
   */
  function berthOf(name) {
    const h = hash("berth:" + name);
    const deck = "ABC"[h % 3];
    const num = 100 + (Math.floor(h / 3) % 140); // 100-239, reads like a real berth
    return deck + "-" + num;
  }
  function seedOf(name) {
    const h = hash("voyage:" + name);
    return h.toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
  }

  function normalise(entry) {
    const name = clean(entry && entry.name);
    if (!valid(name)) return null;
    const tier = TIERS.indexOf(entry.tier) >= 0 ? entry.tier : "lottery";
    return {
      name: name,
      tier: tier,
      tierLabel: TIER_LABEL[tier],
      line: entry.line ? String(entry.line).trim().slice(0, 90) : "",
      joined: entry.joined || null,
      berth: berthOf(name),
      seed: seedOf(name)
    };
  }

  /** Accepts the parsed file, returns the normalised roster. Safe on garbage input. */
  function ingest(data) {
    const rows = (data && Array.isArray(data.colonists) ? data.colonists : [])
      .map(normalise)
      .filter(Boolean);

    // Same name twice is one berth. First entry wins so the earliest supporter keeps it.
    const seen = {};
    const roster = rows.filter(function (r) {
      if (seen[r.name]) return false;
      seen[r.name] = true;
      return true;
    });

    roster.sort(function (a, b) {
      const ta = TIERS.indexOf(a.tier), tb = TIERS.indexOf(b.tier);
      if (ta !== tb) return ta - tb;
      if (a.joined && b.joined && a.joined !== b.joined) return a.joined < b.joined ? -1 : 1;
      if (a.joined && !b.joined) return -1;
      if (!a.joined && b.joined) return 1;
      return a.name < b.name ? -1 : 1;
    });

    LOADED = { updated: (data && data.updated) || null, colonists: roster };
    BY_NAME = {};
    roster.forEach(function (r) { BY_NAME[r.name] = r; });
    return roster;
  }

  /**
   * Fetch the manifest and, if a sim module is supplied, fold the names into its draw.
   * Resolves either way — a missing manifest is the normal state, not an error, so it
   * must never block the title screen.
   */
  function load(Haul, url) {
    return fetch(url || SOURCE, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return ingest(j); })
      .catch(function () { return ingest(null); })
      .then(function (roster) {
        if (Haul && typeof Haul.registerPatrons === "function") {
          Haul.registerPatrons(roster.map(function (r) { return r.name; }));
        }
        return roster;
      });
  }

  function roster() { return LOADED.colonists.slice(); }
  function updated() { return LOADED.updated; }
  function lookup(name) { return BY_NAME[clean(name)] || null; }
  function count() {
    const by = { founder: 0, contract: 0, lottery: 0 };
    LOADED.colonists.forEach(function (r) { by[r.tier]++; });
    return { total: LOADED.colonists.length, by: by };
  }

  return {
    SOURCE: SOURCE, TIERS: TIERS, TIER_LABEL: TIER_LABEL,
    load: load, ingest: ingest, roster: roster, updated: updated,
    lookup: lookup, count: count,
    berthOf: berthOf, seedOf: seedOf, valid: valid, clean: clean
  };
});
