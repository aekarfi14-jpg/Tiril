import {
  TeamColor,
  WeaponType,
  PlayerInput,
  GamePlayerState,
  CrateEntity,
  ProjectileEntity,
  GrenadeEntity,
  ExplosionEntity,
  KillFeedItem,
  GameStateBroadcast,
  Player,
} from '../types';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  MAP_PLATFORMS,
  TEAM_SPAWNS,
  NEUTRAL_SPAWNS,
  INITIAL_CRATES,
  PlatformObstacle,
} from './mapData';
import { CHARACTERS } from '../i18n/translations';
import { audioService } from '../services/audioService';

const GRAVITY = 1380; // px/s²
const JUMP_IMPULSE = -680; // px/s
const PLAYER_HALF_WIDTH = 18;
const PLAYER_HALF_HEIGHT = 34;

export class GameEngine {
  private phase: 'lobby' | 'countdown' | 'playing' | 'ended' = 'lobby';
  private timeRemaining: number = 180;
  private durationSeconds: number = 180;
  private players: Map<string, GamePlayerState> = new Map();
  private crates: CrateEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private grenades: GrenadeEntity[] = [];
  private explosions: ExplosionEntity[] = [];
  private killFeed: KillFeedItem[] = [];
  private teamScores: Record<TeamColor, number> = {
    red: 0,
    green: 0,
    blue: 0,
    yellow: 0,
  };
  private winnerTeam: TeamColor | null = null;

  // Jump tracking
  private jumpCounts: Map<string, number> = new Map();
  // Weapon fire rate cooldown trackers
  private weaponCooldowns: Map<string, number> = new Map();
  private grenadeCooldowns: Map<string, number> = new Map();
  private shootAnimTimers: Map<string, number> = new Map();

  constructor() {
    this.resetCrates();
  }

  public resetCrates() {
    this.crates = INITIAL_CRATES.map((c) => ({
      ...c,
      vx: 0,
      vy: 0,
      broken: false,
    }));
  }

  public setDuration(seconds: number) {
    this.durationSeconds = seconds;
    this.timeRemaining = seconds;
  }

  public initMatch(lobbyPlayers: Player[]) {
    this.phase = 'playing';
    this.timeRemaining = this.durationSeconds;
    this.teamScores = { red: 0, green: 0, blue: 0, yellow: 0 };
    this.winnerTeam = null;
    this.projectiles = [];
    this.grenades = [];
    this.explosions = [];
    this.killFeed = [];
    this.jumpCounts.clear();
    this.weaponCooldowns.clear();
    this.grenadeCooldowns.clear();
    this.shootAnimTimers.clear();
    this.resetCrates();
    this.players.clear();

    lobbyPlayers.forEach((lp, idx) => {
      const spawn = this.getSafeSpawn(lp.team);
      const playerState: GamePlayerState = {
        id: lp.id,
        name: lp.name,
        team: lp.team,
        characterId: lp.characterId,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        aimAngle: 0,
        hp: 100,
        maxHp: 100,
        weapon: 'rifle',
        isAlive: true,
        respawnTimeRemaining: 0,
        kills: 0,
        deaths: 0,
        score: 0,
        isJumping: false,
        jumpHeight: 0,
        facingRight: true,
        isOnGround: true,
        walkCycle: 0,
        isShooting: false,
        number: idx + 1,
      };
      this.players.set(lp.id, playerState);
      this.jumpCounts.set(lp.id, 0);
    });

    audioService.playMatchStart();
  }

  public endMatch() {
    this.phase = 'ended';

    // Calculate winning team
    let maxScore = -1;
    let winning: TeamColor = 'red';
    for (const [team, score] of Object.entries(this.teamScores) as [TeamColor, number][]) {
      if (score > maxScore) {
        maxScore = score;
        winning = team;
      }
    }
    this.winnerTeam = winning;
    audioService.playMatchEnd();
  }

  public handlePlayerInput(input: PlayerInput) {
    if (this.phase !== 'playing') return;
    const player = this.players.get(input.playerId);
    if (!player || !player.isAlive) return;

    // Movement velocity based on character speed
    const charMeta = CHARACTERS.find((c) => c.id === player.characterId) || CHARACTERS[0];
    const speed = charMeta.speed * 1.35;

    // Horizontal movement in 2D platformer
    player.vx = input.moveX * speed;

    // Aim Angle & Facing Direction
    player.aimAngle = input.aimAngle;
    const cosAim = Math.cos(input.aimAngle);
    if (Math.abs(input.moveX) > 0.15) {
      player.facingRight = input.moveX > 0;
    } else if (Math.abs(cosAim) > 0.1) {
      player.facingRight = cosAim > 0;
    }

    player.weapon = input.weapon;

    // Jump Logic (Supports initial jump + 1 double jump)
    if (input.isJumping && !player.isJumping) {
      player.isJumping = true;
      const currentJumps = this.jumpCounts.get(player.id) || 0;

      if (player.isOnGround) {
        player.vy = JUMP_IMPULSE;
        player.isOnGround = false;
        this.jumpCounts.set(player.id, 1);
        audioService.playButtonClick();
      } else if (currentJumps < 2) {
        // Double jump in mid-air
        player.vy = JUMP_IMPULSE * 0.9;
        this.jumpCounts.set(player.id, 2);
        audioService.playButtonClick();
        this.spawnExplosion(player.x, player.y + PLAYER_HALF_HEIGHT, 20, '#38bdf8');
      }
    }

    // Weapons firing
    const now = Date.now();
    if (input.isFiring) {
      const lastFire = this.weaponCooldowns.get(player.id) || 0;
      const cooldown = player.weapon === 'shotgun' ? 680 : 150;

      if (now - lastFire >= cooldown) {
        this.weaponCooldowns.set(player.id, now);
        this.shootAnimTimers.set(player.id, now + 120);
        player.isShooting = true;
        this.spawnWeaponFire(player);
      }
    }

    // Grenade throw
    if (input.isThrowingGrenade) {
      const lastGrenade = this.grenadeCooldowns.get(player.id) || 0;
      if (now - lastGrenade >= 2000) {
        this.grenadeCooldowns.set(player.id, now);
        this.spawnGrenade(player, input.grenadePower);
      }
    }
  }

  private spawnWeaponFire(player: GamePlayerState) {
    // Shoulder position
    const shoulderY = player.y - 12;
    const barrelLen = 32;
    const startX = player.x + Math.cos(player.aimAngle) * barrelLen;
    const startY = shoulderY + Math.sin(player.aimAngle) * barrelLen;

    if (player.weapon === 'shotgun') {
      audioService.playShotgun();
      const pellets = 5;
      const spreadAngle = 0.35;
      for (let i = 0; i < pellets; i++) {
        const offset = (i / (pellets - 1) - 0.5) * spreadAngle + (Math.random() - 0.5) * 0.06;
        const angle = player.aimAngle + offset;
        const speed = 920 + Math.random() * 120;

        this.projectiles.push({
          id: `proj_${Date.now()}_${Math.random()}`,
          ownerId: player.id,
          ownerTeam: player.team,
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 4,
          damage: 16,
          weapon: 'shotgun',
          life: 0.45,
        });
      }
    } else {
      // Assault Rifle
      audioService.playRifle();
      const spread = (Math.random() - 0.5) * 0.06;
      const angle = player.aimAngle + spread;
      const speed = 1100;

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        ownerId: player.id,
        ownerTeam: player.team,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5,
        damage: 14,
        weapon: 'rifle',
        life: 1.1,
      });
    }
  }

  private spawnGrenade(player: GamePlayerState, power: number) {
    audioService.playGrenadeThrow();
    const clampedPower = Math.max(0.3, Math.min(1.0, power));
    const speed = 320 + clampedPower * 560;
    const shoulderY = player.y - 12;
    const startX = player.x + Math.cos(player.aimAngle) * 24;
    const startY = shoulderY + Math.sin(player.aimAngle) * 24;

    this.grenades.push({
      id: `grenade_${Date.now()}_${Math.random()}`,
      ownerId: player.id,
      ownerTeam: player.team,
      x: startX,
      y: startY,
      vx: Math.cos(player.aimAngle) * speed,
      vy: Math.sin(player.aimAngle) * speed - 160, // slight upward arc
      fuseTime: 2.0,
      radius: 7,
      maxDistance: speed * 2.0,
    });
  }

  public update(dt: number) {
    if (this.phase !== 'playing') return;

    // Timer Countdown
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endMatch();
      return;
    }

    const now = Date.now();

    // 1. Update Players with Gravity & Platform Collisions
    this.players.forEach((player) => {
      if (!player.isAlive) {
        player.respawnTimeRemaining -= dt;
        if (player.respawnTimeRemaining <= 0) {
          this.respawnPlayer(player);
        }
        return;
      }

      // Check shoot animation expire
      const shootTimer = this.shootAnimTimers.get(player.id) || 0;
      player.isShooting = now < shootTimer;

      // Apply Gravity
      player.vy += GRAVITY * dt;

      // Horizontal Walk Cycle
      if (Math.abs(player.vx) > 10) {
        player.walkCycle += Math.abs(player.vx) * dt * 0.05;
      } else {
        player.walkCycle = 0;
      }

      // Desired Next Position
      const prevY = player.y;
      const nextX = player.x + player.vx * dt;
      let nextY = player.y + player.vy * dt;

      // Check Horizontal Bounds & Solid Walls
      const clampedX = Math.max(
        60 + PLAYER_HALF_WIDTH,
        Math.min(MAP_WIDTH - 60 - PLAYER_HALF_WIDTH, nextX)
      );
      if (!this.checkSolidCollision(clampedX, player.y)) {
        player.x = clampedX;
      } else {
        player.vx = 0;
      }

      // Platform Collisions (Vertical)
      let landed = false;
      const feetY = nextY + PLAYER_HALF_HEIGHT;
      const prevFeetY = prevY + PLAYER_HALF_HEIGHT;

      // 1. Ground and Platforms
      for (const plat of MAP_PLATFORMS) {
        const left = plat.x;
        const right = plat.x + plat.width;
        const top = plat.y;
        const bottom = plat.y + plat.height;

        // Check horizontal overlap
        if (player.x + PLAYER_HALF_WIDTH > left && player.x - PLAYER_HALF_WIDTH < right) {
          if (plat.isJumpThrough) {
            // Can only land when falling down through top
            if (player.vy >= 0 && prevFeetY <= top + 10 && feetY >= top) {
              nextY = top - PLAYER_HALF_HEIGHT;
              player.vy = 0;
              landed = true;
              break;
            }
          } else {
            // Solid platform (floor/boundary)
            if (player.vy >= 0 && prevFeetY <= top + 14 && feetY >= top) {
              nextY = top - PLAYER_HALF_HEIGHT;
              player.vy = 0;
              landed = true;
              break;
            } else if (player.vy < 0 && player.y - PLAYER_HALF_HEIGHT <= bottom && prevY - PLAYER_HALF_HEIGHT >= bottom - 10) {
              // Hit ceiling
              nextY = bottom + PLAYER_HALF_HEIGHT;
              player.vy = 0;
              break;
            }
          }
        }
      }

      // 2. Stand on or Push Crates
      this.crates.forEach((crate) => {
        if (crate.broken) return;

        const crateLeft = crate.x;
        const crateRight = crate.x + crate.width;
        const crateTop = crate.y;
        const crateBottom = crate.y + crate.height;

        // Standing on top of crate
        if (player.x + PLAYER_HALF_WIDTH > crateLeft && player.x - PLAYER_HALF_WIDTH < crateRight) {
          if (player.vy >= 0 && prevFeetY <= crateTop + 14 && feetY >= crateTop) {
            nextY = crateTop - PLAYER_HALF_HEIGHT;
            player.vy = 0;
            landed = true;
          }
        }

        // Pushing crate sideways
        const playerTop = player.y - PLAYER_HALF_HEIGHT;
        const playerBottom = player.y + PLAYER_HALF_HEIGHT;
        if (playerBottom > crateTop + 10 && playerTop < crateBottom - 10) {
          const dx = player.x - (crate.x + crate.width / 2);
          if (Math.abs(dx) < PLAYER_HALF_WIDTH + crate.width / 2 + 4) {
            if (dx < 0 && player.vx > 0) {
              crate.vx = player.vx * 0.7;
            } else if (dx > 0 && player.vx < 0) {
              crate.vx = player.vx * 0.7;
            }
          }
        }
      });

      player.y = nextY;
      player.isOnGround = landed;
      if (landed) {
        this.jumpCounts.set(player.id, 0);
        player.isJumping = false;
      }
    });

    // 2. Update Crates Movement, Gravity & Platform Floor Collision
    this.crates.forEach((crate) => {
      if (crate.broken) return;

      crate.vy += GRAVITY * dt;
      crate.x += crate.vx * dt;
      crate.y += crate.vy * dt;

      // Friction
      crate.vx *= 0.88;

      // Floor / Platform collision for crate
      const crateBottom = crate.y + crate.height;
      for (const plat of MAP_PLATFORMS) {
        if (crate.x + crate.width > plat.x && crate.x < plat.x + plat.width) {
          if (crate.vy >= 0 && crateBottom >= plat.y && crateBottom - crate.vy * dt <= plat.y + 16) {
            crate.y = plat.y - crate.height;
            crate.vy = 0;
            break;
          }
        }
      }

      // Clamp within map bounds
      crate.x = Math.max(65, Math.min(MAP_WIDTH - crate.width - 65, crate.x));
    });

    // 3. Update Projectiles
    this.projectiles = this.projectiles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Check platform collision (only solid platforms block bullets)
      for (const plat of MAP_PLATFORMS) {
        if (!plat.isJumpThrough) {
          if (
            p.x >= plat.x &&
            p.x <= plat.x + plat.width &&
            p.y >= plat.y &&
            p.y <= plat.y + plat.height
          ) {
            this.spawnExplosion(p.x, p.y, 14, '#94a3b8');
            return false;
          }
        }
      }

      // Check crate hit
      for (const crate of this.crates) {
        if (crate.broken) continue;
        if (
          p.x >= crate.x &&
          p.x <= crate.x + crate.width &&
          p.y >= crate.y &&
          p.y <= crate.y + crate.height
        ) {
          crate.hp -= 1;
          audioService.playCrateHit();
          this.spawnExplosion(p.x, p.y, 18, '#d97706');
          if (crate.hp <= 0) {
            crate.broken = true;
            this.spawnExplosion(crate.x + crate.width / 2, crate.y + crate.height / 2, 50, '#d97706');
          }
          return false;
        }
      }

      // Check player hits (AABB capsule check)
      for (const player of this.players.values()) {
        if (!player.isAlive || player.id === p.ownerId) continue;

        const left = player.x - PLAYER_HALF_WIDTH;
        const right = player.x + PLAYER_HALF_WIDTH;
        const top = player.y - PLAYER_HALF_HEIGHT;
        const bottom = player.y + PLAYER_HALF_HEIGHT;

        if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) {
          const isFriendly = player.team === p.ownerTeam;
          const finalDamage = isFriendly ? Math.round(p.damage * 0.5) : p.damage;

          this.damagePlayer(player, finalDamage, p.ownerId, p.weapon);
          this.spawnExplosion(p.x, p.y, 16, '#ef4444');
          return false;
        }
      }

      return true;
    });

    // 4. Update Grenades with Gravity & Bouncing
    this.grenades = this.grenades.filter((g) => {
      g.fuseTime -= dt;
      g.vy += GRAVITY * 0.85 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;

      // Platform bounce
      for (const plat of MAP_PLATFORMS) {
        if (g.x + g.radius > plat.x && g.x - g.radius < plat.x + plat.width) {
          if (g.vy >= 0 && g.y + g.radius >= plat.y && g.y - g.vy * dt <= plat.y + 12) {
            g.y = plat.y - g.radius;
            g.vy = -g.vy * 0.55;
            g.vx *= 0.8;
            break;
          }
        }
      }

      // Boundary bounce
      if (g.x - g.radius < 65 || g.x + g.radius > MAP_WIDTH - 65) {
        g.vx = -g.vx * 0.6;
      }

      if (g.fuseTime <= 0) {
        this.detonateGrenade(g);
        return false;
      }
      return true;
    });

    // 5. Update Explosions
    this.explosions = this.explosions.filter((exp) => {
      exp.radius += (exp.maxRadius - exp.radius) * (dt * 14);
      exp.alpha -= dt * 2.5;
      return exp.alpha > 0.05;
    });
  }

  private detonateGrenade(g: GrenadeEntity) {
    audioService.playExplosion();
    const blastRadius = 180;
    this.spawnExplosion(g.x, g.y, blastRadius, '#ef4444');

    // Damage crates in blast
    this.crates.forEach((crate) => {
      if (crate.broken) return;
      const crateCenterX = crate.x + crate.width / 2;
      const crateCenterY = crate.y + crate.height / 2;
      const dist = Math.hypot(crateCenterX - g.x, crateCenterY - g.y);
      if (dist < blastRadius) {
        crate.hp -= 3;
        if (crate.hp <= 0) {
          crate.broken = true;
          this.spawnExplosion(crateCenterX, crateCenterY, 50, '#d97706');
        }
      }
    });

    // Damage players in blast
    this.players.forEach((player) => {
      if (!player.isAlive) return;
      const dist = Math.hypot(player.x - g.x, player.y - g.y);
      if (dist < blastRadius) {
        const falloff = 1 - dist / blastRadius;
        let baseDamage = Math.round(90 * falloff);
        if (player.team === g.ownerTeam && player.id !== g.ownerId) {
          baseDamage = Math.round(baseDamage * 0.5);
        }
        // Blast knockback in side-view
        const angle = Math.atan2(player.y - g.y, player.x - g.x);
        player.vx += Math.cos(angle) * 550 * falloff;
        player.vy = -380 * falloff;
        player.isOnGround = false;

        this.damagePlayer(player, baseDamage, g.ownerId, 'grenade');
      }
    });
  }

  private damagePlayer(
    victim: GamePlayerState,
    damage: number,
    attackerId: string,
    weapon: WeaponType | 'grenade'
  ) {
    victim.hp -= damage;
    audioService.playPlayerHit();

    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.isAlive = false;
      victim.deaths += 1;
      victim.respawnTimeRemaining = 2.5;

      audioService.playDeath();
      this.spawnExplosion(victim.x, victim.y, 60, '#94a3b8');

      audioService.triggerRandomCharacterVoice();

      const attacker = this.players.get(attackerId);
      if (attacker) {
        if (attacker.team === victim.team && attacker.id !== victim.id) {
          attacker.score = Math.max(0, attacker.score - 50);
          this.teamScores[attacker.team] = Math.max(0, this.teamScores[attacker.team] - 50);
        } else {
          attacker.kills += 1;
          attacker.score += 100;
          this.teamScores[attacker.team] += 100;
        }

        this.killFeed = [
          {
            id: `kf_${Date.now()}_${Math.random()}`,
            killerName: attacker.name,
            killerTeam: attacker.team,
            victimName: victim.name,
            victimTeam: victim.team,
            weapon,
            timestamp: Date.now(),
          },
          ...this.killFeed.slice(0, 7),
        ];
      }
    }
  }

  private respawnPlayer(player: GamePlayerState) {
    const spawn = this.getSafeSpawn(player.team);
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp;
    player.isAlive = true;
    player.respawnTimeRemaining = 0;
    player.isOnGround = true;

    audioService.playRespawn();
    this.spawnExplosion(spawn.x, spawn.y, 45, '#10b981');
  }

  private getSafeSpawn(team: TeamColor): { x: number; y: number } {
    const baseSpawn = TEAM_SPAWNS[team];
    const candidateSpawns = [baseSpawn, ...NEUTRAL_SPAWNS];

    let bestSpawn = baseSpawn;
    let maxMinDist = -1;

    for (const s of candidateSpawns) {
      let minDistToEnemy = Infinity;
      this.players.forEach((p) => {
        if (p.isAlive && p.team !== team) {
          const d = Math.hypot(p.x - s.x, p.y - s.y);
          if (d < minDistToEnemy) minDistToEnemy = d;
        }
      });

      if (minDistToEnemy > maxMinDist) {
        maxMinDist = minDistToEnemy;
        bestSpawn = s;
      }
    }

    return {
      x: bestSpawn.x,
      y: bestSpawn.y,
    };
  }

  private checkSolidCollision(x: number, y: number): boolean {
    for (const plat of MAP_PLATFORMS) {
      if (!plat.isJumpThrough) {
        if (
          x + PLAYER_HALF_WIDTH > plat.x &&
          x - PLAYER_HALF_WIDTH < plat.x + plat.width &&
          y + PLAYER_HALF_HEIGHT > plat.y &&
          y - PLAYER_HALF_HEIGHT < plat.y + plat.height
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private spawnExplosion(x: number, y: number, maxRadius: number, color: string) {
    this.explosions.push({
      id: `exp_${Date.now()}_${Math.random()}`,
      x,
      y,
      radius: 6,
      maxRadius,
      alpha: 1.0,
      color,
    });
  }

  public getBroadcastState(): GameStateBroadcast {
    return {
      timestamp: Date.now(),
      phase: this.phase,
      timeRemaining: Math.ceil(this.timeRemaining),
      durationSeconds: this.durationSeconds,
      players: Array.from(this.players.values()),
      crates: this.crates,
      projectiles: this.projectiles,
      grenades: this.grenades,
      explosions: this.explosions,
      teamScores: { ...this.teamScores },
      winnerTeam: this.winnerTeam,
      killFeed: [...this.killFeed],
    };
  }
}
