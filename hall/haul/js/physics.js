/**
 * THE LONG HAUL — engineering event generator.
 *
 * The goal: an aerospace or life-support engineer should recognise every failure here
 * as a real one, and everyone else should still be able to play it. That means real
 * subsystems, real failure modes, real units, and numbers inside plausible ranges —
 * and choices that are genuine engineering tradeoffs rather than good-option /
 * bad-option.
 *
 * PROVENANCE — these are documented, not invented:
 *   · CDRA zeolite bed and valve faults have recurred on ISS for years.
 *   · The UPA distillation assembly fouled with calcium sulfate; the fix was changing
 *     the urine pretreat formula to lower the calcium concentration.
 *   · SANS (Spaceflight Associated Neuro-ocular Syndrome) — optic disc oedema and
 *     choroidal folds from cephalad fluid shift — is an open, unsolved problem.
 *   · Latent herpesvirus reactivation (EBV, VZV, CMV) under spaceflight immune
 *     dysregulation is measured in astronaut cohorts.
 *   · MSL/RAD measured roughly 1.8 mSv/day of GCR dose during Earth-Mars cruise.
 *   · Thick aluminium shielding can *increase* dose via secondary neutron and
 *     fragment production — the counterintuitive one engineers will recognise.
 *   · Bone mineral density falls ~1–1.5%/month in weight-bearing sites.
 *   · CMGs saturate and need momentum desaturation; that costs propellant.
 *   · In microgravity there is no buoyant convection, so flames go spherical and
 *     smouldering behaves nothing like it does on Earth.
 *   · Heat can only leave a spacecraft by radiation. Radiators are the hard ceiling.
 *
 * VARIATION WITHOUT GIBBERISH: templates never madlib their prose. Each fault owns a
 * coherent description, and only the *component instance* and the *numbers* vary,
 * drawn from ranges that stay physically sensible. A generated event is always a real
 * fault with a plausible readout — never a word salad.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
  function rng(rand, lo, hi, dp) {
    const v = lo + rand() * (hi - lo);
    return dp === 0 ? Math.round(v) : +v.toFixed(dp == null ? 1 : dp);
  }

  function crewBy(s, Haul, role) {
    return Haul.living(s).filter(function (c) { return c.role === role; })[0] || null;
  }
  function anyCrew(s, Haul) {
    const L = Haul.living(s);
    return L.length ? L[Math.floor(s.rand() * L.length)] : null;
  }
  function moraleAll(s, Haul, d) {
    Haul.living(s).forEach(function (c) {
      c.morale = Math.max(0, Math.min(100, c.morale + d));
    });
  }
  function hurtAll(s, Haul, amt, sick) {
    Haul.living(s).forEach(function (c) {
      c.health -= amt * (0.8 + s.rand() * 0.4);
      if (sick) c.sick = sick;
    });
    Haul.living(s).forEach(function (c) {
      if (c.health <= 0) Haul.killCrew(s, c, c.sick || "co2");
    });
  }

  /**
   * Fault templates. Each returns a full event; `make(s, Haul, rand)` so numbers are
   * drawn from the run's seeded RNG and a replay reproduces the same readout.
   */
  const FAULTS = [

    // ── ECLSS: CO₂ removal ────────────────────────────────────────────────
    {
      id: "cdra-bed",
      sys: "ECLSS", art: "blackout", cat: "systems", weight: 10,
      when: function (s) { return s.day > 10; },
      make: function (s, Haul, rand) {
        const bed = pick(rand, ["Bed 1", "Bed 2"]);
        const pp = rng(rand, 5.4, 9.2, 1);
        const nominal = rng(rand, 2.6, 3.4, 1);
        return {
          title: "CO₂ PARTIAL PRESSURE RISING",
          body: "The carbon dioxide removal assembly is not fully regenerating. " + bed +
                " is breaking through early — either the zeolite is degraded or the " +
                "changeover valve is not seating. Cabin ppCO₂ reads " + pp + " mmHg " +
                "against a nominal " + nominal + ". Crew report headache and poor sleep, " +
                "which is what that number feels like before it is dangerous.",
          choices: [
            { text: "Break out the spare sorbent bed",
              note: "Costs parts. Restores scrubbing margin.",
              need: function (st) { return st.res.parts >= 2; },
              apply: function (st, H) {
                st.res.parts -= 2;
                H.repair(st, "life", 2);
                H.note(st, "Sorbent bed swapped. ppCO₂ trending back to nominal.", "info");
              } },
            { text: "Run both beds continuously",
              note: "Buys scrubbing now. Heater duty cycle wears the unit.",
              apply: function (st, H) {
                st.mod.life = Math.max(0, st.mod.life - 4);
                st.res.fuel = Math.max(0, st.res.fuel - 1.2);
                H.note(st, "Both beds in continuous regen. Power budget absorbed the delta.", "info");
              } },
            { text: "Raise the cabin CO₂ flight rule and carry on",
              note: "Free. The crew live inside the consequence.",
              apply: function (st, H) {
                hurtAll(st, H, 5, "co2");
                moraleAll(st, H, -7);
                H.note(st, "Flight rule revised upward. The headaches did not read the revision.", "fault");
              } }
          ]
        };
      }
    },

    // ── ECLSS: water recovery ─────────────────────────────────────────────
    {
      id: "upa-fouling",
      sys: "ECLSS", art: "debris-field", cat: "systems", weight: 9,
      when: function (s) { return s.day > 25; },
      make: function (s, Haul, rand) {
        const before = rng(rand, 84, 88, 0);
        const after = rng(rand, 62, 73, 0);
        return {
          title: "WATER RECOVERY RATIO FALLING",
          body: "The urine processor's distillation assembly is fouling. Calcium " +
                "sulfate is coming out of solution and plating the internals — the " +
                "brine is concentrating past where the pretreat chemistry can hold it. " +
                "Recovery has dropped from " + before + "% to " + after + "%. Every point " +
                "lost is water you now have to carry instead of remake.",
          choices: [
            { text: "Re-formulate the pretreat, run weaker batches",
              note: "Lower throughput, but the assembly stops scaling.",
              apply: function (st, H) {
                st.res.water = Math.max(0, st.res.water - 18);
                H.repair(st, "life", 1);
                H.note(st, "Pretreat acid ratio changed. Scaling arrested at a throughput cost.", "info");
              } },
            { text: "Strip and descale the distillation assembly",
              note: "Costs parts and a crew-day. Restores the loop properly.",
              need: function (st) { return st.res.parts >= 1; },
              apply: function (st, H) {
                st.res.parts -= 1;
                H.repair(st, "life", 2);
                const v = crewBy(st, H, "engineer") || anyCrew(st, H);
                if (v) v.morale = Math.max(0, v.morale - 5);
                H.note(st, "Assembly descaled. It is a filthy job and everyone knows who did it.", "info");
              } },
            { text: "Accept the lower ratio",
              note: "Nothing to fix today. Consumption rises for the rest of the voyage.",
              apply: function (st, H) {
                st.mod.life = Math.max(0, st.mod.life - 9);
                H.note(st, "Recovery ratio accepted as-is. Daily water draw steps up.", "fault");
              } }
          ]
        };
      }
    },

    // ── ECLSS: oxygen generation ──────────────────────────────────────────
    {
      id: "oga-trip",
      sys: "ECLSS", art: "blackout", cat: "systems", weight: 8,
      when: function (s) { return s.day > 18; },
      make: function (s, Haul, rand) {
        const cell = rng(rand, 3, 12, 0);
        return {
          title: "OXYGEN GENERATOR SAFED",
          body: "The electrolysis stack has safed itself. Hydrogen sensor " + cell +
                " is reading above threshold on the oxygen side, which is either a real " +
                "cross-cell leak or a drifting sensor. The distinction matters: one is a " +
                "maintenance item and the other is how you get a hydrogen–oxygen mix in " +
                "a sealed volume.",
          choices: [
            { text: "Treat it as a real leak — pull the stack",
              note: "Safe. Costs parts and oxygen from stores while it is down.",
              need: function (st) { return st.res.parts >= 2; },
              apply: function (st, H) {
                st.res.parts -= 2;
                st.res.o2 = Math.max(0, st.res.o2 - 9);
                H.repair(st, "life", 2);
                H.note(st, "Stack pulled and reseated. No cross-leak found, which is the good outcome.", "info");
              } },
            { text: "Cross-check against the backup sensor",
              note: "Free, slower. If the sensor is lying you find out cheaply.",
              apply: function (st, H) {
                if (st.rand() < 0.62) {
                  H.note(st, "Backup disagrees. Sensor drift confirmed — generator returned to service.", "info");
                  st.mod.life = Math.max(0, st.mod.life - 1);
                } else {
                  H.note(st, "Backup agrees. The leak is real and it has been running.", "fault");
                  st.mod.life = Math.max(0, st.mod.life - 11);
                  hurtAll(st, H, 4, "hypoxia");
                }
              } },
            { text: "Override the interlock and keep making oxygen",
              note: "You need the O₂. The interlock exists for a reason.",
              apply: function (st, H) {
                st.res.o2 += 14;
                st.mod.life = Math.max(0, st.mod.life - 6);
                if (st.rand() < 0.28) {
                  st.mod.hab = Math.max(0, st.mod.hab - 16);
                  hurtAll(st, H, 12, "injury");
                  H.note(st, "Deflagration in the stack bay. Contained, but the bulkhead took it.", "death");
                } else {
                  H.note(st, "Interlock bypassed. Oxygen restored. Nothing has happened yet.", "fault");
                }
              } }
          ]
        };
      }
    },

    // ── Thermal ───────────────────────────────────────────────────────────
    {
      id: "loop-leak",
      sys: "TCS", art: "debris-field", cat: "systems", weight: 9,
      when: function (s) { return s.day > 20; },
      make: function (s, Haul, rand) {
        const loop = pick(rand, ["Loop A", "Loop B"]);
        const rate = rng(rand, 0.3, 1.8, 1);
        const drift = rng(rand, 2.5, 7.0, 1);
        return {
          title: "COOLANT LOOP LOSING PRESSURE",
          body: loop + " is down " + rate + " kPa per day. There is no convection out " +
                "here — every watt the ship makes leaves by radiator or does not leave " +
                "at all — so a loop you cannot pressurise is avionics you cannot cool. " +
                "Cabin is already " + drift + " °C above setpoint on that side.",
          choices: [
            { text: "Isolate the leg and run single-loop",
              note: "Halves radiator area. You must shed load somewhere.",
              apply: function (st, H) {
                st.mod.drive = Math.max(0, st.mod.drive - 7);
                H.note(st, "Single-loop cooling. Drive derated to stay inside the thermal budget.", "info");
              } },
            { text: "Find and patch it",
              note: "Costs parts. An EVA-grade job done inside.",
              need: function (st) { return st.res.parts >= 2; },
              apply: function (st, H) {
                st.res.parts -= 2;
                const eng = crewBy(st, H, "engineer");
                H.repair(st, "hab", eng ? 3 : 1);
                if (!eng) H.note(st, "Patched without an engineer. It is holding for now.", "fault");
                else H.note(st, "Leak found at a quick-disconnect and repacked. Pressure holding.", "info");
              } },
            { text: "Top off from reserve and watch it",
              note: "Cheap now. The leak is still there.",
              apply: function (st, H) {
                st.mod.hab = Math.max(0, st.mod.hab - 5);
                H.note(st, "Loop topped off. Rate unchanged, which tells you what you already knew.", "fault");
              } }
          ]
        };
      }
    },

    // ── MMOD ──────────────────────────────────────────────────────────────
    {
      id: "mmod-strike",
      sys: "STRUCTURE", art: "debris-field", cat: "systems", weight: 8,
      when: function (s) { return s.day > 8; },
      make: function (s, Haul, rand) {
        const vel = rng(rand, 6.5, 17.0, 1);
        const mm = rng(rand, 0.4, 3.2, 1);
        return {
          title: "HYPERVELOCITY IMPACT",
          body: "Something on the order of " + mm + " mm came through at roughly " +
                vel + " km/s. The Whipple bumper did its job — the particle is now a " +
                "plasma cloud spread across the standoff instead of a hole in the " +
                "pressure wall. The rear wall is spalled but intact. The next one might " +
                "not be that considerate.",
          choices: [
            { text: "Inspect and patch the bumper",
              note: "Restores the shield you will want later.",
              need: function (st) { return st.res.parts >= 1; },
              apply: function (st, H) {
                st.res.parts -= 1;
                H.repair(st, "hab", 2);
                H.note(st, "Bumper patch bonded over the crater. Standoff restored.", "info");
              } },
            { text: "Log it and re-point the bumper toward the ram direction",
              note: "Free. Trades protection elsewhere for protection where it matters.",
              apply: function (st, H) {
                st.res.fuel = Math.max(0, st.res.fuel - 1.6);
                H.note(st, "Attitude biased to put the heavy shielding into the velocity vector.", "info");
              } },
            { text: "Nothing. It held.",
              note: "It did hold. The margin is thinner now.",
              apply: function (st, H) {
                st.mod.hab = Math.max(0, st.mod.hab - 7);
              } }
          ]
        };
      }
    },

    // ── Radiation ─────────────────────────────────────────────────────────
    {
      id: "spe-shelter",
      sys: "RADIATION", art: "solar-flare", cat: "medical", weight: 9,
      when: function (s) { return s.wpIndex >= 4; },
      make: function (s, Haul, rand) {
        const rate = rng(rand, 12, 90, 0);
        const gcr = rng(rand, 1.6, 2.0, 1);
        return {
          title: "SOLAR PARTICLE EVENT INBOUND",
          body: "An M-class event has lit up the forward dosimeters. Skin dose rate is " +
                "climbing past " + rate + " mSv/hr against a cruise background of about " +
                gcr + " mSv/day. The water wall is the only real shielding aboard, and it " +
                "is sized for three people, not five.",
          choices: [
            { text: "Everyone into the water shelter, hot-bunk it",
              note: "Shared dose. Nobody takes the whole event.",
              apply: function (st, H) {
                hurtAll(st, H, 7, "rads");
                moraleAll(st, H, -4);
                H.note(st, "Shelter rotation held for the duration. Everyone caught some of it.", "medical");
              } },
            { text: "Shelter the crew you cannot replace",
              note: "Protects capability. Someone stands the watch outside.",
              apply: function (st, H) {
                const L = H.living(st);
                const victim = L.filter(function (c) { return c.role === "content"; })[0] || L[L.length - 1];
                if (victim) {
                  victim.health -= 26 + st.rand() * 20;
                  victim.sick = "rads";
                  if (victim.health <= 0) H.killCrew(st, victim, "rads");
                }
                moraleAll(st, H, -9);
              } },
            { text: "Stack cargo against the hull as extra mass",
              note: "Sounds right. The physics disagrees.",
              apply: function (st, H) {
                // Real counterintuitive result: intermediate-Z shielding can raise dose
                // via secondary neutron and fragment production.
                hurtAll(st, H, 11, "rads");
                st.mod.cargo = Math.max(0, st.mod.cargo - 6);
                H.note(st, "Secondary particle production in the shielding raised the dose rather than cutting it.", "medical");
              } }
          ]
        };
      }
    },

    // ── Attitude control ──────────────────────────────────────────────────
    {
      id: "cmg-sat",
      sys: "GNC", art: "debris-field", cat: "systems", weight: 7,
      when: function (s) { return s.day > 30; },
      make: function (s, Haul, rand) {
        const pct = rng(rand, 82, 98, 0);
        return {
          title: "MOMENTUM WHEELS SATURATING",
          body: "The control moment gyros are at " + pct + "% stored momentum. Solar " +
                "pressure on an asymmetric stack has been trickling angular momentum in " +
                "all voyage and it has to go somewhere. Once they saturate they stop " +
                "holding attitude, and attitude is what keeps the radiators edge-on and " +
                "the antenna pointed.",
          choices: [
            { text: "Desaturate on thrusters",
              note: "Standard, and it spends propellant you were saving.",
              apply: function (st, H) {
                st.res.fuel = Math.max(0, st.res.fuel - 3.4);
                H.note(st, "Momentum dumped on RCS. Wheels back inside the envelope.", "info");
              } },
            { text: "Re-trim the stack to null the torque",
              note: "Free if it works. Requires a pilot who knows the vehicle.",
              apply: function (st, H) {
                if (H.hasRole(st, "pilot")) {
                  H.note(st, "Centre of pressure re-trimmed against centre of mass. Accumulation rate way down.", "info");
                  st.res.fuel = Math.max(0, st.res.fuel - 0.5);
                } else {
                  H.note(st, "Trim attempt without a pilot made the accumulation worse.", "fault");
                  st.res.fuel = Math.max(0, st.res.fuel - 5.5);
                  st.mod.drive = Math.max(0, st.mod.drive - 4);
                }
              } },
            { text: "Let them saturate and fly on thrusters",
              note: "Works. Burns propellant continuously.",
              apply: function (st, H) {
                st.res.fuel = Math.max(0, st.res.fuel - 8);
                st.mod.drive = Math.max(0, st.mod.drive - 3);
                H.note(st, "Attitude on RCS only. The tank is now doing a job the wheels used to.", "fault");
              } }
          ]
        };
      }
    },

    // ── Navigation ────────────────────────────────────────────────────────
    {
      id: "tcm",
      sys: "GNC", art: "station", cat: "systems", weight: 7,
      when: function (s) { return s.wpIndex >= 3 && s.wpIndex <= 10; },
      make: function (s, Haul, rand) {
        const dv = rng(rand, 4, 26, 1);
        const err = rng(rand, 90, 1400, 0);
        return {
          title: "TRAJECTORY CORRECTION REQUIRED",
          body: "Doppler tracking puts the predicted arrival B-plane " + err + " km off " +
                "target. Left alone that walks the entry corridor out of tolerance. The " +
                "correction is " + dv + " m/s and it is cheaper now than it will ever be " +
                "again — correction cost grows the longer the error propagates.",
          choices: [
            { text: "Burn the correction now",
              note: "Cheapest it will ever be.",
              apply: function (st, H) {
                st.res.fuel = Math.max(0, st.res.fuel - dv * 0.16);
                H.note(st, "TCM executed. Residuals inside tolerance.", "info");
              } },
            { text: "Defer to the next window and re-solve",
              note: "Costs more delta-v later. Sometimes the error partly cancels.",
              apply: function (st, H) {
                if (st.rand() < 0.4) {
                  H.note(st, "Later solution came in smaller. The deferral paid.", "info");
                  st.res.fuel = Math.max(0, st.res.fuel - dv * 0.09);
                } else {
                  H.note(st, "Error propagated. The correction got more expensive, as advertised.", "fault");
                  st.res.fuel = Math.max(0, st.res.fuel - dv * 0.31);
                }
              } },
            { text: "Take it out of the entry corridor instead",
              note: "Saves propellant. Spends aerobrake margin.",
              apply: function (st, H) {
                st.mod.hab = Math.max(0, st.mod.hab - 8);
                H.note(st, "Correction folded into entry. The corridor just got narrower.", "fault");
              } }
          ]
        };
      }
    },

    // ── Fire ──────────────────────────────────────────────────────────────
    {
      id: "smoulder",
      sys: "SAFETY", art: "solar-flare", cat: "systems", weight: 6,
      when: function (s) { return s.day > 40; },
      make: function (s, Haul, rand) {
        const bay = pick(rand, ["avionics bay", "galley wiring run", "stowage locker"]);
        return {
          title: "SMOKE DETECTOR — " + bay.toUpperCase(),
          body: "Particulate alarm in the " + bay + ". No buoyant convection here, so " +
                "there is no plume to follow and no flame to see — a fire in free fall " +
                "sits as a slow spherical smoulder, starving itself on its own products " +
                "until ventilation feeds it. The ventilation is what is feeding it.",
          choices: [
            { text: "Kill ventilation to the zone and let it starve",
              note: "Correct procedure. Costs the equipment in that bay.",
              apply: function (st, H) {
                st.mod.hab = Math.max(0, st.mod.hab - 9);
                st.mod.drive = Math.max(0, st.mod.drive - 4);
                H.note(st, "Zone isolated. It went out on its own once the flow stopped.", "info");
              } },
            { text: "Fight it with the extinguisher",
              note: "Fast. Puts fire suppressant through the cabin air.",
              apply: function (st, H) {
                st.mod.life = Math.max(0, st.mod.life - 7);
                hurtAll(st, H, 6, "co2");
                H.note(st, "Fire out. Scrubbers now have to pull the suppressant back out of the air.", "info");
              } },
            { text: "Find the source first",
              note: "Right answer if you have time. You may not.",
              apply: function (st, H) {
                if (st.rand() < 0.55) {
                  H.note(st, "Chafed harness found and cut out before it propagated.", "info");
                  st.mod.hab = Math.max(0, st.mod.hab - 3);
                } else {
                  st.mod.hab = Math.max(0, st.mod.hab - 18);
                  hurtAll(st, H, 10, "injury");
                  H.note(st, "It got into the insulation while you were looking for it.", "death");
                }
              } }
          ]
        };
      }
    },

    // ── Crew physiology ───────────────────────────────────────────────────
    {
      id: "sans",
      sys: "MEDICAL", art: "blackout", cat: "medical", weight: 7,
      when: function (s) { return s.day > 70; },
      make: function (s, Haul, rand) {
        const diop = rng(rand, 0.75, 1.75, 2);
        return {
          title: "VISUAL ACUITY LOSS",
          body: "Fundoscopy shows optic disc oedema and choroidal folds — a hyperopic " +
                "shift of about " + diop + " dioptres. Fluid has moved headward and stayed " +
                "there, and the pressure is on the back of the eye. Nobody has solved " +
                "this. The countermeasures are guesses that sometimes help.",
          choices: [
            { text: "Lower-body negative pressure sessions",
              note: "Pulls fluid footward for a few hours a day. Crew time, no cure.",
              apply: function (st, H) {
                const v = anyCrew(st, H);
                if (v) { v.health = Math.min(100, v.health + 5); v.morale -= 3; }
                H.note(st, "LBNP sessions on the schedule. It is a countermeasure, not a fix.", "medical");
              } },
            { text: "Issue corrective lenses and carry on",
              note: "Cheap. Treats the symptom, not the pressure.",
              apply: function (st, H) {
                const v = anyCrew(st, H);
                if (v) v.health -= 5;
                H.note(st, "Spare glasses issued from the medical kit.", "medical");
              } },
            { text: "Reduce CO₂ setpoint — it may be a contributor",
              note: "Plausible mechanism. Costs scrubber duty.",
              apply: function (st, H) {
                st.mod.life = Math.max(0, st.mod.life - 4);
                H.living(st).forEach(function (c) { c.health = Math.min(100, c.health + 3); });
                H.note(st, "Scrubbers pushed harder on the theory that CO₂ is part of it.", "medical");
              } }
          ]
        };
      }
    },
    {
      id: "bone",
      sys: "MEDICAL", art: "blackout", cat: "medical", weight: 6,
      when: function (s) { return s.day > 90; },
      make: function (s, Haul, rand) {
        const pct = rng(rand, 1.0, 1.6, 1);
        const months = Math.max(1, Math.round(s.day / 30));
        return {
          title: "BONE DENSITY SCAN",
          body: "Densitometry is showing roughly " + pct + "% loss per month at the hip " +
                "and lumbar spine, " + months + " months in. Calcium is coming out of the " +
                "skeleton and going through the kidneys, which is how you get a renal " +
                "stone in a vehicle with no operating theatre. Mars gravity will not " +
                "reverse this. It will just stop making it worse.",
          choices: [
            { text: "Mandatory resistive exercise, two hours daily",
              note: "The only countermeasure that works. Costs crew time and calories.",
              apply: function (st, H) {
                st.res.cal = Math.max(0, st.res.cal - 26);
                H.living(st).forEach(function (c) { c.health = Math.min(100, c.health + 6); c.morale -= 3; });
                H.note(st, "Resistive protocol mandatory. Nobody enjoys it and everybody does it.", "medical");
              } },
            { text: "Bisphosphonates from the medical kit",
              note: "Slows resorption without the crew time.",
              apply: function (st, H) {
                H.living(st).forEach(function (c) { c.health = Math.min(100, c.health + 3); });
                H.note(st, "Pharmacological countermeasure started. Cheaper than two hours a day.", "medical");
              } },
            { text: "Defer — arrival is what matters",
              note: "Free now. They still have to stand up at the other end.",
              apply: function (st, H) {
                st.boneDeferred = true;
                H.living(st).forEach(function (c) { c.health -= 7; });
                H.note(st, "Exercise protocol suspended to protect the schedule.", "fault");
              } }
          ]
        };
      }
    },
    {
      id: "latent-virus",
      sys: "MEDICAL", art: "blackout", cat: "medical", weight: 6,
      when: function (s) { return s.day > 55; },
      make: function (s, Haul, rand) {
        const v = pick(rand, ["Epstein-Barr", "varicella-zoster", "cytomegalovirus"]);
        return {
          title: "VIRAL SHEDDING DETECTED",
          body: "Saliva assay is positive for " + v + " reactivation. Spaceflight " +
                "suppresses cell-mediated immunity and latent virus takes the opening — " +
                "this is expected, well documented, and still unpleasant in a sealed " +
                "volume where everyone breathes the same air.",
          choices: [
            { text: "Isolate and treat antivirally",
              note: "Costs the crew a working body for a while.",
              apply: function (st, H) {
                const c = anyCrew(st, H);
                if (c) { c.health -= 8; c.morale -= 6; }
                H.note(st, "Affected crew isolated in the sleep station. Duty roster absorbed it.", "medical");
              } },
            { text: "Treat and keep them on shift",
              note: "Keeps the roster. Everyone gets exposed.",
              apply: function (st, H) {
                hurtAll(st, H, 5, "rads");
                H.note(st, "Whole crew now carries it. Symptoms are mild. So far.", "medical");
              } }
          ]
        };
      }
    },

    // ── Power ─────────────────────────────────────────────────────────────
    {
      id: "array-degrade",
      sys: "EPS", art: "solar-flare", cat: "systems", weight: 7,
      when: function (s) { return s.day > 35; },
      make: function (s, Haul, rand) {
        const loss = rng(rand, 4, 14, 1);
        const au = rng(rand, 1.15, 1.55, 2);
        return {
          title: "ARRAY OUTPUT DOWN",
          body: "String output is " + loss + "% below the degradation curve. Some of " +
                "that is honest inverse-square — you are at " + au + " AU and sunlight is " +
                "thinning as you climb — but the rest is cell damage from the particle " +
                "environment. Power is the budget everything else is drawn against.",
          choices: [
            { text: "Shed non-essential loads",
              note: "Free. The crew lose the things that make this bearable.",
              apply: function (st, H) {
                moraleAll(st, H, -8);
                H.note(st, "Non-essential loads shed. That included the galley warmer and the gym display.", "info");
              } },
            { text: "Bypass the damaged strings",
              note: "Costs parts. Recovers most of the loss.",
              need: function (st) { return st.res.parts >= 1; },
              apply: function (st, H) {
                st.res.parts -= 1;
                H.repair(st, "drive", 2);
                H.note(st, "Damaged strings bypassed at the junction box.", "info");
              } },
            { text: "Draw down the batteries to cover peaks",
              note: "Works now. Deep cycling costs you capacity permanently.",
              apply: function (st, H) {
                st.mod.drive = Math.max(0, st.mod.drive - 6);
                st.mod.life = Math.max(0, st.mod.life - 3);
                H.note(st, "Batteries cycled deeper than rated. Capacity will not come back.", "fault");
              } }
          ]
        };
      }
    },

    // ── Comms ─────────────────────────────────────────────────────────────
    {
      id: "light-lag",
      sys: "COMMS", art: "station", cat: "crew", weight: 6,
      when: function (s) { return s.day > 45 && !s.blackout; },
      make: function (s, Haul, rand) {
        const min = rng(rand, 4, 21, 0);
        return {
          title: "ROUND-TRIP LIGHT TIME " + (min * 2) + " MINUTES",
          body: "One-way delay is " + min + " minutes now. Conversation is no longer " +
                "possible — everything is correspondence. A crew member asked Mission " +
                "Control a question about their family " + (min * 2) + " minutes ago and " +
                "is still waiting, and will be waiting for the rest of the shift.",
          choices: [
            { text: "Prioritise personal traffic over telemetry",
              note: "Morale. Mission Control notices the bandwidth.",
              apply: function (st, H) {
                moraleAll(st, H, 9);
                st.compliance = (st.compliance || 0) - 1;
                H.note(st, "Personal allocation raised at the expense of engineering downlink.", "info");
              } },
            { text: "Keep the telemetry pipe full",
              note: "Compliant. The crew keep waiting.",
              apply: function (st, H) {
                moraleAll(st, H, -6);
                H.note(st, "Telemetry priority maintained per flight rules.", "control");
              } }
          ]
        };
      }
    }
  ];

  /** Faults whose gate passes, minus anything fired recently. */
  function eligible(s, seen) {
    return FAULTS.filter(function (f) {
      if (seen && seen["ph-" + f.id]) return false;
      return !f.when || f.when(s);
    });
  }

  /**
   * Build one engineering event for the current state, or null. The returned object
   * matches the same shape as the authored deck so the caller cannot tell them apart.
   */
  function generate(s, Haul, seen) {
    const pool = eligible(s, seen);
    if (!pool.length) return null;
    let total = 0;
    pool.forEach(function (f) { total += (f.weight || 5); });
    let r = s.rand() * total;
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 5);
      if (r <= 0) { chosen = pool[i]; break; }
    }
    const built = chosen.make(s, Haul, s.rand);
    return {
      id: "ph-" + chosen.id,
      sys: chosen.sys,
      art: chosen.art,
      cat: chosen.cat,
      weight: chosen.weight,
      title: built.title,
      body: built.body,
      choices: built.choices
    };
  }

  return { FAULTS: FAULTS, generate: generate, eligible: eligible };
});
