(function (g) {
  const KEY = "hall.board.v1";
  const DENY = new Set([
    "ASS", "FUK", "FUC", "FCK", "NIG", "FAG", "CUM", "SEX", "TIT", "DIC",
    "COC", "PUS", "KYS", "KKK", "GAY", "JEW", "RAP"
  ]);

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  function cleanTag(t) {
    const tag = String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    if (tag.length < 3) return null;
    if (DENY.has(tag) || DENY.has(tag.slice(0, 3))) return null;
    return tag;
  }
  function submit(cab, lane, tag, score) {
    tag = cleanTag(tag);
    score = Math.floor(Number(score));
    if (!tag || !Number.isFinite(score)) return false;
    lane = lane === "AGENT" ? "AGENT" : "HUMAN";
    const data = load();
    if (!data[cab]) data[cab] = { HUMAN: [], AGENT: [] };
    data[cab][lane].push({ tag, score, at: Date.now() });
    data[cab][lane].sort((a, b) => b.score - a.score || a.at - b.at);
    data[cab][lane] = data[cab][lane].slice(0, 10);
    save(data);
    try { localStorage.setItem("hall.lastTag", tag); } catch (_) {}
    return true;
  }
  function top(cab, lane) {
    const data = load();
    return ((data[cab] || {})[lane === "AGENT" ? "AGENT" : "HUMAN"] || []).slice(0, 10);
  }
  function lastTag() {
    try { return localStorage.getItem("hall.lastTag") || ""; }
    catch { return ""; }
  }

  g.Board = { load, submit, top, cleanTag, lastTag };
})(window);
