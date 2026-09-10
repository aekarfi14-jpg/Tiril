import { TeamColor, CrateEntity } from '../types';

export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1600;

export interface WallObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  isMonument?: boolean;
}

export interface SpawnPoint {
  x: number;
  y: number;
  team?: TeamColor;
}

// Map Static Obstacles (Walls, Pillars, Monument fins)
export const MAP_WALLS: WallObstacle[] = [
  // Outer Boundaries
  { id: 'boundary_top', x: 0, y: 0, width: MAP_WIDTH, height: 40 },
  { id: 'boundary_bottom', x: 0, y: MAP_HEIGHT - 40, width: MAP_WIDTH, height: 40 },
  { id: 'boundary_left', x: 0, y: 0, width: 40, height: MAP_HEIGHT },
  { id: 'boundary_right', x: MAP_WIDTH - 40, y: 0, width: 40, height: MAP_HEIGHT },

  // Center: Maqam El Chahid (Martyrs' Memorial) Core Architecture
  // 3 Iconic Soaring Palm Leaf Pillars (Stylized triangular/block structures)
  // Fin 1: North-West curved fin
  { id: 'maqam_fin_north', x: 1160, y: 640, width: 80, height: 120, isMonument: true, label: 'مقام الشهيد' },
  // Fin 2: South-West fin
  { id: 'maqam_fin_sw', x: 1040, y: 880, width: 110, height: 70, isMonument: true, label: 'مقام الشهيد' },
  // Fin 3: South-East fin
  { id: 'maqam_fin_se', x: 1250, y: 880, width: 110, height: 70, isMonument: true, label: 'مقام الشهيد' },
  // Center Flame Altar Podium (Circular cover ring modeled as rectangular blocks)
  { id: 'maqam_center_core', x: 1170, y: 770, width: 60, height: 60, isMonument: true, label: 'شعلة الشهيد' },

  // North Sector: Riadh El Feth Promenade
  { id: 'rf_col_1', x: 600, y: 220, width: 180, height: 35 },
  { id: 'rf_col_2', x: 900, y: 220, width: 180, height: 35 },
  { id: 'rf_col_3', x: 1320, y: 220, width: 180, height: 35 },
  { id: 'rf_col_4', x: 1620, y: 220, width: 180, height: 35 },
  { id: 'rf_wall_long', x: 800, y: 380, width: 800, height: 30 },

  // South Sector: Botanical Gardens (Jardin d'Essai) Stone Benches & Barriers
  { id: 'je_bench_1', x: 700, y: 1250, width: 220, height: 35 },
  { id: 'je_bench_2', x: 1050, y: 1250, width: 300, height: 35 },
  { id: 'je_bench_3', x: 1480, y: 1250, width: 220, height: 35 },
  { id: 'je_fountain_core', x: 1130, y: 1380, width: 140, height: 70 },

  // West Sector: Kasbah Stone Corridors
  { id: 'kasbah_alley_1', x: 260, y: 400, width: 35, height: 350 },
  { id: 'kasbah_alley_2', x: 420, y: 550, width: 180, height: 35 },
  { id: 'kasbah_alley_3', x: 420, y: 800, width: 35, height: 300 },
  { id: 'kasbah_door_wall', x: 260, y: 1000, width: 250, height: 35 },

  // East Sector: Port & Warehouse Shipping Enclosures
  { id: 'port_block_1', x: 1850, y: 450, width: 240, height: 80 },
  { id: 'port_block_2', x: 1850, y: 700, width: 240, height: 80 },
  { id: 'port_block_3', x: 1850, y: 950, width: 240, height: 80 },
  { id: 'port_crane_base', x: 2160, y: 750, width: 90, height: 160 },
];

// Team Base Spawns & Tactical Respawns
export const TEAM_SPAWNS: Record<TeamColor, SpawnPoint> = {
  red: { x: 220, y: 180, team: 'red' }, // Top-Left Red Base
  green: { x: 2180, y: 180, team: 'green' }, // Top-Right Green Base
  blue: { x: 220, y: 1420, team: 'blue' }, // Bottom-Left Blue Base
  yellow: { x: 2180, y: 1420, team: 'yellow' }, // Bottom-Right Yellow Base
};

export const NEUTRAL_SPAWNS: SpawnPoint[] = [
  { x: 750, y: 600 },
  { x: 1650, y: 600 },
  { x: 750, y: 1000 },
  { x: 1650, y: 1000 },
  { x: 1200, y: 480 },
  { x: 1200, y: 1120 },
];

// Initial Wooden Crates (Pushable & Destructible)
export const INITIAL_CRATES: Omit<CrateEntity, 'vx' | 'vy' | 'broken'>[] = [
  // Center monument cover crates
  { id: 'crate_c1', x: 1080, y: 720, width: 50, height: 50, hp: 4, maxHp: 4 },
  { id: 'crate_c2', x: 1270, y: 720, width: 50, height: 50, hp: 4, maxHp: 4 },
  { id: 'crate_c3', x: 1120, y: 880, width: 50, height: 50, hp: 4, maxHp: 4 },
  { id: 'crate_c4', x: 1230, y: 880, width: 50, height: 50, hp: 4, maxHp: 4 },

  // Kasbah crates
  { id: 'crate_k1', x: 340, y: 480, width: 48, height: 48, hp: 3, maxHp: 3 },
  { id: 'crate_k2', x: 340, y: 535, width: 48, height: 48, hp: 3, maxHp: 3 },
  { id: 'crate_k3', x: 480, y: 920, width: 48, height: 48, hp: 3, maxHp: 3 },

  // Port crates cluster
  { id: 'crate_p1', x: 1750, y: 520, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_p2', x: 1750, y: 580, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_p3', x: 1750, y: 770, width: 55, height: 55, hp: 4, maxHp: 4 },
  { id: 'crate_p4', x: 1750, y: 830, width: 55, height: 55, hp: 4, maxHp: 4 },

  // Promenade & Gardens cover
  { id: 'crate_g1', x: 860, y: 1140, width: 50, height: 50, hp: 3, maxHp: 3 },
  { id: 'crate_g2', x: 1540, y: 1140, width: 50, height: 50, hp: 3, maxHp: 3 },
  { id: 'crate_m1', x: 920, y: 440, width: 48, height: 48, hp: 3, maxHp: 3 },
  { id: 'crate_m2', x: 1480, y: 440, width: 48, height: 48, hp: 3, maxHp: 3 },
];
