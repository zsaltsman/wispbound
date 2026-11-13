// Heuristic "thoughtful player" policies used by the simulator.
import type { Battle } from '../src/engine/battle';

export type Policy = (b: Battle) => number;

const idx = (b: Battle, id: string) => b.creature.abilities.findIndex((a) => a.id === id);
const ok = (b: Battle, id: string) => b.canUse(idx(b, id)).ok;
const hpPct = (b: Battle) => b.p.hp / b.p.maxHp;
const threat = (b: Battle) => (b.intent.hidden ? 45 : b.estimateIntent().total);
const charging = (b: Battle) => b.intent.breakNeed > 0;
const firing = (b: Battle) => b.intent.stage === 'fire';

export const smart: Record<string, Policy> = {
  booheet: (b) => {
    const t = threat(b);
    const hex = b.st('boss', 'HEX')?.stacks ?? 0;
    if (t >= 55 && ok(b, 'peekaboo')) return idx(b, 'peekaboo');
    if ((b.st('boss', 'WEAKENED')?.turns ?? 0) <= 1 && ok(b, 'dread_wail') && b.intent.stage !== 'charge')
      return idx(b, 'dread_wail');
    if (hex >= 3 && ok(b, 'night_terror')) return idx(b, 'night_terror');
    return idx(b, 'spook_bolt');
  },
  shipwraith: (b) => {
    const t = threat(b);
    const shield = b.st('player', 'SHIELD')?.value ?? 0;
    if (t >= 70 && ok(b, 'dead_mans_volley')) return idx(b, 'dead_mans_volley');
    if (t >= 55 && !b.has('player', 'GUARD') && ok(b, 'batten_down')) return idx(b, 'batten_down');
    if (t >= 35 && shield < 30 && ok(b, 'barnacle_barrier')) return idx(b, 'barnacle_barrier');
    if (b.intent.id === 'tide' && !b.has('player', 'GUARD') && shield <= 0 && ok(b, 'barnacle_barrier'))
      return idx(b, 'barnacle_barrier');
    return idx(b, 'spectral_cannon');
  },
  hauntcorn: (b) => {
    const t = threat(b);
    const neg = ['DROWNING', 'FOGGED', 'ANCHORED'].some((s) => b.has('player', s as any));
    if ((hpPct(b) < 0.5 || (neg && hpPct(b) < 0.75) || t >= 90) && ok(b, 'hallowed_harvest'))
      return idx(b, 'hallowed_harvest');
    if (b.p.en < 5 && ok(b, 'corn_ritual')) return idx(b, 'corn_ritual');
    if (hpPct(b) < 0.62 && ok(b, 'harvest_moon')) return idx(b, 'harvest_moon');
    if (b.p.hp - t < b.p.maxHp * 0.3 && ok(b, 'harvest_moon')) return idx(b, 'harvest_moon');
    return idx(b, 'straw_lash');
  },
  umbrawl: (b) => {
    const t = threat(b);
    const charged = b.has('player', 'CHARGED');
    if (t >= 50 && ok(b, 'canopy_catch')) return idx(b, 'canopy_catch');
    if (charging(b) && !firing(b) && ok(b, 'monsoon_plunge') && t < 40) return idx(b, 'monsoon_plunge');
    if (charged && ok(b, 'monsoon_plunge') && t < 45 && b.p.hp > 120) return idx(b, 'monsoon_plunge');
    if (!charged && ok(b, 'monsoon_plunge') && t < 30 && b.p.hp > 150) return idx(b, 'monsoon_plunge');
    if (ok(b, 'cyclone_spin') && (b.p.en >= 8 || charged)) return idx(b, 'cyclone_spin');
    return idx(b, 'parasol_pierce');
  },
  tickraith: (b) => {
    const t = threat(b);
    const recent = b.p.dmgLog.filter((d) => d.round >= b.turn - 2).reduce((s, d) => s + d.amount, 0);
    if ((firing(b) || t >= 85) && ok(b, 'stop_the_clock')) return idx(b, 'stop_the_clock');
    if ((recent >= 75 || (recent >= 45 && hpPct(b) < 0.5)) && ok(b, 'rewind')) return idx(b, 'rewind');
    if (t >= 35 && !b.has('player', 'GUARD') && ok(b, 'brass_casing')) return idx(b, 'brass_casing');
    return idx(b, 'pendulum_crush');
  },
  // ---- World 2
  glowbell: (b) => {
    const t = threat(b);
    const hex = b.st('boss', 'HEX')?.stacks ?? 0;
    if (t >= 55 && ok(b, 'jelly_flash')) return idx(b, 'jelly_flash');
    if (t >= 35 && !b.has('player', 'SHIELD') && ok(b, 'static_veil')) return idx(b, 'static_veil');
    if (hex >= 4 && ok(b, 'tempest_bloom')) return idx(b, 'tempest_bloom');
    return idx(b, 'zap_sting');
  },
  hammerfin: (b) => {
    const t = threat(b);
    if (t >= 40 && !b.has('player', 'GUARD') && ok(b, 'hammer_guard')) return idx(b, 'hammer_guard');
    if (!b.has('boss', 'WEAKENED') && ok(b, 'riptide_roar')) return idx(b, 'riptide_roar');
    if (ok(b, 'frenzy_ram') && t < 60) return idx(b, 'frenzy_ram');
    return idx(b, 'fin_bash');
  },
  bubblotl: (b) => {
    const t = threat(b);
    if ((firing(b) || t >= 80) && ok(b, 'big_bubble')) return idx(b, 'big_bubble');
    if ((hpPct(b) < 0.5 || b.has('player', 'DROWNING')) && ok(b, 'froth_bath')) return idx(b, 'froth_bath');
    if (ok(b, 'gill_geyser') && t < 70) return idx(b, 'gill_geyser');
    return idx(b, 'bubble_pop');
  },
  glidray: (b) => {
    const t = threat(b);
    if (t >= 45 && ok(b, 'moon_mantle')) return idx(b, 'moon_mantle');
    if (ok(b, 'lunar_ray') && t < 60) return idx(b, 'lunar_ray');
    if (ok(b, 'skylight_dive') && b.p.en < 6) return idx(b, 'skylight_dive');
    return idx(b, 'wing_slice');
  },
  // ---- World 3
  scorvlet: (b) => {
    const t = threat(b);
    const burn = b.st('boss', 'BURNING')?.turns ?? 0;
    if (t >= 40 && !b.has('player', 'GUARD') && ok(b, 'cinder_shell')) return idx(b, 'cinder_shell');
    if (!b.has('boss', 'WEAKENED') && ok(b, 'smog_cloud')) return idx(b, 'smog_cloud');
    if (burn >= 2 && ok(b, 'stoked_sting')) return idx(b, 'stoked_sting');
    return idx(b, 'ember_nip');
  },
  widowling: (b) => {
    const t = threat(b);
    if ((firing(b) || t >= 60) && ok(b, 'tangle_web')) return idx(b, 'tangle_web');
    if (ok(b, 'eightfold_flurry') && (b.has('boss', 'SNARED') || t < 40)) return idx(b, 'eightfold_flurry');
    if (!b.has('boss', 'WEAKENED') && ok(b, 'venom_bite')) return idx(b, 'venom_bite');
    return idx(b, 'silk_snip');
  },
  ironbud: (b) => {
    const t = threat(b);
    const r = b.reserve();
    if (t >= 35 && !b.has('player', 'GUARD') && ok(b, 'bulwark')) return idx(b, 'bulwark');
    if (((r && r.p.hp > 0 && r.p.hp < r.p.maxHp * 0.6) || hpPct(b) < 0.5) && ok(b, 'rally_clang')) return idx(b, 'rally_clang');
    if (ok(b, 'big_bonk')) return idx(b, 'big_bonk');
    return idx(b, 'tiny_tap');
  },
  // ---- the final world
  wispmane: (b) => {
    const t = threat(b);
    const kinds = ['HEX', 'WEAKENED', 'SPOOKED', 'HAUNTED', 'BURNING', 'SNARED', 'DELAYED'].filter((s) => b.has('boss', s as any)).length;
    if (!b.has('boss', 'WEAKENED') && ok(b, 'w_roar')) return idx(b, 'w_roar');
    if (!b.has('boss', 'HAUNTED') && ok(b, 'w_grasp')) return idx(b, 'w_grasp');
    if (kinds >= 3 && ok(b, 'w_wrath') && t < 70) return idx(b, 'w_wrath');
    return idx(b, 'w_claws');
  },
  viperwind: (b) => {
    const t = threat(b);
    const neg = ['ANCHORED', 'ROOTED', 'SHAKEN', 'FOGGED', 'WEBBED'].some((s) => b.has('player', s as any));
    if (t >= 40 && !b.has('player', 'GUARD') && ok(b, 'v_barrier')) return idx(b, 'v_barrier');
    if ((neg || hpPct(b) < 0.6) && ok(b, 'v_tailwind')) return idx(b, 'v_tailwind');
    if (ok(b, 'v_tempest')) return idx(b, 'v_tempest');
    return idx(b, 'v_gale');
  },
  flamora: (b) => {
    const t = threat(b);
    if (t >= 50 && ok(b, 'f_veil')) return idx(b, 'f_veil');
    if (!b.has('boss', 'WEAKENED') && ok(b, 'f_cry')) return idx(b, 'f_cry');
    if (b.has('boss', 'BURNING') && ok(b, 'f_nova')) return idx(b, 'f_nova');
    return idx(b, 'f_talon');
  },
};

/** Two-creature play: swap out a creature about to fall when the partner is healthy. */
export function partySmart(b: Battle): number {
  const r = b.reserve();
  const t = threat(b);
  if (r && r.p.hp > 0 && b.p.hp - t < b.p.maxHp * 0.12 && r.p.hp > r.p.maxHp * 0.5 && b.intent.stage !== 'charge') return -1;
  const pick = smart[b.cid](b);
  // a thoughtful player saves the big hit until the armor opens again
  if (b.has('boss', 'FORTIFIED') && b.creature.abilities[pick]?.kind === 'signature') {
    const d = b.creature.abilities.findIndex((a) => a.kind === 'defense');
    return d >= 0 && b.canUse(d).ok ? d : 0;
  }
  return pick;
}

