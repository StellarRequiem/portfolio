/**
 * THE LONG HAUL — imported event deck.
 *
 * GENERATED FILE — do not edit by hand.
 * Source:    games/haul/data/events.json   (Grok's deck, 84 events)
 * Generator: tools/import-deck.js
 * Rebuild:   node tools/import-deck.js
 *
 * Effect values are scaled from his economy to ours (see the generator for the
 * ratios and why). Lexicon is normalised to NAMING.md on import.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulDeck = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DECK = [
    {
      id: "gk-tank_hiss", art: "debris-field", cat: "systems", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "TANK HISS",
      body: "A hairline hiss starts under your aft oxidizer skirt. Frost blooms on the weld ENGINEER swore was certified. The gauge drops a tick every watch. PR already framed a shot that hides the white.",
      choices: [
        { text: "Tape the skirt",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Weld taped the skirt. The hiss went polite.",'info'); } },
        { text: "Burn to stay ahead",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-4.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You burned past the leak. The tank is lighter than the plan.",'info'); } },
        { text: "Ignore the frost",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-5.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"The hiss became a voice. You pretended it was the fans.",'info'); } }
      ]
    },
    {
      id: "gk-pump_stall", art: "debris-field", cat: "systems", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "PUMP STALL",
      body: "The feed pump stutters, catches, then howls like a bearing that has opinions. Oxidizer pressure hunts. PILOT can limp on the backup impeller if you accept a dirty mixture.",
      choices: [
        { text: "Swap the bearing",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"New bearing. The pump sounds like a pump again.",'info'); } },
        { text: "Limp on backup",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"Backup impeller ate mixture. You kept the watch.",'info'); } },
        { text: "Kick the housing",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-8.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Someone kicked the pump. It ran. A shin did not.",'info'); } }
      ]
    },
    {
      id: "gk-heat_soak", art: "debris-field", cat: "systems", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "HEAT SOAK",
      body: "The sun-side radiator sticks half-folded. Cabin air goes thick and metallic. BOTANIST reports the freeze-pouch locker is sweating. You can dump heat with a wasteful attitude roll or print a hinge pin.",
      choices: [
        { text: "Print a hinge pin",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Radiator unfolded. The locker stopped sweating.",'info'); } },
        { text: "Roll to dump heat",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.00));s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You rolled the stack like a chicken. Heat left. Ox left faster.",'info'); } },
        { text: "Strip to undersuits",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The cabin baked. Morale cooked with it.",'info'); } }
      ]
    },
    {
      id: "gk-debris_nick", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.wpIndex <= 4; },
      title: "DEBRIS NICK",
      body: "A paint fleck at orbital speed kisses the forward skirt. You hear it in your teeth. The hull plot shows a bright nick, not a hole. Range traffic thanks you for the tracking ping you did not ask for.",
      choices: [
        { text: "Patch the nick",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"A coin of tape over a coin of luck.",'info'); } },
        { text: "Yaw and inspect",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You yawed, stared, and called it cosmetic.",'info'); } },
        { text: "Log it, keep pace",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"The nick stayed. So did the doubt.",'info'); } }
      ]
    },
    {
      id: "gk-comms_drop", art: "debris-field", cat: "systems", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "COMMS DROP",
      body: "KiteNet fades to a carrier and a shrug. The mesh handoff never arrives. You can spend a watch realigning the dish, buy a dirty relay, or run silent and let the crew invent news.",
      choices: [
        { text: "Realign the dish",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"Dish bit the mesh. Voices came back small.",'info'); } },
        { text: "Buy a dirty relay",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-30.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"A tramp relay sold you a voice. It billed in pouches.",'info'); } },
        { text: "Run silent",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-10.0)));});H.note(s,"No downlink. The crew wrote their own headlines.",'info'); } }
      ]
    },
    {
      id: "gk-rcs_drift", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.wpIndex <= 4; },
      title: "RCS DRIFT",
      body: "A yaw thruster sticks open for a breath, then sulks. The stack walks off the corridor. Traffic in the depot shell starts sending polite icons that mean move.",
      choices: [
        { text: "Swap the valve",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"New RCS valve. The corridor forgave you.",'info'); } },
        { text: "Counter-pulse",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You spent ox arguing with a stuck jet.",'info'); } },
        { text: "Let it walk",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"Attitude wandered. So did a solar array.",'info'); } }
      ]
    },
    {
      id: "gk-valve_seize", art: "debris-field", cat: "systems", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "VALVE SEIZE",
      body: "The main oxidizer valve sticks at sixty percent. PILOT can still make a burn if you accept a dirty curve. ENGINEER wants to pull the actuator before it welds itself in place.",
      choices: [
        { text: "Pull the actuator",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Actuator out, clean one in. Flow is honest again.",'info'); } },
        { text: "Burn dirty at 60",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-5.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"You burned on a stuck valve. The curve was a rumor.",'info'); } },
        { text: "Hammer it open",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The valve opened. A wrench and a wrist paid.",'info'); } }
      ]
    },
    {
      id: "gk-print_jam", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "PRINT JAM",
      body: "Your spare printer chews a reel and freezes mid-thread. Without it, every later patch is a story you tell with tape. BOTANIST offers to sacrifice a pouch liner as filament. PR wants a time-lapse.",
      choices: [
        { text: "Clear and rethread",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Printer cleared. The jam cost a spare and gave you a printer.",'info'); } },
        { text: "Print from liners",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));s.res.parts = Math.max(0, s.res.parts + (2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"Pouch liners became filament. Dinner became thinner.",'info'); } },
        { text: "Leave it jammed",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"The printer stayed a sculpture. Spares stayed theoretical.",'info'); } }
      ]
    },
    {
      id: "gk-hatch_frost", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "HATCH FROST",
      body: "The midships hatch seal ices into a white ring. Deep black does not care about your torque wrench. If it pops on a pressure cycle, you will learn how thin a suit really is.",
      choices: [
        { text: "Warm and reseat",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Seal warmed, seated, signed. The hatch kept its job.",'info'); } },
        { text: "Dog it harder",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You over-dogged a frozen seal. It complained in metal.",'info'); } },
        { text: "Bypass the bay",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.cal = Math.max(0, s.res.cal + (-20.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"Bay locked out. Half the stores are now a rumor.",'info'); } }
      ]
    },
    {
      id: "gk-gyro_tumble", art: "debris-field", cat: "systems", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "GYRO TUMBLE",
      body: "An IMU starts reporting that you are both level and inverted. The backup agrees with neither. Stars through the port say the universe is fine and you are the problem.",
      choices: [
        { text: "Swap the IMU",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"New IMU. Up is up again.",'info'); } },
        { text: "Fly by the port",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"PILOT flew on stars and spite. It mostly worked.",'info'); } },
        { text: "Trust the loud one",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-4.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-8.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"You trusted the tumbling gyro. The stack wrote a new attitude.",'info'); } }
      ]
    },
    {
      id: "gk-filter_clog", art: "debris-field", cat: "systems", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "FILTER CLOG",
      body: "Your CO2 scrubber packs up with a gray cake that used to be air. Headaches arrive on schedule. MEDIC wants a swap. BOTANIST wants to know who has been eating in the return duct.",
      choices: [
        { text: "Swap the pack",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Fresh scrubber. The air stopped tasting like a meeting.",'info'); } },
        { text: "Knock the cake out",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You beat the filter. It worked halfway. Skulls paid the rest.",'info'); } },
        { text: "Crack a hatch",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"You vented to think. The black took the headache and some ox.",'info'); } }
      ]
    },
    {
      id: "gk-cable_chew", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "CABLE CHEW",
      body: "Insulation on a power run looks gnawed. There is no pest on your manifest. ENGINEER says vibration did it. PR says do not say pest on the live. The bus browns out when the kettle pumps spin.",
      choices: [
        { text: "Resplice the run",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Power run respliced. The kettle stopped blinking the lights.",'info'); } },
        { text: "Reroute on tape",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"A taped detour. It will hold until it does not.",'info'); } },
        { text: "Load-shed the galley",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-30.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"Galley dark. Pouches went cold. Cook went quieter.",'info'); } }
      ]
    },
    {
      id: "gk-tank_strat", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "TANK STRAT",
      body: "Oxidizer layers in your tank like a bad cocktail. The pickup sucks foam. A settling burn would mix it. So would a noisy slosh that the press kit does not mention.",
      choices: [
        { text: "Do a settle burn",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Short settle burn. The tank remembered how to be a liquid.",'info'); } },
        { text: "Pulse the baffles",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"Baffles thumped. Foam collapsed. One bracket complained.",'info'); } },
        { text: "Pump the foam",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-4.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You pumped foam and called it thrust. The engine disagreed.",'info'); } }
      ]
    },
    {
      id: "gk-radiator_rip", art: "debris-field", cat: "systems", weight: 3,
      when: function (s) { return s.wpIndex >= 2 && s.wpIndex <= 6; },
      title: "RADIATOR RIP",
      body: "A belt grain stitches the port radiator. Glycol beads into jewels and floats away like you can afford jewelry. Heat has nowhere honest to go.",
      choices: [
        { text: "Clamp and bypass",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Radiator clamped. Heat found a new hallway.",'info'); } },
        { text: "Jettison the panel",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.cal = Math.max(0, s.res.cal + (-10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You threw a radiator at the belt. The belt did not care.",'info'); } },
        { text: "Cook and endure",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-10.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Cabin heat rose. Tempers rose with it.",'info'); } }
      ]
    },
    {
      id: "gk-antenna_fold", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.wpIndex <= 4; },
      title: "ANTENNA FOLD",
      body: "The high-gain refuses to lock the depot beacon. It folds like it is shy. Low-gain will talk if you shout and waste power. PR cannot post a crisp Earth disc without the dish.",
      choices: [
        { text: "Free the hinge",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"Hinge freed. The dish found the depot and a little pride.",'info'); } },
        { text: "Shout on low-gain",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"Low-gain yelled. The depot heard a rumor of you.",'info'); } },
        { text: "Post the Earth disc",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Pretty Earth. Ugly pointing. The dish jammed worse.",'info'); } }
      ]
    },
    {
      id: "gk-weld_crack", art: "debris-field", cat: "systems", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "ENGINEER CRACK",
      body: "A seam along the stainless hopper shows a dark smile. It is not through. It wants to be. ENGINEER asks for quiet time and a clean bead. PILOT asks whether the press kit still says monolithic.",
      choices: [
        { text: "Lay a clean bead",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (8.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"Bead laid. The smile closed. The kit stayed a liar.",'info'); } },
        { text: "Stitch with tape",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"Tape over a smile. Stainless does not respect tape.",'info'); } },
        { text: "Call it character",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-10.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"You named the crack character. Character grew.",'info'); } }
      ]
    },
    {
      id: "gk-coolant_pink", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "COOLANT PINK",
      body: "A pink film appears on the mid-deck grate. The loop is leaking somewhere you cannot see without pulling a panel. The film is pretty. Pretty is not a coolant strategy.",
      choices: [
        { text: "Pull the panel",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Panel off, clamp on. Pink stopped being a feature.",'info'); } },
        { text: "Top off and pray",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You added coolant to a hole. The hole accepted the gift.",'info'); } },
        { text: "Mop and ignore",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The grate stayed pink. A boot stayed slick.",'info'); } }
      ]
    },
    {
      id: "gk-battery_swell", art: "debris-field", cat: "systems", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "BATTERY SWELL",
      body: "A bus cell pillows like bread. It is warm. Warm cells write short memoirs. You can isolate the string or keep the margin and hope the press kit thermal model is not also fiction.",
      choices: [
        { text: "Isolate the string",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"String cut out. You fly poorer and less on fire.",'info'); } },
        { text: "Bag and vent it",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Swollen cell bagged and shown the black.",'info'); } },
        { text: "Keep the margin",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-12.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The cell wrote its memoir. The bay learned punctuation.",'info'); } }
      ]
    },
    {
      id: "gk-latch_fail", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "LATCH FAIL",
      body: "A cargo latch lets go during a small slew. One of your crates kisses the opposite wall and decides to live there. Inside: pouches, or spares, or both, depending on who packed the pad.",
      choices: [
        { text: "Ratchet it down",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Latch replaced. The crate remembered its job.",'info'); } },
        { text: "Strap and forget",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"Webbing held. Something inside did not.",'info'); } },
        { text: "Open it mid-drift",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (20.0));s.res.parts = Math.max(0, s.res.parts + (1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-5.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You looted your own crate. A corner looted a shin.",'info'); } }
      ]
    },
    {
      id: "gk-dust_grind", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.wpIndex >= 2 && s.wpIndex <= 6; },
      title: "DUST GRIND",
      body: "Belt fines sneak a bearing on your array drive. It sounds like sand in a tooth. If the array stops tracking, the cells will sulk and so will every pump that wanted amps.",
      choices: [
        { text: "Pull and pack it",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Bearing packed. The array found the sun again.",'info'); } },
        { text: "Lock the array",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"Array locked. You flew on leftovers and a prayer to geometry.",'info'); } },
        { text: "Let it scream",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-7.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"The bearing sang. Then it stopped, which was worse.",'info'); } }
      ]
    },
    {
      id: "gk-leo_traffic", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.wpIndex <= 4; },
      title: "LEO TRAFFIC",
      body: "A train of mesh birds crosses your corridor with the confidence of something that paid for a slot. Conjunction alarms stack. You can duck, shout, or trust the slot file Astraeus sold you on the pad.",
      choices: [
        { text: "Duck the train",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You ducked a mesh train. The corridor exhaled.",'info'); } },
        { text: "Shout for a slot",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You argued with a scheduler. It billed you in delay.",'info'); } },
        { text: "Trust the pad file",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-8.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"The slot file was optimistic. A bird kissed the skirt.",'info'); } }
      ]
    },
    {
      id: "gk-capture_glitch", art: "debris-field", cat: "systems", weight: 3,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "CAPTURE GLITCH",
      body: "The capture-burn sequencer skips a beat and offers you a second-best ignition time. Deep black does not give refunds. PILOT can hand-fly it. The computer can try again after you spend ox explaining physics.",
      choices: [
        { text: "Hand-fly the burn",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"PILOT burned by the gut. Capture is ugly and real.",'info'); } },
        { text: "Reset and retry",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Sequencer reset. Second-best became good enough.",'info'); } },
        { text: "Accept the skip",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-6.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"You took the skipped beat. The ellipse moved.",'info'); } }
      ]
    },
    {
      id: "gk-black_ice", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "BLACK ICE",
      body: "A film of ice grows on the night-side panels where the black is honest. It is not pretty snow. It is mass you did not budget and a thermal blanket you did not want.",
      choices: [
        { text: "Bake it off",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You sunned the ice. It left as weather you invented.",'info'); } },
        { text: "Scrape on tether",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Weld scraped the night side. Gloves paid a tax.",'info'); } },
        { text: "Haul the extra mass",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"You hauled ice like a fool with a souvenir.",'info'); } }
      ]
    },
    {
      id: "gk-comms_lag", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "COMMS LAG",
      body: "Light-lag makes every pad voice arrive as a lecture from last watch. Advice stacks. Contradictions stack faster. You can wait for a clean loop, cut them off, or let PR answer with a smile that is twenty minutes out of date.",
      choices: [
        { text: "Wait for a clean loop",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"You waited out the lag. The advice was stale and useful.",'info'); } },
        { text: "Cut the pad voice",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Pad muted. The crew liked it. The checklist did not.",'info'); } },
        { text: "Let PR smile first",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"PR answered a question nobody had asked yet.",'info'); } }
      ]
    },
    {
      id: "gk-belt_static", art: "debris-field", cat: "systems", weight: 4,
      when: function (s) { return s.wpIndex >= 2 && s.wpIndex <= 6; },
      title: "BELT STATIC",
      body: "Charge builds on your hull until a glove sparks to a rail. The belt is a dry storm that does not blink. Avionics flicker like they are thinking about a new religion.",
      choices: [
        { text: "String a dissipator",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Dissipator out. The sparks found a job.",'info'); } },
        { text: "Ground through a boom",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You dragged a boom like a lightning rod for dust.",'info'); } },
        { text: "Wear extra gloves",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"A spark found a gap. The glove filed a complaint.",'info'); } }
      ]
    },
    {
      id: "gk-suit_rot", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "SUIT-ROT",
      body: "Black speckle blooms in a joint bladder on your suit rack. It smells like a locker that won. MEDIC calls it suit-rot and wants the suit off the rotation before it shares. ENGINEER wants to keep the extra EVA hour.",
      choices: [
        { text: "Quarantine and treat",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Suit bagged. Rot lost the vote.",'info'); } },
        { text: "Bleach the bladder",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"You bleached a joint. It will hold a watch.",'info'); } },
        { text: "Keep the EVA hour",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The extra hour happened. So did the itch.",'info'); } }
      ]
    },
    {
      id: "gk-ascorb_crash", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "ASCORB CRASH",
      body: "Gums go tender on your watch. BOTANIST checks the pouch labels and finds the ascorb lot is a year past polite. MEDIC wants a course now. PR wants to call it dry cabin air on the live.",
      choices: [
        { text: "Run a med course",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Ascorb on board, for real this time. Gums forgave you.",'info'); } },
        { text: "Raid the garnish",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You ate the garnish lot. Dinner got uglier. Mouths got better.",'info'); } },
        { text: "Call it dry air",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You sold dry air. The gums filed a dissent.",'info'); } }
      ]
    },
    {
      id: "gk-red_cough", art: "blackout", cat: "medical", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "RED COUGH",
      body: "Someone on your watch hacks a rust-colored spit into a rag after a dusty filter change. MEDIC says red cough until proven otherwise. The cabin listens to every breath like it is telemetry.",
      choices: [
        { text: "Isolate and dose",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Bunk sealed, dose given. The rag stayed a rag.",'info'); } },
        { text: "Masks for the watch",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"Masks on. Work slowed. Coughs got shy.",'info'); } },
        { text: "Work through it",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-10.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You worked through red cough. It worked through you.",'info'); } }
      ]
    },
    {
      id: "gk-bone_thin", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "BONE-THIN",
      body: "A routine tug on a handrail leaves a wrist louder than it should be. MEDIC says bone-thin, the long quiet thief. Exercise eats your time. Drugs eat the kit. Denial eats the landing.",
      choices: [
        { text: "Load and dose",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Bands, drugs, complaints. Bone got a memo.",'info'); } },
        { text: "Double the load-out",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You made them squat in a can. It helped a little.",'info'); } },
        { text: "Save the kit",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Kit saved. Wrist not. Landing will collect.",'info'); } }
      ]
    },
    {
      id: "gk-sleep_debt", art: "blackout", cat: "medical", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "SLEEP DEBT",
      body: "Your watch bill has been a lie for six sols. Someone racks out against a pump and calls it a nap. PILOT's voice goes flat. Errors start looking like personality.",
      choices: [
        { text: "Stand down a watch",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"You bought sleep with a slower haul. Worth it.",'info'); } },
        { text: "Issue stims",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"Stims issued. The next crash will be scheduled.",'info'); } },
        { text: "Keep the bill",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The bill stayed a lie. A switch paid interest.",'info'); } }
      ]
    },
    {
      id: "gk-rad_flush", art: "blackout", cat: "medical", weight: 3,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "RAD FLUSH",
      body: "A solar cough lights the black. Counters climb. The storm cellar is the water tank and the spare pouch wall. You can hide, keep working behind a joke, or burn to shorten the weather.",
      choices: [
        { text: "Stack in the cellar",
          need: function (s, H) { return s.res.cal >= 10; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Crew behind water and pouches. The weather passed mean.",'info'); } },
        { text: "Burn out of it",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-4.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You spent ox to leave a storm that does not have a door.",'info'); } },
        { text: "Work behind a joke",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The joke was thin. So was the shielding.",'info'); } }
      ]
    },
    {
      id: "gk-eye_float", art: "blackout", cat: "medical", weight: 5,
      when: function (s) { return s.wpIndex <= 4; },
      title: "EYE FLOAT",
      body: "Faces puff. Vision goes a click long. MEDIC calls it fluid shift and wants lower-body squeeze time. PR wants a face filter for the live so donors do not see your moon-cheeks.",
      choices: [
        { text: "Run squeeze time",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Hours in the squeezers. Eyes remembered the ground.",'info'); } },
        { text: "Dose the pressure",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Meds dropped the puff. The live stayed optional.",'info'); } },
        { text: "Filter the faces",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Pretty faces uplink. Real eyes stay long.",'info'); } }
      ]
    },
    {
      id: "gk-gut_revolt", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "GUT REVOLT",
      body: "A lot of freeze-pouch chili declares independence in your galley. The recycler works overtime. BOTANIST swears the seal was green. MEDIC wants fluids and a day of rice that does not exist.",
      choices: [
        { text: "Fluids and bunk",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Bunk and salts. The chili lost.",'info'); } },
        { text: "Dump the lot",
          need: function (s, H) { return s.res.cal >= 30; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-30.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Chili out the lock. Morale rose. Stores fell.",'info'); } },
        { text: "Blame the recycler",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-7.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You blamed a machine. The guts kept their own counsel.",'info'); } }
      ]
    },
    {
      id: "gk-suit_pinch", art: "blackout", cat: "medical", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "SUIT PINCH",
      body: "A glove bladder pinches during a short EVA and leaves a blood-moon under the nail. It is small until it is not. Your lock cycle is already counting.",
      choices: [
        { text: "Abort and treat",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"EVA aborted. Nail saved. Task slipped a watch.",'info'); } },
        { text: "Finish, then treat",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Task done. Finger filed a minority report.",'info'); } },
        { text: "Tape the glove",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Glove taped. The nail kept its color.",'info'); } }
      ]
    },
    {
      id: "gk-fever_watch", art: "blackout", cat: "medical", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "FEVER WATCH",
      body: "A bunk hits 39 and your cabin thermostat becomes a politics. MEDIC wants a full course and quiet. The haul wants hands. Fever does not vote, it just wins.",
      choices: [
        { text: "Full course, quiet",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Fever broke. A watch was spent on being human.",'info'); } },
        { text: "Knock it down",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"Temp fell. The cause booked a later watch.",'info'); } },
        { text: "Need the hands",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Hot hands on cold valves. Both suffered.",'info'); } }
      ]
    },
    {
      id: "gk-tooth_crack", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "TOOTH CRACK",
      body: "A molar lets go on a freeze-biscuit. The sound is small and unforgettable. MEDIC can numb and cap. BOTANIST can puree the rest of your haul. Nobody wants the third option spoken aloud.",
      choices: [
        { text: "Numb and cap",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Cap on. The biscuit war is over.",'info'); } },
        { text: "Puree the menu",
          need: function (s, H) { return s.res.cal >= 10; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"Everything became paste. The tooth waited.",'info'); } },
        { text: "Pull it cold",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You pulled a tooth in a can. Folklore increased.",'info'); } }
      ]
    },
    {
      id: "gk-cabin_mold", art: "blackout", cat: "medical", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "CABIN MOLD",
      body: "A green map grows behind your wet wall. It was a drip, then a smell, then a country. MEDIC wants it dead. ENGINEER wants the wall off. PR wants the camera pointed anywhere else.",
      choices: [
        { text: "Tear out the wall",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"Wall off, mold out, air less ambitious.",'info'); } },
        { text: "Fog the bay",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"Bay fogged. Mold retreated to plot.",'info'); } },
        { text: "Point the camera",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Pretty angle. Ugly lungs.",'info'); } }
      ]
    },
    {
      id: "gk-water_reclaim", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "WATER RECLAIM",
      body: "Your recycler coughs a brown sip and throws a code nobody memorized. Drinking from the backup bladder means the wash goes away. Thirst is already writing policy.",
      choices: [
        { text: "Rebuild the filter",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"Recycler rebuilt. Water tastes like water, almost.",'info'); } },
        { text: "Ration the bladder",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"Backup bladder on a diet. So is the crew.",'info'); } },
        { text: "Drink and hope",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You drank the brown sip. Medicine followed.",'info'); } }
      ]
    },
    {
      id: "gk-decompress_ear", art: "blackout", cat: "medical", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "EAR POP",
      body: "A sloppy pressure cycle leaves someone on your crew deaf on one side and furious on both. MEDIC wants a slow ramp next time. PILOT wants the lock to keep its schedule.",
      choices: [
        { text: "Slow the next cycle",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Ears treated. Locks got polite.",'info'); } },
        { text: "Chew and endure",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Someone chewed a pouch and pretended that was medicine.",'info'); } },
        { text: "Keep lock pace",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"The lock kept time. An eardrum filed overtime.",'info'); } }
      ]
    },
    {
      id: "gk-muscle_waste", art: "blackout", cat: "medical", weight: 4,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "MUSCLE WASTE",
      body: "Deep-black weeks turn thighs into suggestions. A simple crate move needs two people and an apology. MEDIC wants a load program. BOTANIST wants more protein than your locker owns.",
      choices: [
        { text: "Run the load plan",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Bands and protein. Legs remembered they were legs.",'info'); } },
        { text: "Share the crate work",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Two people per crate. The haul slowed and nobody tore.",'info'); } },
        { text: "Hero the crate",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Someone heroed a crate. A back un-heroed them.",'info'); } }
      ]
    },
    {
      id: "gk-solar_flush", art: "blackout", cat: "medical", weight: 3,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "SOLAR FLUSH",
      body: "After the last storm, a crew blood panel comes back loud. MEDIC wants rest and chelators. PR wants a line about resilience. The black does not read your press notes.",
      choices: [
        { text: "Chelate and rest",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-5.0));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Course given. Counts fell. The live waited.",'info'); } },
        { text: "Half dose, keep pace",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});H.note(s,"Half a course. Half a comfort.",'info'); } },
        { text: "Post resilience",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Resilience posted. Blood stayed loud.",'info'); } }
      ]
    },
    {
      id: "gk-mutiny_talk", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "MUTINY TALK",
      body: "You hear your name through a grate, then laughter that is not for you. Rations and a bad burn have made a committee. They have not voted. They are practicing.",
      choices: [
        { text: "Open the books",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(10.0)));});H.note(s,"You opened the stores board. The committee adjourned.",'info'); } },
        { text: "Split a feast watch",
          need: function (s, H) { return s.res.cal >= 30; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-30.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(12.0)));});H.note(s,"A feast bought a week of quiet. The books will notice.",'info'); } },
        { text: "Name a ringleader",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-12.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"You named someone. The grate learned new names.",'info'); } },
        { text: "Ignore the grate",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"The practice vote got better without you.",'info'); } }
      ]
    },
    {
      id: "gk-influencer_live", art: "station", cat: "corporate", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "INFLUENCER LIVE",
      body: "A cabin guest channel goes live without a checklist. The host wants tears, a hull nick, and your face in the same frame. Donors are watching a number you cannot see. The stack is not talent.",
      choices: [
        { text: "Cut the live",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Feed cut. The host sulked. The stack kept its dignity.",'info');s.stats.corporate+=1; } },
        { text: "Stage a safe nick",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (20.0));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"A safe nick, a pouch tip jar. Taste left the vehicle.",'info');s.stats.corporate+=1; } },
        { text: "Give them the face",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"You smiled for donors. The crew billed you in looks.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-regulator_hold", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "REGULATOR HOLD",
      body: "A range clerk freezes your next burn pending a form that did not exist at T-0. They want photos of the weld, a blood panel, and a statement that the press kit matches the gauges. It does not.",
      choices: [
        { text: "File the photos",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Forms filed. The clerk discovered mercy, briefly.",'info'); } },
        { text: "Burn on protest",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You burned on protest. A flag went next to your name.",'info'); } },
        { text: "Match the press kit",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You made gauges lie to match a brochure. Physics kept notes.",'info'); } }
      ]
    },
    {
      id: "gk-vendor_invoice", art: "station", cat: "crew", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "VENDOR INVOICE",
      body: "Astraeus pings a pad invoice for a valve you already replaced yourself. Pay now, they say, or the next depot will not open a hose. AeroSnail offers a rival hose at a price that includes a lecture.",
      choices: [
        { text: "Pay Astraeus",
          need: function (s, H) { return s.res.cal >= 30; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (3.00));s.res.cal = Math.max(0, s.res.cal + (-30.0));s.res.parts = Math.max(0, s.res.parts + (1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"Invoice paid in pouches. A hose remembered your name.",'info'); } },
        { text: "Buy AeroSnail hose",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (1.50));s.res.cal = Math.max(0, s.res.cal + (-20.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"Rival hose, rival sermon, thinner ox.",'info'); } },
        { text: "Refuse the ping",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.00));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"You told the vendor no. The next hose told you no back.",'info'); } }
      ]
    },
    {
      id: "gk-ration_fight", art: "station", cat: "crew", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "RATION FIGHT",
      body: "Two of your pouches go missing and two stories arrive fully formed. BOTANIST counts twice. The second count is worse. Nobody wants to be the thief. Everybody wants to be fed.",
      choices: [
        { text: "Search the bunks",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"Bunks searched. Pouches found. Trust not.",'info'); } },
        { text: "Share from stores",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"You covered the theft from stores. Peace is a line item.",'info'); } },
        { text: "Stingy all around",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-10.0)));});H.note(s,"Everyone got less. The thief got less too.",'info'); } }
      ]
    },
    {
      id: "gk-pr_script", art: "station", cat: "corporate", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "PR SCRIPT",
      body: "Pad comms drops a script: say the haul is ahead of curve, the hull is nominal, the crew is thriving. The gauges say otherwise. PR can read it like they mean it. You can read the gauges.",
      choices: [
        { text: "Read the gauges",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"You told the truth. Donors flinched. The crew did not.",'info');s.stats.corporate+=1; } },
        { text: "Read the script",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (1.50));s.res.cal = Math.max(0, s.res.cal + (20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"Script read. A care package launched. Pride did not.",'info');s.stats.corporate+=1; } },
        { text: "Let PR ad-lib",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (0.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"PR ad-libbed thriving. A valve chose this moment to hiss.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-union_ping", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "UNION PING",
      body: "A pad-side guild pings that your ENGINEER is still on their roll and owed a rest increment. They can freeze your spare license. They can also send a care kit if you play nice.",
      choices: [
        { text: "Honor the increment",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.res.parts = Math.max(0, s.res.parts + (2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Rest honored. A care kit and a spare license arrived.",'info'); } },
        { text: "Buy out the roll",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You bought ENGINEER off a roll. The ping went quiet.",'info'); } },
        { text: "Ignore the guild",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"License froze. The printer asked for a word with legal.",'info'); } }
      ]
    },
    {
      id: "gk-chain_letter", art: "station", cat: "crew", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "CHAIN LETTER",
      body: "A cabin note says forward this to three bunks or your next burn fails. It is stupid. It is also on its third generation and BOTANIST is taking it personally. Superstition is a consumable.",
      choices: [
        { text: "Burn the note",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Note into the recycler. The next burn did not notice.",'info'); } },
        { text: "Forward it once",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"You played along. The cabin exhaled a small magic.",'info'); } },
        { text: "Make it policy",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"You mocked it into a briefing. Nobody laughed right.",'info'); } }
      ]
    },
    {
      id: "gk-cook_strike", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "BOTANIST STRIKE",
      body: "BOTANIST tapes a note to your kettle: no more feast math without a vote. The locker is not empty. The goodwill is. Cold pouches are a political genre.",
      choices: [
        { text: "Give BOTANIST the vote",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});H.note(s,"BOTANIST won a vote. Meals got fair and slightly larger.",'info'); } },
        { text: "Cook the watch yourself",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You cooked. The crew learned new definitions of food.",'info'); } },
        { text: "Pull the tape off",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-10.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Tape off. Pouches issued. A ladle entered folklore.",'info'); } }
      ]
    },
    {
      id: "gk-weld_overtime", art: "station", cat: "crew", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "ENGINEER OVERTIME",
      body: "ENGINEER has been in the suit too many watches. Beads get sloppy. They ask for a sol off or a second pair of hands that you do not have. Stainless does not care about your staffing plan.",
      choices: [
        { text: "Stand ENGINEER down",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"ENGINEER slept. The next bead was a bead.",'info'); } },
        { text: "Pair them with PR",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"PR held a light. A spare became a story.",'info'); } },
        { text: "One more seam",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-8.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"One more seam. It showed.",'info'); } }
      ]
    },
    {
      id: "gk-kite_ad", art: "station", cat: "crew", weight: 4,
      when: function (s) { return s.wpIndex <= 4; },
      title: "KITE AD",
      body: "KiteNet injects an ad into your nav voice: buy more birds, haul safer. The ad talks over a conjunction warning. You can pay them to shut up, filter it, or let the cabin memorize the jingle.",
      choices: [
        { text: "Pay for quiet",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"You bought silence from a mesh. The warning got through.",'info'); } },
        { text: "Filter the jingle",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Filter in. Ads out. One warning almost went with them.",'info'); } },
        { text: "Sing along",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-5.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"The cabin learned a jingle. A conjunction learned your hull.",'info'); } }
      ]
    },
    {
      id: "gk-aerosnail_taunt", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "RIVAL TAUNT",
      body: "AeroSnail paints a slow, perfect flyby and pings a still of your frost line. Their caption is a smile. Your crew can see it on the cabin wall whether you allow it or not.",
      choices: [
        { text: "Mute the wall",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Wall muted. Pride went to work instead of comments.",'info');s.stats.corporate+=1; } },
        { text: "Ping a clean still",
          need: function (s, H) { return s.res.fuel >= 1.5; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"You spent ox on a prettier angle. It worked. It was stupid.",'info');s.stats.corporate+=1; } },
        { text: "Paint their still",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"A rude overlay shipped. A regulator saved a copy.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-will_rewrite", art: "station", cat: "crew", weight: 2,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "WILL REWRITE",
      body: "Deep black makes someone open a will file and ask who gets the last pouch if your hull goes quiet. It is legal. It is also a mood. The cabin gets smaller by one honest sentence.",
      choices: [
        { text: "Witness the file",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Will witnessed. The black got a little less unofficial.",'info'); } },
        { text: "Hold a feast first",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});H.note(s,"You ate, then signed. Death waited in the hallway.",'info'); } },
        { text: "Table it",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-7.0)));});H.note(s,"The file stayed open in someone's head.",'info'); } }
      ]
    },
    {
      id: "gk-vote_captain", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "VOTE CAPTAIN",
      body: "A joke about electing a new skipper stops being a joke. Hands hover. You can call the vote, offer a seat at the burn sheet, or remind them who signed the pad debt.",
      choices: [
        { text: "Call the vote",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Vote called. You kept the chair by one tired hand.",'info'); } },
        { text: "Share the burn sheet",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});H.note(s,"Burn sheet became a table. Pace got conservative and loved.",'info'); } },
        { text: "Cite the pad debt",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-10.0)));});H.note(s,"You cited debt. They cited the grate again.",'info'); } }
      ]
    },
    {
      id: "gk-lunar_tax", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.wpIndex <= 4; },
      title: "SLING TAX",
      body: "A lunar-sling clerk wants a toll in ox or a favor in spare mass. Your corridor is the only cheap one this week. The expensive one is empty and proud of it.",
      choices: [
        { text: "Pay the ox toll",
          need: function (s, H) { return s.res.fuel >= 2.3; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Toll paid. The sling was as advertised, which is rare.",'info'); } },
        { text: "Pay in spare mass",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You paid the moon in valves. It accepted.",'info'); } },
        { text: "Take the long way",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-4.50));s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"Long corridor. Empty. Proud. Expensive.",'info'); } }
      ]
    },
    {
      id: "gk-black_silence", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "BLACK SILENCE",
      body: "For two watches nobody talks except to the checklist. The black has a way of making voices feel like a waste of air. Isolation is not dramatic. It is a slow leak in your cabin.",
      choices: [
        { text: "Force a meal talk",
          need: function (s, H) { return s.res.cal >= 10; },
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});H.note(s,"You made them talk over pouches. It counted.",'info'); } },
        { text: "Play the old dump",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"A stored comedy set. Thin, but it was other humans.",'info'); } },
        { text: "Let the quiet work",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-9.0)));});H.note(s,"The quiet worked. It worked on you.",'info'); } }
      ]
    },
    {
      id: "gk-stowaway_rumor", art: "station", cat: "crew", weight: 2,
      when: function (s) { return s.day > 6; },
      title: "STOWAWAY",
      body: "A boot print in the unused loft does not match any issued pair. Stores are a touch light. Either you have a ghost, a thief, or a story that will eat three watches.",
      choices: [
        { text: "Sweep the loft",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.cal = Math.max(0, s.res.cal + (10.0));s.res.parts = Math.max(0, s.res.parts + (1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Loft swept. You found a pouch and a spare, not a person.",'info'); } },
        { text: "Seal and ignore",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"Loft sealed. The rumor found other rooms.",'info'); } },
        { text: "Announce a guest",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You joked about a guest. Someone slept with a wrench.",'info'); } }
      ]
    },
    {
      id: "gk-belt_claim", art: "station", cat: "crew", weight: 3,
      when: function (s) { return s.wpIndex >= 2 && s.wpIndex <= 6; },
      title: "CLAIM JUMP",
      body: "A belt miner pings that your skim crosses a painted claim. Their paint is a radio handshake and a story. They have a coilgun that might be real. They have a lawyer that definitely is.",
      choices: [
        { text: "Pay the skim fee",
          need: function (s, H) { return s.res.cal >= 20; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (1.50));s.res.cal = Math.max(0, s.res.cal + (-20.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Fee paid. The claim became a corridor again.",'info'); } },
        { text: "Show the pad writ",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You waved a writ. They waved time. You spent ox waiting.",'info'); } },
        { text: "Skim anyway",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-8.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"The coilgun was real enough. A nick proved the lawyer.",'info'); } }
      ]
    },
    {
      id: "gk-pad_scrub", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "PAD SCRUB",
      body: "A delayed pad-scrub notice arrives mid-haul, as if you could still roll back to Florida-ish weather. They scrubbed a stack that is not yours for wind that is not here. They still want you to sign that you understood.",
      choices: [
        { text: "Sign and file",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You signed a scrub for a pad you already left.",'info');s.stats.corporate+=1; } },
        { text: "Reply with telem",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You sent live gauges. The clerk marked you difficult and correct.",'info');s.stats.corporate+=1; } },
        { text: "Hold the next burn",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.res.cal = Math.max(0, s.res.cal + (-10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You held a burn for weather on another planet of paperwork.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-stack_tip", art: "station", cat: "corporate", weight: 2,
      when: function (s) { return s.day > 6; },
      title: "STACK TIP",
      body: "A pad replay hits the cabin: a cousin stack on the erector leans, thinks about it, and sits down like a tired animal. Your own stack creaks in sympathy. PR wants a statement about learning. ENGINEER wants a walkdown.",
      choices: [
        { text: "Walk the erector analog",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (5.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Walkdown done. Your stack is still a stack, on purpose.",'info');s.stats.corporate+=1; } },
        { text: "Issue a lesson note",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You posted a lesson. The creak did not read it.",'info');s.stats.corporate+=1; } },
        { text: "Watch the replay again",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"The cabin watched a stack sit down until everyone sat down inside.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-full_self_stack", art: "station", cat: "corporate", weight: 2,
      when: function (s) { return s.day > 6; },
      title: "SELF-STACK CRATE",
      body: "A vendor crate labeled FULL-SELF-STACKING promises to unfold into a spare rack without tools. It unfolds into a spare rack, a second spare rack, and a geometry that occupies your hatch. The manual is a shrug emoji and a liability line.",
      choices: [
        { text: "Cut it into parts",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You murdered the crate. It became honest spares.",'info');s.stats.corporate+=1; } },
        { text: "Let it finish",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-10.0));s.res.parts = Math.max(0, s.res.parts + (2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"It finished unfolding. The hatch filed a complaint.",'info');s.stats.corporate+=1; } },
        { text: "Jettison the crate",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Crate shown the black. Somewhere it is still unfolding.",'info');s.stats.corporate+=1; } },
        { text: "Film the unfold",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (20.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-5.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"The unfold went viral. So did a dent.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-press_vs_telem", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "PRESS VS TELEM",
      body: "The press kit says oxidizer margin is comfortable. The tank says you have a rumor of margin. Pad comms asks you to read the kit on the live so the market does not notice the rumor.",
      choices: [
        { text: "Read the tank",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(7.0)));});H.note(s,"You read the tank on the live. The kit blushed.",'info');s.stats.corporate+=1; } },
        { text: "Read the kit",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (2.25));s.res.cal = Math.max(0, s.res.cal + (10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-8.0)));});H.note(s,"Kit read. A bonus hose shipped. Reality did not.",'info');s.stats.corporate+=1; } },
        { text: "Split the difference",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"You said comfortable-ish. Nobody was comforted.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-reuse_except", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "REUSE EXCEPT",
      body: "A plaque on the hopper still says FULLY REUSABLE. A sub-plaque, added in marker, says EXCEPT THE BITS THAT ARE NOT. Three of those bits are currently your problem. Astraeus wants the plaque in the shot anyway.",
      choices: [
        { text: "Replace the bits",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Non-reusable bits replaced. The plaque stayed fiction.",'info');s.stats.corporate+=1; } },
        { text: "Shoot the plaque",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (0.75));s.res.cal = Math.max(0, s.res.cal + (10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"Pretty plaque. Ugly bits. A donor sent a sticker.",'info');s.stats.corporate+=1; } },
        { text: "Scratch EXCEPT bigger",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"The marker became doctrine. The crew saluted it.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-static_hold", art: "station", cat: "corporate", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "STATIC HOLD",
      body: "Pad wants a static-fire style valve dance while you are already in transit, to prove the stack still means it. It will waste ox and look great in a cut. It will also prove whether a valve still means it.",
      choices: [
        { text: "Dance the valves",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-3.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Valve dance done. One sticky seat revealed itself politely.",'info');s.stats.corporate+=1; } },
        { text: "Simulate the cut",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You sent an old cut. Pad called it heritage footage.",'info');s.stats.corporate+=1; } },
        { text: "Refuse the dance",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-3.0)));});H.note(s,"No dance. Ox saved. A commentator called you unambitious.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-maxq_slide", art: "station", cat: "corporate", weight: 4,
      when: function (s) { return s.wpIndex <= 4; },
      title: "MAX-Q SLIDE",
      body: "Someone on the live asks if you already passed max-q. You did, weeks ago, in air that had the decency to exist. PR wants a slide that says you pass a new max-q every day, as a metaphor. The stack wants you to stop talking to metaphors.",
      choices: [
        { text: "Correct the live",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You defined max-q like an adult. Chat got bored and kind.",'info');s.stats.corporate+=1; } },
        { text: "Ship the metaphor",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"Metaphor shipped. Merch pouches followed. Dignity less so.",'info');s.stats.corporate+=1; } },
        { text: "Mute the question",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"Question muted. It returned as three questions.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-stainless_taste", art: "station", cat: "corporate", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "STAINLESS TASTE",
      body: "Your cabin tastes like a coin. BOTANIST swears it is the hopper off-gassing character. MEDIC wants a swab. Astraeus sent a note that stainless is a lifestyle.",
      choices: [
        { text: "Swab and vent",
          need: function (s, H) { return H.living(s).length > 0; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(-2.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Swab taken, bay vented. Lifestyle declined.",'info');s.stats.corporate+=1; } },
        { text: "Call it character",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You called the coin taste character. Character lingered.",'info');s.stats.corporate+=1; } },
        { text: "Post the lifestyle",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Lifestyle posted. A donor sent polish. Throats sent notes.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-livestream_fail", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.day > 6; },
      title: "LIVESTREAM FAIL",
      body: "The cabin camera dies mid-sentence on a donor live, on a shot of a leaking label. Chat decides you are hiding a disaster. You are hiding a leaking label. Those can become the same thing.",
      choices: [
        { text: "Fix cam, show label",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Camera live. Label boring. Chat disappointed and calmer.",'info');s.stats.corporate+=1; } },
        { text: "Audio-only apology",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (10.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You apologized to a waveform. A small tip jar moved.",'info');s.stats.corporate+=1; } },
        { text: "Stay dark",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (-20.0));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"Dark cabin. Chat wrote a disaster for you.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-hopper_hop", art: "station", cat: "corporate", weight: 2,
      when: function (s) { return s.day > 6; },
      title: "HOPPER HOP",
      body: "A training hopper on the pad, not yours, hops, tips, and becomes modern art. Your KETTLE-class cousins start a rumor that hopping is a personality. PILOT asks whether anyone loaded a hop program by accident.",
      choices: [
        { text: "Audit the burn file",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Burn file clean. No hop personality detected.",'info');s.stats.corporate+=1; } },
        { text: "Ban hopper jokes",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"Jokes banned. Jokes multiplied in the grate.",'info');s.stats.corporate+=1; } },
        { text: "Lean into the rumor",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"You pulsed a tiny hop for the bit. The bit had mass.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-mesh_sat_ping", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.wpIndex <= 4; },
      title: "MESH PING",
      body: "A KiteNet bird asks your stack to relay a firmware to six friends. It will make you a node. It will also make you a node. The bird's privacy note is a poem about the sky belonging to everyone.",
      choices: [
        { text: "Relay the package",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"You became a node. Traffic found you interesting.",'info');s.stats.corporate+=1; } },
        { text: "Relay for credit",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"Credit in ox. Debit in being a popular antenna.",'info');s.stats.corporate+=1; } },
        { text: "Drop the poem",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"Poem dropped. The sky remained unowned and noisy.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-rapid_flatten", art: "station", cat: "corporate", weight: 2,
      when: function (s) { return s.day > 6; },
      title: "RAPID FLATTEN",
      body: "A cousin stack performs a rapid unscheduled flatten on a desert pad. Commentators invent verbs. Your crew watches the plume and then looks at your own stainless like it owes them rent. Astraeus sends thoughts and a coupon.",
      choices: [
        { text: "Inspect like it is us",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"You inspected as if the plume had your name. Good.",'info');s.stats.corporate+=1; } },
        { text: "Redeem the coupon",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (1.50));s.res.cal = Math.max(0, s.res.cal + (10.0));s.res.parts = Math.max(0, s.res.parts + (1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-5.0)));});H.note(s,"Coupon redeemed. Thoughts were not spare parts, but the parts were.",'info');s.stats.corporate+=1; } },
        { text: "Watch the verbs",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-7.0)));});H.note(s,"The cabin learned new verbs for coming apart.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-countdown_clock", art: "station", cat: "corporate", weight: 4,
      when: function (s) { return s.day > 6; },
      title: "COUNTDOWN CLOCK",
      body: "A leftover pad clock in the software still thinks you are at T-9 and holding. It beeps. It holds. It beeps. PILOT can kill the process. PR wants to keep it for vibes.",
      choices: [
        { text: "Kill the clock",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Clock killed. The haul returned to being a haul.",'info');s.stats.corporate+=1; } },
        { text: "Keep it for vibes",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Beep. Hold. Beep. A checklist skipped itself in sympathy.",'info');s.stats.corporate+=1; } },
        { text: "Set it to landing",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"Clock now lies about a different future. Slightly better.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-vendor_sticker", art: "station", cat: "corporate", weight: 5,
      when: function (s) { return s.day > 6; },
      title: "VENDOR STICKER",
      body: "You find a Astraeus sticker over a load-limit stencil. Under the sticker the number is smaller. Someone on the pad thought branding was structural. The crate is already lashed.",
      choices: [
        { text: "Peel and restow",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Sticker off. Limit respected. Crate restowed like an adult.",'info');s.stats.corporate+=1; } },
        { text: "Trust the brand",
          apply: function (s, H) { s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-7.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"You trusted a sticker. A lash taught the real number.",'info');s.stats.corporate+=1; } },
        { text: "Send them the peel",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You mailed a sticker to a vendor. They mailed a spare in shame.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-range_safety", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.wpIndex <= 4; },
      title: "RANGE SAFETY",
      body: "A Range Office bot, still subscribed to your beacon from pad day, asks you to terminate because a fishing boat is in the hold box. You are not in a hold box. The bot is very sure about the boat.",
      choices: [
        { text: "Unsubscribe the bot",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Bot unsubscribed. The imaginary boat survived.",'info');s.stats.corporate+=1; } },
        { text: "File a boat photo",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You filed a photo of the black and called it not a boat.",'info');s.stats.corporate+=1; } },
        { text: "Honor the terminate",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-6.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-6.0)));});H.note(s,"You safed a stack for a boat in another weather system.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-fairing_haunt", art: "station", cat: "corporate", weight: 3,
      when: function (s) { return s.wpIndex <= 4; },
      title: "FAIRING HAUNT",
      body: "A spent fairing half from somebody else's lift tags along in a neighboring orbit and keeps photobombing your Earth disc. It is harmless until you dock. It is also branded, badly.",
      choices: [
        { text: "Nudge it away",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Fairing nudged. Your Earth disc is boring again.",'info');s.stats.corporate+=1; } },
        { text: "Lash it as scrap",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-0.75));s.res.parts = Math.max(0, s.res.parts + (2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You adopted a fairing. It paid rent in metal and risk.",'info');s.stats.corporate+=1; } },
        { text: "Leave the photobomb",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (10.0));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Chat loved the haunted fairing. Docking will not.",'info');s.stats.corporate+=1; } }
      ]
    },
    {
      id: "gk-depot_cache", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex <= 4; },
      title: "DEPOT CACHE",
      body: "A dark depot locker answers an old Astraeus code with a green light. Inside: ox, a med brick, and a note that says IF FOUND, YOU ARE LATE. Nobody is on the camera. Late is a kind of lucky.",
      choices: [
        { text: "Take the honest half",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (6.00));s.res.cal = Math.max(0, s.res.cal + (20.0));s.res.parts = Math.max(0, s.res.parts + (1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(5.0));});H.note(s,"You took half a cache and left the note truer.",'info'); } },
        { text: "Strip the locker",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (10.50));s.res.cal = Math.max(0, s.res.cal + (40.0));s.res.parts = Math.max(0, s.res.parts + (2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(7.5));});H.note(s,"Locker stripped. A camera you missed woke up later.",'info'); } },
        { text: "Leave it closed",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You left a green light for a later fool. Pride is caloric.",'info'); } }
      ]
    },
    {
      id: "gk-ice_pocket", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex >= 2 && s.wpIndex <= 6; },
      title: "ICE POCKET",
      body: "A dirty ice in the belt reads wet on the spectrometer. You can cook ox and water if you spend heat and time. You can also cook a surprise if the ice is more dirt than story.",
      choices: [
        { text: "Cook a small batch",
          need: function (s, H) { return s.res.parts >= 1; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (6.00));s.res.cal = Math.max(0, s.res.cal + (20.0));s.res.parts = Math.max(0, s.res.parts + (-1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Small cook. Honest water. The belt paid a dividend.",'info'); } },
        { text: "Cook it greedy",
          need: function (s, H) { return s.res.parts >= 2; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (12.00));s.res.cal = Math.max(0, s.res.cal + (30.0));s.res.parts = Math.max(0, s.res.parts + (-2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-6.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});var v=H.living(s)[Math.floor(s.rand()*H.living(s).length)];if(v){v.health-=12+s.rand()*16;v.sick='injury';if(v.health<=0)H.killCrew(s,v,'injury');}H.note(s,"Greedy cook. Ox yes. A line froze and split.",'info'); } },
        { text: "Mark and pass",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You marked an ice for someone hungrier.",'info'); } }
      ]
    },
    {
      id: "gk-ghost_tug", art: "solar-flare", cat: "crew", weight: 1,
      when: function (s) { return s.blackout || s.wpIndex >= 7; },
      title: "GHOST TUG",
      body: "A dark tug with no beacon matches your vector for a watch, then pings a one-word offer: PUSH. No invoice. No flag. Deep black charity is either a gift or a boarding.",
      choices: [
        { text: "Accept a short push",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (7.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"A nameless tug pushed. Ox saved. Sleep did not.",'info'); } },
        { text: "Trade a pouch crate",
          need: function (s, H) { return s.res.cal >= 30; },
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (10.50));s.res.cal = Math.max(0, s.res.cal + (-30.0));s.res.parts = Math.max(0, s.res.parts + (2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(2.5));});H.note(s,"Pouches for a burn and a box of polite mysteries.",'info'); } },
        { text: "Yaw off and dark",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(1.0)));});H.note(s,"You went dark. The tug did too, like a mirror.",'info'); } }
      ]
    },
    {
      id: "gk-helios_credit", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex >= 5; },
      title: "HELIOS CREDIT",
      body: "Astraeus reverses a pad fee in a fit of accounting. A credit lands as ox at the next hose and a cheerful note that YOUR JOURNEY INSPIRES. No one can say which journey they mean.",
      choices: [
        { text: "Take the hose credit",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (9.00));s.res.parts = Math.max(0, s.res.parts + (1));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"Credit taken. The hose was real. The inspiration was not required.",'info'); } },
        { text: "Ask it in spares",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (3.00));s.res.parts = Math.max(0, s.res.parts + (3));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(2.5));});H.note(s,"You converted cheer into valves. Correct.",'info'); } },
        { text: "Refuse the cheer",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Credit refused. The crew liked being uninspiring.",'info'); } }
      ]
    },
    {
      id: "gk-med_crate", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex >= 5; },
      title: "MED CRATE",
      body: "A sealed med crate, still cold, drifts with a torn parachute shroud and a pad stamp from a scrubbed lift. The manifest says ascorb, bone-keep, and a fever stack. The seal says someone already wanted it. You can crack it or leave it for a colder need.",
      choices: [
        { text: "Crack and inventory",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(12.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Crate cracked. Medicine that still remembered the cold.",'info'); } },
        { text: "Take half, beacon rest",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});H.living(s).forEach(function(c){c.health=Math.min(100,c.health+(7.5));});var v=H.living(s).slice().sort(function(a,b){return a.health-b.health;})[0];if(v)v.health=Math.min(100,v.health+14+s.rand()*12);H.note(s,"Half kept, rest beaconed. You slept like a civil person.",'info'); } },
        { text: "Leave it drifting",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You left a cold crate for a colder need.",'info'); } }
      ]
    },
    {
      id: "gk-miner_gift", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex >= 2 && s.wpIndex <= 6; },
      title: "MINER GIFT",
      body: "A belt pair tosses you a net of print stock and a tin of real fruit cubes because your stack looks like a sad kettle. They want a story in return, not money. They will know if you lie.",
      choices: [
        { text: "Tell the true haul",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (1.50));s.res.cal = Math.max(0, s.res.cal + (40.0));s.res.parts = Math.max(0, s.res.parts + (2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(8.0)));});H.note(s,"True story, fruit cubes, print stock. The belt liked honesty.",'info'); } },
        { text: "Tell a bigger haul",
          apply: function (s, H) { s.res.cal = Math.max(0, s.res.cal + (20.0));s.res.parts = Math.max(0, s.res.parts + (1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-2.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-4.0)));});H.note(s,"You lied large. They sent less and a rock as review.",'info'); } },
        { text: "Decline the pity",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Pity declined. The kettle stayed sad and self-funded.",'info'); } }
      ]
    },
    {
      id: "gk-comms_grant", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex <= 4; },
      title: "COMMS GRANT",
      body: "A university mesh offers a week of priority voice if you ferry a student beacon to a higher shell. The beacon is small. Their joy is not. Orbit traffic will notice a new chirp with your name on it.",
      choices: [
        { text: "Ferry the beacon",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-1.50));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(7.0)));});H.note(s,"Beacon lofted. Voice got clear. Students got a chirp.",'info'); } },
        { text: "Ferry for stores",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (4.50));s.res.cal = Math.max(0, s.res.cal + (20.0));s.res.parts = Math.max(0, s.res.parts + (1));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (-1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"You billed the university in ox. They paid, delighted.",'info'); } },
        { text: "Keep the corridor",
          apply: function (s, H) { H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(-2.0)));});H.note(s,"No chirp. Your name stayed off a student slide.",'info'); } }
      ]
    },
    {
      id: "gk-hull_patch_find", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex >= 5; },
      title: "PATCH FIND",
      body: "Behind a galley panel, a factory patch kit sits in its shrink, never inventoried. ENGINEER makes a noise usually reserved for clean beads. BOTANIST makes a noise about who sealed a pantry over your structure.",
      choices: [
        { text: "Log it into spares",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (4));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (4.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(6.0)));});H.note(s,"Hidden kit logged. The galley is slightly less of a liar.",'info'); } },
        { text: "Use it now on seams",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (10.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(4.0)));});H.note(s,"You spent the miracle on every smile in the stainless.",'info'); } },
        { text: "Leave it for landing",
          apply: function (s, H) { s.res.parts = Math.max(0, s.res.parts + (2));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Kit reserved for dust. The galley kept a secret on purpose.",'info'); } }
      ]
    },
    {
      id: "gk-phobos_beacon", art: "solar-flare", cat: "external", weight: 1,
      when: function (s) { return s.wpIndex >= 5; },
      title: "PHOBOS BEACON",
      body: "A weak Phobos weather beacon offers a clean capture corridor and a cache of landing stakes if you share your hull log. Shared logs become everyone else's cautionary slide. The corridor looks truly clean.",
      choices: [
        { text: "Share and take stakes",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (4.50));s.res.parts = Math.max(0, s.res.parts + (2));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (3.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(3.0)));});H.note(s,"Log shared. Corridor true. You are now a slide.",'info'); } },
        { text: "Take corridor only",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (3.00));s.mod.hab = Math.max(0, Math.min(100, s.mod.hab + (1.0)));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(5.0)));});H.note(s,"Clean corridor, private log. Phobos allowed it.",'info'); } },
        { text: "Keep your own line",
          apply: function (s, H) { s.res.fuel = Math.max(0, s.res.fuel + (-2.25));H.living(s).forEach(function(c){c.morale=Math.max(0,Math.min(100,c.morale+(2.0)));});H.note(s,"You flew your line. It was yours, and longer.",'info'); } }
      ]
    }
  ];

  return { DECK: DECK };
});
