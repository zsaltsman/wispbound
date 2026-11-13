// Overworld tile ids. Pure data (no Phaser) so maps can be validated headlessly.
// Ground tiles fill every cell; deco tiles sit on a second layer above them.

export const T = {
  VOID: 0,
  GRASS: 1,
  GRASS2: 2,
  GRASS3: 3,
  TUFT: 4,
  DEADFLOWER: 5,
  DIRT: 6,
  COBBLE: 7,
  COBBLE2: 8,
  PLAZA: 9,
  SAND: 10,
  SAND2: 11,
  WETSAND: 12,
  WATER: 13, // rendered transparent: the animated sea shows through
  DOCK: 14,
  DOCK_V: 15,
  SOIL: 16,
  CORN: 17,
  HAYDIRT: 18,
  WOOD: 19,
  WOOD2: 20,
  CHECKER: 21,
  CARPET: 22,
  STONE: 23,
  BATHTILE: 24,
  WALL: 25,
  WALL_LOW: 26,
  WALLM: 27,
  WALLM_LOW: 28,
  WALLC: 29,
  CAVE: 30,
  CAVE2: 31,
  CAVEWALL: 32,
  CONCRETE: 33,
  CONCRETE2: 34,
  WELLFLOOR: 35,
  WELLWALL: 36,
  PUDDLE: 37,
  MAT: 38,
  STAIRS_UP: 39,
  STAIRS_DOWN: 40,
  HEDGE: 41,
  GRAVEL: 42,
  ROCKWALL: 43,
  WALLS: 44, // store / office wall
  WALLS_LOW: 45,
  CAVEWALL_TOP: 46,
  LADDER: 47,
  SHELFWALL: 48, // cellar: rusty shelving that forms the maze walls
  DOORI: 49, // a door set into an interior wall
  // ---- World 2: the flooded island
  SHALLOW: 50, // ankle-deep floodwater (walkable)
  ASPHALT: 51,
  ASPHALT2: 52, // cracked asphalt
  ROADLINE: 53,
  SIDEWALK: 54,
  MUD: 55,
  SANDDRIFT: 56, // sand washed over the streets
  MARBLE: 57,
  GRATE: 58, // workshop metal floor
  GODSTONE: 59, // the Cave of the Gods
  GODWALL: 60,
  GODWALL_TOP: 61,
  SEAFLOOR: 62,
  PARKPATH: 63,
  // ---- the god temples (tile slots past the deco range)
  ZFLOOR: 192, // Zeus: polished black stone, lightning inlays
  CONDUIT: 193, // Zeus: a copper channel set into the floor
  TFLOOR: 194, // Thor: huge rough slabs
  PLATE: 195, // Thor: a pressure plate
  PIT: 196, // Thor: a square pit (solid)
  PIT_FILLED: 197, // Thor: a pit with a block wedged in it
  SOCKET: 198, // Thor: the gap in the conduit, where the orb belongs
  PFLOOR: 199, // Poseidon: wave mosaic
  PWATER: 200, // Poseidon: deep water (solid)
  PBASIN: 201, // Poseidon: a drained basin floor, wet and weedy
  AFLOOR: 202, // Athena: pale marble with a meander border
  ACARPET: 203, // Athena: a reading-room rug
  VFLOOR: 204, // the vault: cracked, enormous flagstones
  VCRACK: 205, // the vault: a deep fissure (walkable)
  // ---- World 3: Bacchus Key
  BOARDWALK: 206,
  PROMENADE: 207, // festive paving with diamond inlays
  PROMENADE2: 208, // the same, littered with confetti
  CLUBFLOOR: 209, // the dance floor's light panels
  CLUBFLOOR2: 210,
  CLUBCARPET: 211,
  BARWOOD: 212,
  CLINICTILE: 213,
  BOOZE: 214, // paving awash with spilt booze (after the barrel)
  STAGE: 215,
  CLUBWALL: 216, // solid
  CLUBWALL_LOW: 217, // solid
  SANDLIT: 218, // pale beach sand
  // ---- World 4: the Forgotten Island
  W4_GRASS: 219,
  W4_FLOWERS: 220,
  W4_TRAIL: 221,
  W4_ROCK: 222,
  W4_ROCKTOP: 223,
  W4_CLIFF: 224,
  W4_BARREN: 225,
  W4_BARREN2: 226,
  W4_DEADGRASS: 227,
  W4_COBBLE: 228,
  W4_SHORE: 229,
  W4_SAND: 230,
  W4_FOREST: 231,
  W4_FOREST2: 232,
  W4_STONE: 233,
  W4_ROOTFLOOR: 234,
  W4_STONEWALL: 235,
  W4_STONEWALL_LOW: 236,
  W4_PLANK: 237,
  W4_BARK: 238,
  W4_BARK_LOW: 239,
  W4_ROPEBRIDGE: 240,
  W4_GAP: 241,
  W4_CHANNEL: 242,
  W4_CHANNEL_WET: 243,
  W4_CRACKED: 244,
  W4_DECK: 245,
  W4_HULL: 246,
  W4_HULL_LOW: 247,
  W4_CASTLE: 248,
  W4_CASTLEWALL: 249,
  W4_CASTLEWALL_LOW: 250,
  W4_CARPET: 251,
  W4_VOLC: 252,
  W4_VOLCWALL: 253,
  W4_VOLCWALL_LOW: 254,
  W4_CELLFLOOR: 255,
  // ---- the final world: the Reaper's prison
  W5_FLOOR: 256,
  W5_CELL: 257,
  W5_WALL: 258,
  W5_WALL_LOW: 259,
  W5_BARS: 260,
  W5_BARS_BROKEN: 261,
  W5_MESS: 262,
  W5_GUARD: 263,
  W5_GWALL: 264,
  W5_GWALL_LOW: 265,
  W5_SLOPFLOOR: 266,
  W5_HIGH: 267,
  W5_HWALL: 268,
  W5_HWALL_LOW: 269,
  W5_LIFT: 270,
  W5_KITCHEN: 271,
  // World 4: the spirit research facility in the hillside
  LAB_FLOOR: 288,
  LAB_GRATE: 289,
  LAB_WALL: 290,
  LAB_WALL_LOW: 291,
  LAB_GLASS: 292, // a glass partition: solid, but you can see through it
  LAB_SCORCH: 293, // walkable: floor burnt and gouged
} as const;

/** Deco layer ids (start at 64). */
export const D = {
  NONE: -1,
  FENCE_H: 64,
  FENCE_V: 65,
  FENCE_POST: 66,
  FENCE_BROKEN: 67,
  GRAVE: 68,
  BARREL: 69,
  CRATE: 70,
  HAY: 71,
  TROUGH: 72,
  TROUGH_FULL: 73,
  SIGN: 74,
  STUMP: 75,
  ROCK: 76,
  BUSH: 77,
  PUMPKIN: 78,
  REEDS: 79,
  BENCH: 80,
  TABLE_L: 81,
  TABLE_R: 82,
  CHAIR: 83,
  BED_T: 84,
  BED_B: 85,
  BOOK_T: 86,
  BOOK_B: 87,
  CABINET: 88,
  STOVE: 89,
  SINK: 90,
  FRIDGE_T: 91,
  FRIDGE_B: 92,
  PLANT: 93,
  CANDLE: 94,
  RUG: 95,
  COUNTER: 96,
  REGISTER: 97,
  TOILET: 98,
  STALL: 99,
  ROTTEN: 100,
  SHELF_T: 101, // store aisle shelf (top half)
  SHELF_B: 102,
  PAINTING: 103,
  WINDOW: 104,
  FIREPLACE_L: 105,
  FIREPLACE_R: 106,
  DESK_L: 107,
  DESK_R: 108,
  FILE: 109,
  DOGBED: 110,
  CRYSTAL: 111,
  CURTAIN: 112,
  BALLTABLE: 113,
  COFFIN_T: 114,
  COFFIN_B: 115,
  PIANO_L: 116,
  PIANO_R: 117,
  ARMOR: 118,
  MIRROR: 119,
  STALAG: 120,
  BONES: 121,
  GLOWROCK: 122,
  BROKENBOX: 123,
  CANS: 124,
  BUCKET: 125,
  PLANKS: 126,
  FEEDSACK: 127,
  NET: 128,
  FISHRACK: 129,
  CLOCK_SMALL: 130,
  SPOONS: 131,
  SHRINE: 132,
  POT: 133,
  CHANDELIER: 134,
  FLAG: 135,
  LANTERN_POST: 136,
  TOMBSTONE2: 137,
  SKULLPILE: 138,
  CORPSE_FRIDGE: 139,
  MOP: 140,
  DIAL_CLOCK: 141, // wall clock
  POSTER: 142,
  CAULDRON: 143,
  STAR_RUG: 144,
  TABLE_ROUND: 145,
  TV: 146,
  SOFA_L: 147,
  SOFA_R: 148,
  WARDROBE_T: 149,
  WARDROBE_B: 150,
  SACK: 151,
  ROPE: 152,
  BOARDED: 153, // boarded door / barricade
  // ---- World 2
  SANDBAG: 154,
  WARNSIGN: 155,
  DEBRIS: 156,
  SEAWEED: 157, // walkable
  TIRE: 158,
  CONE: 159,
  BLUEPRINT: 160, // wall
  WIRES: 161, // walkable floor clutter
  MACHINE: 162,
  TOOLRACK: 163,
  WORKBENCH: 164,
  VAULT: 165,
  BALLOT: 166,
  TRASHCAN: 167,
  PB_SHELF_T: 168,
  PB_SHELF_B: 169,
  CARVING: 170, // wall
  BRAZIER: 171,
  RUBBLE: 172,
  GEARS: 173,
  COMPUTER: 174,
  SCREEN: 175, // wall
  MAPTABLE: 176,
  NOTES: 177, // wall
  FLOODLINE: 178, // wall stain
  CRACK: 179, // walkable floor crack
  PUDDLE_D: 180, // walkable
  TELLER: 181,
  ROPEPOST: 182,
  LIFERING: 183,
  BUOY: 184,
  BARRIER: 185,
  PALLET: 186,
  CLAMSHELL: 187, // walkable
  GLYPH: 188, // walkable floor glyph
  PILLAR_T: 189,
  PILLAR_B: 190,
  URN: 191,
  // ---- the final world (tile slots 272+)
  W5_SLOP: 272, // walkable splat
  W5_FOOD: 273, // walkable spilled food
  W5_TALLY: 274, // wall: tally marks
  W5_SCRAWL: 275, // wall: writing
  W5_SHACKLE: 276, // wall: chains
  W5_BOARD: 277, // wall: duty roster
  W5_BUNK_T: 278,
  W5_BUNK_B: 279,
  W5_LOCKER: 280,
  W5_RACK: 281,
  W5_GARBAGE: 282,
  W5_DRAIN: 283, // walkable
  W5_SHELF: 284,
  W5_TRAYTABLE: 285,
  W5_STOOL: 286,
  W5_DESK: 287,
  // the spirit research facility
  LAB_DESK: 294,
  LAB_CONSOLE: 295,
  LAB_CABINET: 296,
  LAB_CLAW: 297, // walkable: deep gouges in the floor
  LAB_WALLCLAW: 298, // wall: deep gouges
  LAB_SIGN: 299, // wall: a painted notice
  LAB_PIPES: 300, // wall: pipes and a gauge
  LAB_CANISTER: 301,
  LAB_CABLES: 302, // walkable
  LAB_GLASSBITS: 303, // walkable: broken glass
  LAB_CHART: 304, // wall: a chart
  LAB_LOCKER: 305,
  LAB_BENCH: 306,
  LAB_PAPERS: 307, // walkable: scattered papers
  LAB_BOARD: 308, // wall: a notice board
} as const;

/** Ground tiles that block movement. */
export const SOLID_GROUND = new Set<number>([
  T.W4_ROCK,
  T.W4_ROCKTOP,
  T.W4_CLIFF,
  T.W4_STONEWALL,
  T.W4_STONEWALL_LOW,
  T.W4_BARK,
  T.W4_BARK_LOW,
  T.W4_GAP,
  T.W4_CHANNEL,
  T.W4_CHANNEL_WET,
  T.W4_HULL,
  T.W4_HULL_LOW,
  T.W4_CASTLEWALL,
  T.W4_CASTLEWALL_LOW,
  T.W5_WALL,
  T.W5_WALL_LOW,
  T.W5_BARS,
  T.W5_GWALL,
  T.W5_GWALL_LOW,
  T.W5_HWALL,
  T.W5_HWALL_LOW,
  T.W4_VOLCWALL,
  T.W4_VOLCWALL_LOW,
  T.LAB_WALL,
  T.LAB_WALL_LOW,
  T.LAB_GLASS,
  T.PIT,
  T.PWATER,
  T.CLUBWALL,
  T.CLUBWALL_LOW,
  T.VOID,
  T.WATER,
  T.CORN,
  T.WALL,
  T.WALL_LOW,
  T.WALLM,
  T.WALLM_LOW,
  T.WALLC,
  T.CAVEWALL,
  T.CAVEWALL_TOP,
  T.WELLWALL,
  T.HEDGE,
  T.ROCKWALL,
  T.WALLS,
  T.WALLS_LOW,
  T.SHELFWALL,
  T.DOORI,
  T.GODWALL,
  T.GODWALL_TOP,
]);

/** Deco tiles you can walk over. */
export const WALKABLE_DECO = new Set<number>([
  D.RUG,
  D.STAR_RUG,
  D.BONES,
  D.REEDS,
  D.PAINTING,
  D.WINDOW,
  D.POSTER,
  D.DIAL_CLOCK,
  D.CURTAIN,
  D.CHANDELIER,
  D.MIRROR,
  D.FLAG,
  D.SEAWEED,
  D.WIRES,
  D.BLUEPRINT,
  D.CARVING,
  D.SCREEN,
  D.NOTES,
  D.FLOODLINE,
  D.CRACK,
  D.PUDDLE_D,
  D.CLAMSHELL,
  D.GLYPH,
  D.W5_SLOP,
  D.W5_FOOD,
  D.W5_TALLY,
  D.W5_SCRAWL,
  D.W5_SHACKLE,
  D.W5_BOARD,
  D.W5_DRAIN,
  D.LAB_CLAW,
  D.LAB_WALLCLAW,
  D.LAB_SIGN,
  D.LAB_PIPES,
  D.LAB_CABLES,
  D.LAB_GLASSBITS,
  D.LAB_CHART,
  D.LAB_PAPERS,
  D.LAB_BOARD,
]);

/** Wall-mounted deco (drawn on wall rows). */
export const WALL_DECO = new Set<number>([D.PAINTING, D.WINDOW, D.POSTER, D.DIAL_CLOCK, D.CURTAIN, D.MIRROR, D.FLAG, D.BLUEPRINT, D.CARVING, D.SCREEN, D.NOTES, D.FLOODLINE, D.W5_TALLY, D.W5_SCRAWL, D.W5_SHACKLE, D.W5_BOARD, D.LAB_WALLCLAW, D.LAB_SIGN, D.LAB_PIPES, D.LAB_CHART, D.LAB_BOARD]);
