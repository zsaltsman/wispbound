import { SCRIPTS, GATES } from './registry';
import { TOWN_SCRIPTS, GATES as TOWN_GATES } from './s_town';
import { ROUTE_SCRIPTS } from './s_routes';
import { END_SCRIPTS } from './s_endgame';
import { W2_MAIN, W2_GATES } from './w2_main';
import { W2_PARK } from './w2_park';
import { W2_CIVIC, W2_CIVIC_GATES } from './w2_civic';
import { SHOP_SCRIPTS } from './s_shops';
import { W2_TEMPLE_SCRIPTS, W2_TEMPLE_GATES } from './w2_temples';
import { W3_MAIN, W3_GATES } from './w3_main';
import { W3_DAY2 } from './w3_day2';
import { W3_DAY3 } from './w3_day3';
import { W3_FOLK } from './w3_folk';
import { W4_ACT1, W4_ACT1_GATES } from './w4_act1';
import { W4_TOWER, W4_TOWER_GATES } from './w4_tower';
import { W4_ROUTE_B, W4_ROUTE_B_GATES } from './w4_routeB';
import { W4_END } from './w4_end';
import { SCRIPTS_LAB as W4_LAB, W4_LAB_GATES } from './w4_lab';
import { W5_PRISON } from './w5_prison';
import { W5_MESS } from './w5_mess';
import { W5_UPPER } from './w5_upper';
import { W6_FINAL } from './w6_final';
import { VOYAGE_SCRIPTS } from './voyage';

// Aggregates every story module into one table the WorldScene can run.

Object.assign(SCRIPTS, TOWN_SCRIPTS, ROUTE_SCRIPTS, END_SCRIPTS, W2_MAIN, W2_PARK, W2_CIVIC, SHOP_SCRIPTS, W2_TEMPLE_SCRIPTS, W3_MAIN, W3_DAY2, W3_DAY3, W3_FOLK, W4_ACT1, W4_TOWER, W4_ROUTE_B, W4_END, W4_LAB, W5_PRISON, W5_MESS, W5_UPPER, W6_FINAL, VOYAGE_SCRIPTS);
// developer test checkpoints start boss fights directly
for (const e of ['fisherman', 'dutchman', 'salesman', 'kraken', 'scorvex', 'widowmaker', 'ironclad', 'champion', 'wispmane', 'squirrel', 'viperwind', 'subject', 'reaper', 'skelwarden', 'sc_booheet', 'sc_shipwraith', 'sc_hauntcorn', 'sc_umbrawl', 'sc_tickraith'] as const)
  SCRIPTS['dev_fight_' + e] = async (w) => {
    await w.wait(300);
    await w.startBattle(e);
  };

Object.assign(GATES, TOWN_GATES, W2_GATES, W2_CIVIC_GATES, W2_TEMPLE_GATES, W3_GATES, W4_ACT1_GATES, W4_TOWER_GATES, W4_ROUTE_B_GATES, W4_LAB_GATES);

export { SCRIPTS, GATES };
export type { W as WorldAPI } from './helpers';
