/**
 * THE LONG HAUL — event corpus.
 *
 * VOICE LAW (from DESIGN.md): the game never winks. Mission Control believes every
 * word it says. No jokes *about* the satire — the player supplies the irony.
 *
 * COST LAW: every corporate event must carry a real mechanical cost. If it is only a
 * joke, cut it. The satire lands because it actually hurts.
 *
 * Each event: { id, art, cat, title, body, weight, when(s), choices[] }
 *   choice: { text, note, apply(s, Haul) }
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulEvents = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function anyCrew(s, Haul) {
    const L = Haul.living(s);
    return L.length ? L[Math.floor(s.rand() * L.length)] : null;
  }
  function hurt(s, Haul, amount, sick) {
    Haul.living(s).forEach(function (c) {
      c.health -= amount * (0.8 + s.rand() * 0.4);
      if (sick) c.sick = sick;
    });
  }
  function morale(s, Haul, d) {
    Haul.living(s).forEach(function (c) {
      c.morale = Math.max(0, Math.min(100, c.morale + d));
    });
  }

  const EVENTS = [

    // ── corporate class — the satire engine ────────────────────────────────
    {
      id: "firmware",
      art: "blackout", cat: "corporate", weight: 10,
      when: function (s) { return !s.blackout && s.day > 12; },
      title: "MANDATORY FIRMWARE UPDATE",
      body: "Mission Control has pushed a required update to the life-support " +
            "controller. Estimated downtime: four hours. Your acceptance has been " +
            "recorded as given.",
      choices: [
        {
          text: "Accept the update",
          note: "Recycler offline during install.",
          apply: function (s, Haul) {
            s.mod.life = Math.max(0, s.mod.life - 6);
            s.stats.corporate += 1;
            Haul.note(s, "Update installed. Release notes are not available offline.", "control");
          }
        },
        {
          text: "Defer — voids warranty",
          note: "Keeps the recycler up. Support is withdrawn.",
          apply: function (s, Haul) {
            s.warrantyVoid = true;
            s.stats.corporate += 1;
            morale(s, Haul, -4);
            Haul.note(s, "Warranty void. Mission Control has stopped answering maintenance queries.", "control");
          }
        }
      ]
    },
    {
      id: "sponsor-deck",
      art: "station", cat: "corporate", weight: 8,
      when: function (s) { return s.day > 30; },
      title: "NAMING RIGHTS ACQUIRED",
      body: "A sponsor has acquired naming rights to Deck 3. Please refer to it as " +
            "the Hydration Lounge in all official logs. Signage has been shipped " +
            "with your manifest and must be installed.",
      choices: [
        {
          text: "Install the signage",
          note: "Mass you are carrying anyway. Morale, oddly, improves.",
          apply: function (s, Haul) {
            s.res.parts = Math.max(0, s.res.parts - 1);
            morale(s, Haul, 3);
            s.stats.corporate += 1;
          }
        },
        {
          text: "Log it as Deck 3",
          note: "Non-compliance is noted.",
          apply: function (s, Haul) {
            s.compliance = (s.compliance || 0) - 1;
            s.stats.corporate += 1;
            Haul.note(s, "Compliance deviation recorded. This will be reflected in your arrival package.", "control");
          }
        }
      ]
    },
    {
      id: "documentary",
      art: "station", cat: "corporate", weight: 7,
      when: function (s) { return !s.droneAboard && s.day > 40; },
      title: "MISSION SELECTED FOR DOCUMENTARY",
      body: "Your voyage has been selected for a feature documentary. A camera drone " +
            "has been added to your manifest. It consumes 0.2 kg of oxygen per day. " +
            "The crew are asked to appear rested.",
      choices: [
        {
          text: "Welcome the drone",
          note: "Ongoing O₂ cost. The crew like being seen.",
          apply: function (s, Haul) {
            s.droneAboard = true;
            morale(s, Haul, 7);
            s.stats.corporate += 1;
          }
        },
        {
          text: "Power it down",
          note: "Saves the oxygen. Someone will notice.",
          apply: function (s, Haul) {
            s.compliance = (s.compliance || 0) - 1;
            morale(s, Haul, -3);
            s.stats.corporate += 1;
            Haul.note(s, "Telemetry from the documentary unit has ceased. Mission Control is disappointed.", "control");
          }
        }
      ]
    },
    {
      id: "tos",
      art: "blackout", cat: "corporate", weight: 6,
      when: function (s) { return s.day > 60 && !s.blackout; },
      title: "TERMS OF SERVICE UPDATED",
      body: "The passenger agreement has been revised. Continued respiration " +
            "constitutes acceptance. A summary of changes is available on request, " +
            "subject to bandwidth.",
      choices: [
        {
          text: "Continue breathing",
          note: "There is no other option.",
          apply: function (s, Haul) {
            s.stats.corporate += 1;
            morale(s, Haul, -5);
            Haul.note(s, "Acceptance recorded.", "control");
          }
        },
        {
          text: "Request the summary",
          note: "Costs bandwidth the crew were using for mail.",
          apply: function (s, Haul) {
            s.stats.corporate += 1;
            morale(s, Haul, -9);
            Haul.note(s, "Summary queued. Personal message allocation suspended for the interval.", "control");
          }
        }
      ]
    },
    {
      id: "founder-post",
      art: "station", cat: "corporate", weight: 6,
      when: function (s) { return s.day > 20; },
      title: "THE FOUNDER HAS POSTED",
      body: "The Founder has posted about your mission. Engagement is strong. " +
            "Nothing else about your situation has changed.",
      choices: [
        {
          text: "Read it to the crew",
          note: "Morale rises. Nothing else does.",
          apply: function (s, Haul) {
            morale(s, Haul, 9);
            s.stats.corporate += 1;
          }
        },
        {
          text: "Don't",
          note: "",
          apply: function (s, Haul) { s.stats.corporate += 1; }
        }
      ]
    },
    {
      id: "upgrade",
      art: "station", cat: "corporate", weight: 5,
      when: function (s) { return s.tier !== "founder" && s.day > 80; },
      title: "YOU HAVE BEEN UPGRADED",
      body: "Congratulations. Your party has been reclassified to Founder's Circle. " +
            "Your rations have not changed. Your seat has been reclassified.",
      choices: [
        {
          text: "Acknowledge",
          note: "",
          apply: function (s, Haul) {
            morale(s, Haul, 4);
            s.stats.corporate += 1;
            Haul.note(s, "Reclassification complete. No physical change has occurred.", "control");
          }
        }
      ]
    },
    {
      id: "cadence",
      art: "station", cat: "corporate", weight: 7,
      when: function (s) { return s.day > 15 && s.day < 90 && !s.blackout; },
      title: "CADENCE MEMO",
      body: "Mission Control advises the next MANIFEST hull is six weeks from flight. " +
            "Yours is to remain the pathfinder. A commemorative plaque has been allocated.",
      choices: [
        {
          text: "Log the plaque",
          note: "Mass. Morale, briefly.",
          apply: function (s, Haul) {
            s.res.parts = Math.max(0, s.res.parts - 1);
            morale(s, Haul, 3);
            s.stats.corporate += 1;
            Haul.note(s, "Pathfinder designation accepted. Plaque stowed in cargo.", "control");
          }
        },
        {
          text: "Ask for the six-week stack instead",
          note: "There is no instead. Bandwidth spent.",
          apply: function (s, Haul) {
            s.stats.corporate += 1;
            morale(s, Haul, -6);
            Haul.note(s, "Request noted. Timeline unchanged.", "control");
          }
        }
      ]
    },
    {
      id: "hardware-review",
      art: "debris-field", cat: "corporate", weight: 6,
      when: function (s) { return s.day > 10 && s.waypoint < 8; },
      title: "HARDWARE REVIEW UP RANGE",
      body: "A Block Heavy on an earlier pad has completed an unplanned hardware review. " +
            "Debris catalog updated. Mission Control thanks you for your patience. " +
            "Your insurance rider now excludes 'related events.'",
      choices: [
        {
          text: "Burn around the catalog",
          note: "Fuel now. Safer corridor.",
          apply: function (s, Haul) {
            s.res.fuel = Math.max(0, s.res.fuel - 6);
            s.stats.corporate += 1;
            Haul.note(s, "Avoidance burn complete. Rider remains exclusive.", "control");
          }
        },
        {
          text: "Stay on the filed path",
          note: "Saves fuel. Catalog is not a suggestion.",
          apply: function (s, Haul) {
            s.mod.hull = Math.max(0, s.mod.hull - 8);
            s.stats.corporate += 1;
            Haul.note(s, "Filed path retained. Telemetry recorded a kiss.", "control");
          }
        }
      ]
    },
    {
      id: "occupancy",
      art: "station", cat: "corporate", weight: 5,
      when: function (s) { return s.day > 25 && Haul.living(s).length >= 2; },
      title: "OCCUPANCY NOTICE",
      body: "ALS billing shows this cabin as sold twice. The second passenger is not " +
            "aboard. Finance asks you to pick which name remains on the manifest.",
      choices: [
        {
          text: "Keep the living names",
          note: "Paperwork. Someone on the ground is angry.",
          apply: function (s, Haul) {
            s.compliance = (s.compliance || 0) - 1;
            s.stats.corporate += 1;
            Haul.note(s, "Manifest corrected to match life support headcount.", "control");
          }
        },
        {
          text: "Carry the ghost seat",
          note: "Rations allocated to a person who is not here.",
          apply: function (s, Haul) {
            s.res.food = Math.max(0, s.res.food - 8);
            morale(s, Haul, -4);
            s.stats.corporate += 1;
            Haul.note(s, "Ghost occupancy retained. Calorie budget updated.", "control");
          }
        }
      ]
    },
    {
      id: "kitnet-debris",
      art: "debris-field", cat: "corporate", weight: 7,
      when: function (s) { return s.waypoint >= 3 && s.waypoint <= 10; },
      title: "CONSTELLATION DECAY",
      body: "A KiteNet node has left the catalog without leaving the sky. " +
            "Mission Control describes this as expected attrition. " +
            "Relative velocity is not.",
      choices: [
        {
          text: "Yaw the MANIFEST",
          note: "Fuel.",
          apply: function (s, Haul) {
            s.res.fuel = Math.max(0, s.res.fuel - 5);
            s.stats.corporate += 1;
            Haul.note(s, "Node missed. Catalog still lists it as operational.", "control");
          }
        },
        {
          text: "File a ticket",
          note: "Tickets do not alter trajectories.",
          apply: function (s, Haul) {
            s.mod.hull = Math.max(0, s.mod.hull - 7);
            s.stats.corporate += 1;
            Haul.note(s, "Ticket #84921 queued. Impact recorded in the same minute.", "control");
          }
        }
      ]
    },
    {
      id: "reusable-this-unit",
      art: "blackout", cat: "corporate", weight: 5,
      when: function (s) { return s.mod.hull < 70 || s.mod.drive < 70; },
      title: "REUSABILITY BULLETIN",
      body: "ALS reminds you the MANIFEST is fully reusable. This unit is " +
            "the exception that proves the slide. Refurbishment will occur " +
            "after Ellipse Nine, funding permitting.",
      choices: [
        {
          text: "Request refurb in flight",
          note: "There is no depot for that sentence.",
          apply: function (s, Haul) {
            s.stats.corporate += 1;
            morale(s, Haul, -5);
            Haul.note(s, "Refurbishment is a ground process. Please proceed.", "control");
          }
        },
        {
          text: "Patch with parts you have",
          note: "Actual repair.",
          apply: function (s, Haul) {
            if (s.res.parts >= 2) { Haul.repair(s, "hull", 2); s.res.parts -= 2; }
            else { s.mod.hull = Math.max(0, s.mod.hull - 4); }
            s.stats.corporate += 1;
          }
        }
      ]
    },

    // ── systems ────────────────────────────────────────────────────────────
    {
      id: "recycler-fault",
      art: "debris-field", cat: "systems", weight: 12,
      when: function (s) { return s.mod.life < 88; },
      title: "RECYCLER FAULT",
      body: "The water reclamation loop is passing particulate. Output is down and " +
            "will keep falling until someone opens the housing.",
      choices: [
        {
          text: "Strip and rebuild it",
          note: "Costs parts. Restores the loop.",
          apply: function (s, Haul) {
            if (s.res.parts >= 2) { Haul.repair(s, "life", 2); }
            else { s.mod.life = Math.max(0, s.mod.life - 5); Haul.note(s, "No parts aboard for the rebuild.", "fault"); }
          }
        },
        {
          text: "Run it dirty",
          note: "Free now. Recycling keeps degrading.",
          apply: function (s, Haul) {
            s.mod.life = Math.max(0, s.mod.life - 9);
            Haul.note(s, "Loop left in service. Output continues to fall.", "fault");
          }
        }
      ]
    },
    {
      id: "micrometeor",
      art: "debris-field", cat: "systems", weight: 10,
      when: function (s) { return s.day > 8; },
      title: "HULL STRIKE",
      body: "Something small and fast has gone through the outer skin of the cargo " +
            "section. Pressure is holding. For now.",
      choices: [
        {
          text: "Patch it now (EVA)",
          note: "Parts and risk, but it stays fixed.",
          apply: function (s, Haul) {
            const v = anyCrew(s, Haul);
            s.res.parts = Math.max(0, s.res.parts - 1);
            Haul.repair(s, "hab", 1);
            if (v && s.rand() < 0.22) {
              v.health -= 14 + s.rand() * 12;
              v.sick = "injury";
              Haul.note(s, v.name + " took a bad knock on the hull.", "medical");
            }
          }
        },
        {
          text: "Seal the compartment",
          note: "Free. You lose the stores behind the bulkhead.",
          apply: function (s, Haul) {
            s.mod.cargo = Math.max(0, s.mod.cargo - 12);
            s.res.cal = Math.max(0, s.res.cal - 34);
            Haul.note(s, "Compartment sealed. Stores behind it are unreachable.", "fault");
          }
        }
      ]
    },
    {
      id: "drive-harmonic",
      art: "debris-field", cat: "systems", weight: 9,
      when: function (s) { return s.mod.drive < 80; },
      title: "DRIVE HARMONIC",
      body: "The drive is running rough at throttle. The Flight Engineer wants to " +
            "throttle back until it can be balanced.",
      choices: [
        {
          text: "Throttle back for a week",
          note: "Slower voyage, healthier drive.",
          apply: function (s, Haul) {
            s.throttle = Math.min(s.throttle, 0.7);
            Haul.repair(s, "drive", 1);
            Haul.note(s, "Drive balanced at reduced output.", "info");
          }
        },
        {
          text: "Hold throttle",
          note: "Keeps the schedule. Wears the drive hard.",
          apply: function (s, Haul) {
            s.mod.drive = Math.max(0, s.mod.drive - 11);
          }
        }
      ]
    },

    // ── medical / crew ─────────────────────────────────────────────────────
    {
      id: "rad-dose",
      art: "solar-flare", cat: "medical", weight: 10,
      when: function (s) { return s.wpIndex >= 5; },
      title: "PARTICLE EVENT",
      body: "A proton storm is inbound. The storm shelter will hold three people " +
            "comfortably. There are more of you than that.",
      choices: [
        {
          text: "Rotate everyone through",
          note: "Everyone takes some dose. Nobody takes all of it.",
          apply: function (s, Haul) { hurt(s, Haul, 9, "rads"); }
        },
        {
          text: "Shelter the specialists",
          note: "Protects the skills you need. Someone pays for it.",
          apply: function (s, Haul) {
            const L = Haul.living(s);
            const victim = L.filter(function (c) { return c.role === "content"; })[0] || L[L.length - 1];
            if (victim) {
              victim.health -= 30 + s.rand() * 18;
              victim.sick = "rads";
              Haul.note(s, victim.name + " stood the watch outside the shelter.", "medical");
            }
            morale(s, Haul, -8);
          }
        }
      ]
    },
    {
      id: "drift-episode",
      art: "blackout", cat: "crew", weight: 9,
      when: function (s) { return s.blackout || s.day > 130; },
      title: "THE DRIFT",
      body: "One of the crew has stopped speaking. They are eating, and sleeping, " +
            "and doing their shifts, and they have not said a word in nine days.",
      choices: [
        {
          text: "Put them on light duty",
          note: "Costs efficiency. Helps them.",
          apply: function (s, Haul) {
            const v = anyCrew(s, Haul);
            if (v) { v.morale = Math.min(100, v.morale + 22); }
            s.mod.life = Math.max(0, s.mod.life - 2.5);
          }
        },
        {
          text: "Keep the roster as it is",
          note: "The work gets done. It spreads.",
          apply: function (s, Haul) { morale(s, Haul, -11); }
        }
      ]
    },

    // ── external ───────────────────────────────────────────────────────────
    {
      id: "derelict",
      art: "debris-field", cat: "external", weight: 7,
      when: function (s) { return s.wpIndex >= 4 && s.wpIndex <= 9; },
      title: "DERELICT ON A PARALLEL COURSE",
      body: "There is a hull out there running dark. Registry is an earlier " +
            "expedition. Mission Control's records show it arrived safely.",
      choices: [
        {
          text: "Board and salvage",
          note: "Real supplies. Real risk.",
          apply: function (s, Haul) {
            const v = anyCrew(s, Haul);
            const luck = s.rand();
            if (luck < 0.62) {
              s.res.parts += 4 + Math.floor(s.rand() * 5);
              s.res.o2 += 12 + s.rand() * 18;
              s.res.cal += 20 + s.rand() * 30;
              Haul.note(s, "Salvage recovered. The crew do not discuss what else was aboard.", "info");
              morale(s, Haul, -6);
            } else {
              if (v) { v.health -= 22 + s.rand() * 20; v.sick = "injury"; }
              Haul.note(s, "The boarding went badly.", "medical");
            }
          }
        },
        {
          text: "Log it and pass",
          note: "Nothing gained. Nothing risked.",
          apply: function (s, Haul) {
            morale(s, Haul, -4);
            Haul.note(s, "Contact logged. Mission Control has not responded to the registry query.", "control");
          }
        }
      ]
    },
    {
      id: "waystation-trade",
      art: "station", cat: "external", weight: 8,
      when: function (s) { return s.wpIndex === 3 || s.wpIndex === 12; },
      title: "WAYSTATION HAIL",
      body: "The station will trade. Their prices reflect your position, your " +
            "reserves, and the fact that you cannot leave.",
      choices: [
        {
          text: "Buy consumables",
          note: "Spends money on water and oxygen.",
          apply: function (s, Haul) {
            const spend = Math.min(s.money, 2200);
            s.money -= spend;
            s.res.water += spend * 0.055;
            s.res.o2 += spend * 0.016;
            Haul.note(s, "Trade complete. The rate was not favourable.", "info");
          }
        },
        {
          text: "Buy spare parts",
          note: "Parts keep the recycler alive.",
          apply: function (s, Haul) {
            const spend = Math.min(s.money, 1800);
            s.money -= spend;
            s.res.parts += Math.floor(spend / 190);
            Haul.note(s, "Parts aboard.", "info");
          }
        },
        {
          text: "Pass",
          note: "Keeps your money for later. There may not be a later.",
          apply: function () {}
        }
      ]
    }
  ];

  /** Weighted pick among events whose gate passes and which haven't fired recently. */
  function pick(s, seen) {
    const pool = EVENTS.filter(function (e) {
      if (seen && seen[e.id] && !e.repeatable) return false;
      return !e.when || e.when(s);
    });
    if (!pool.length) return null;
    let total = 0;
    pool.forEach(function (e) { total += (e.weight || 5); });
    let r = s.rand() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 5);
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  return { EVENTS: EVENTS, pick: pick };
});
