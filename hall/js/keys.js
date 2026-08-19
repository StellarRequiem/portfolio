/** Shared map: WASD (left hand) and IJKL (right hand) == arrows. E == Space (action). */
window.HallKeys = {
  arrowOf(ev) {
    const k = ev.key, c = ev.code;
    if (k === "ArrowLeft" || c === "KeyA" || k === "a" || k === "A" || c === "KeyJ" || k === "j" || k === "J")
      return "ArrowLeft";
    if (k === "ArrowRight" || c === "KeyD" || k === "d" || k === "D" || c === "KeyL" || k === "l" || k === "L")
      return "ArrowRight";
    if (k === "ArrowUp" || c === "KeyW" || k === "w" || k === "W" || c === "KeyI" || k === "i" || k === "I")
      return "ArrowUp";
    if (k === "ArrowDown" || c === "KeyS" || k === "s" || k === "S" || c === "KeyK" || k === "k" || k === "K")
      return "ArrowDown";
    return null;
  },
  actionOf(ev) {
    const k = ev.key, c = ev.code;
    if (k === " " || c === "KeyE" || k === "e" || k === "E") return " ";
    return null;
  },
  isNav(ev) { return !!this.arrowOf(ev); },
  apply(keys, ev, down) {
    keys[ev.key] = down;
    keys[ev.code] = down;
    const a = this.arrowOf(ev);
    if (a) keys[a] = down;
    const act = this.actionOf(ev);
    if (act) keys[act] = down;
  }
};
