window.Cab = { id: "haul", name: "HAUL", mount() {
  location.replace(new URL("haul/", location.href).href);
  return {
    destroy() {},
    act() {},
    state() { return { cab: "haul", alive: true, score: 0, legal: ["fire"] }; }
  };
} };
