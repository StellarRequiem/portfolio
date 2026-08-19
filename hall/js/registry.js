window.CABS = [
  { id: "well", name: "WELL", era: "PZL", blurb: "STACK · COMBO · RISE",  genre: "puzzle", bank: "floor1" },
  { id: "grain",name: "GRAIN",era: "LAB", blurb: "SIZE · POUR · FLUX",    genre: "grain",  bank: "floor1" },
  { id: "void", name: "VOID", era: "FLD", blurb: "THRUST · SPLIT · WRAP", genre: "field",  bank: "floor1" },
  { id: "tar",  name: "TAR",  era: "RCE", blurb: "BUMP · JUMP · HEAT",    genre: "race",   bank: "floor1" },
  { id: "flip", name: "FLIP", era: "TBL", blurb: "PLUNGE · NODE · DRAIN", genre: "table",  bank: "floor1" },

  { id: "cube", name: "CUBE", era: "NET", blurb: "DODGE · DEPTH · HOLD",   genre: "web",    bank: "deep" },

  // Long-form cab: ships as its own surface (see `href`), not a single-canvas script.
  { id: "haul", name: "HAUL", era: "ARK", blurb: "RATION · DRIFT · ARRIVE", genre: "journey",
    bank: "longform", href: "haul/" }
];

window.BANKS = [
  { id: "floor1",   title: "FLOOR 1" },
  { id: "deep",     title: "DEEP FLOOR" },
  { id: "longform", title: "LONG FORM" }
];
