import { TeamColor, CrateEntity } from '../types';

export const MAP_WIDTH = 2600;
export const MAP_HEIGHT = 1400;

export interface PlatformObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  isMonument?: boolean;
  isJumpThrough?: boolean; // Can jump through from bottom
  material?: 'stone' | 'metal' | 'monument' | 'ground';
}

export interface SpawnPoint {
  x: number;
  y: number;
  team?: TeamColor;
}

// 2D Side-View Platforms & Boundaries
export const MAP_PLATFORMS: PlatformObstacle[] = [
  // Outer Boundaries
  { id: 'boundary_left', x: 0, y: 0, width: 60, height: MAP_HEIGHT, material: 'ground' },
  { id: 'boundary_right', x: MAP_WIDTH - 60, y: 0, width: 60, height: MAP_HEIGHT, material: 'ground' },
  { id: 'boundary_ceiling', x: 0, y: 0, width: MAP_WIDTH, height: 40, material: 'metal' },

  // Main Solid Ground Promenade (Riadh El Feth / Kasbah pavers)
  { id: 'ground_floor', x: 60, y: 1250, width: MAP_WIDTH - 120, height: 150, material: 'ground', label: 'الساحة المركزية' },

  // Center: Maqam El Chahid (Martyrs' Memorial) Terraces & Pedestal
  // Center Flame Altar Podium (Where the eternal flame burns)
  { id: 'maqam_altar_podium', x: 1040, y: 1080, width: 520, height: 35, isMonument: true, material: 'monument', label: 'مقام الشهيد - شعلة الشهيد' },
  // Monument Mid Catwalk
  { id: 'maqam_mid_catwalk', x: 1100, y: 880, width: 400, height: 26, isMonument: true, material: 'monument', isJumpThrough: true },
  // Monument High Observation Perch
  { id: 'maqam_high_perch', x: 1180, y: 680, width: 240, height: 24, isMonument: true, material: 'monument', isJumpThrough: true },
  // Monument Apex Spire Ledge
  { id: 'maqam_apex_ledge', x: 1220, y: 480, width: 160, height: 22, isMonument: true, material: 'monument', isJumpThrough: true },

  // West Flank: Kasbah Architectural Terraces & Stairs
  { id: 'kasbah_tier_1', x: 180, y: 1140, width: 340, height: 30, material: 'stone', label: 'شرفة القصبة السفلى' },
  { id: 'kasbah_tier_2', x: 340, y: 1000, width: 280, height: 26, material: 'stone', isJumpThrough: true },
  { id: 'kasbah_roof_high', x: 140, y: 840, width: 360, height: 28, material: 'stone', isJumpThrough: true, label: 'سطح القصبة العالي' },
  { id: 'kasbah_sky_bridge', x: 440, y: 720, width: 240, height: 24, material: 'metal', isJumpThrough: true },

  // East Flank: Algiers Port & Industrial Catwalks
  { id: 'port_tier_1', x: 2080, y: 1140, width: 360, height: 30, material: 'metal', label: 'أرصفة الميناء' },
  { id: 'port_tier_2', x: 1980, y: 1000, width: 280, height: 26, material: 'metal', isJumpThrough: true },
  { id: 'port_crane_gantry', x: 2100, y: 840, width: 360, height: 28, material: 'metal', isJumpThrough: true, label: 'منصة رافعة الميناء' },
  { id: 'port_sky_bridge', x: 1920, y: 720, width: 240, height: 24, material: 'metal', isJumpThrough: true },

  // Mid-Ground Transition Platforms (Connecting wings to monument)
  { id: 'mid_wing_west', x: 740, y: 960, width: 240, height: 24, material: 'stone', isJumpThrough: true },
  { id: 'mid_wing_east', x: 1620, y: 960, width: 240, height: 24, material: 'stone', isJumpThrough: true },
  { id: 'high_wing_west', x: 820, y: 800, width: 220, height: 22, material: 'metal', isJumpThrough: true },
  { id: 'high_wing_east', x: 1560, y: 800, width: 220, height: 22, material: 'metal', isJumpThrough: true },
];

// Team Base Spawns for 2D Side-View
export const TEAM_SPAWNS: Record<TeamColor, SpawnPoint> = {
  red: { x: 260, y: 1080, team: 'red' }, // West Low Kasbah
  green: { x: 2320, y: 1080, team: 'green' }, // East Low Port
  blue: { x: 280, y: 780, team: 'blue' }, // West High Roof
  yellow: { x: 2280, y: 780, team: 'yellow' }, // East High Gantry
};

export const NEUTRAL_SPAWNS: SpawnPoint[] = [
  { x: 1200, y: 1020 }, // Center Altar
  { x: 1300, y: 820 },  // Center Mid Catwalk
  { x: 800, y: 1180 },  // West Ground
  { x: 1800, y: 1180 }, // East Ground
  { x: 840, y: 900 },   // Mid Wing West
  { x: 1660, y: 900 },  // Mid Wing East
];

// Wooden Crates sitting on platforms (Pushable & Destructible)
export const INITIAL_CRATES: Omit<CrateEntity, 'vx' | 'vy' | 'broken'>[] = [
  // Ground floor crates
  { id: 'crate_g1', x: 680, y: 1195, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_g2', x: 740, y: 1195, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_g3', x: 1820, y: 1195, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_g4', x: 1880, y: 1195, width: 55, height: 55, hp: 4, maxHp: 4 },

  // Center Memorial podium crates
  { id: 'crate_c1', x: 1080, y: 1025, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_c2', x: 1460, y: 1025, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_c3', x: 1260, y: 825, width: 55, height: 55, hp: 4, maxHp: 4 },

  // Kasbah crates
  { id: 'crate_k1', x: 220, y: 1085, width: 55, height: 55, hp: 3, maxHp: 3 },
  { id: 'crate_k2', x: 380, y: 945, width: 55, height: 55, hp: 3, maxHp: 3 },
  { id: 'crate_k3', x: 260, y: 785, width: 55, height: 55, hp: 3, maxHp: 3 },

  // Port crates
  { id: 'crate_p1', x: 2240, y: 1085, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_p2', x: 2060, y: 945, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_p3', x: 2260, y: 785, width: 55, height: 55, hp: 4, maxHp: 4 },
];
