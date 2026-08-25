/**
 * Bump on every deploy that changes a cab script.
 *
 * Cab sources used to load from a bare `cabs/<id>.js`, so a browser that had the file
 * would keep serving it — the same staleness that once made a newly published cab
 * invisible on the floor, only harder to spot because the cabinet still ran, just an
 * older version of itself. The build tag goes on the URL so a changed cab is a
 * different resource.
 */
window.HALL_BUILD = "10";

window.CABS = [
  { id: "well", name: "WELL", era: "PZL", blurb: "STACK · COMBO · RISE",  genre: "puzzle", bank: "floor1" },
  { id: "grain",name: "GRAIN",era: "LAB", blurb: "SIZE · POUR · FLUX",    genre: "grain",  bank: "floor1" },
  { id: "haul", name: "HAUL", era: "ARK", blurb: "PAD · WATCH · DUST",    genre: "journey",
    bank: "floor1", href: "haul/" },
  { id: "void", name: "VOID", era: "FLD", blurb: "THRUST · SPLIT · WRAP", genre: "field",  bank: "floor1" },
  { id: "tar",  name: "TAR",  era: "RCE", blurb: "BUMP · JUMP · HEAT",    genre: "race",   bank: "floor1" },
  { id: "flip", name: "FLIP", era: "TBL", blurb: "PLUNGE · NODE · DRAIN", genre: "table",  bank: "floor1" },

  { id: "cube", name: "CUBE", era: "NET", blurb: "DODGE · DEPTH · HOLD",   genre: "web",    bank: "deep" }
];

window.BANKS = [
  { id: "floor1",   title: "FLOOR 1" },
  { id: "deep",     title: "DEEP FLOOR" }
];
