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
import { MAP_WIDTH, MAP_HEIGHT, MAP_WALLS, TEAM_SPAWNS, NEUTRAL_SPAWNS, INITIAL_CRATES, WallObstacle } from './mapData';
import { CHARACTERS } from '../i18n/translations';
import { audioService } from '../services/audioService';

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

  // Weapon fire rate cooldown trackers
  private weaponCooldowns: Map<string, number> = new Map();
  private grenadeCooldowns: Map<string, number> = new Map();

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
    this.resetCrates();
    this.players.clear();

    lobbyPlayers.forEach((lp, idx) => {
      const spawn = this.getSafeSpawn(lp.team);
      const charMeta = CHARACTERS.find((c) => c.id === lp.characterId) || CHARACTERS[0];
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
        number: idx + 1,
      };
      this.players.set(lp.id, playerState);
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
    const speed = charMeta.speed;

    // Normalize diagonal movement
    let moveX = input.moveX;
    let moveY = input.moveY;
    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    player.vx = moveX * speed;
    player.vy = moveY * speed;
    player.aimAngle = input.aimAngle;
    player.weapon = input.weapon;

    // Jump trigger
    if (input.isJumping && !player.isJumping) {
      player.isJumping = true;
      player.jumpHeight = 1;
    }

    // Weapons firing
    const now = Date.now();
    if (input.isFiring) {
      const lastFire = this.weaponCooldowns.get(player.id) || 0;
      const cooldown = player.weapon === 'shotgun' ? 700 : 160;

      if (now - lastFire >= cooldown) {
        this.weaponCooldowns.set(player.id, now);
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
    const muzzleOffset = 24;
    const startX = player.x + Math.cos(player.aimAngle) * muzzleOffset;
    const startY = player.y + Math.sin(player.aimAngle) * muzzleOffset;

    if (player.weapon === 'shotgun') {
      audioService.playShotgun();
      // 5 pellets spread in cone
      const pellets = 5;
      const spreadAngle = 0.36; // ~20 degrees total
      for (let i = 0; i < pellets; i++) {
        const offset = (i / (pellets - 1) - 0.5) * spreadAngle + (Math.random() - 0.5) * 0.05;
        const angle = player.aimAngle + offset;
        const speed = 720 + Math.random() * 80;

        this.projectiles.push({
          id: `proj_${Date.now()}_${Math.random()}`,
          ownerId: player.id,
          ownerTeam: player.team,
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3.5,
          damage: 15,
          weapon: 'shotgun',
          life: 0.35, // short lifespan for shotgun
        });
      }
    } else {
      // Assault Rifle
      audioService.playRifle();
      const spread = (Math.random() - 0.5) * 0.08;
      const angle = player.aimAngle + spread;
      const speed = 880;

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        ownerId: player.id,
        ownerTeam: player.team,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3,
        damage: 13,
        weapon: 'rifle',
        life: 0.9,
      });
    }
  }

  private spawnGrenade(player: GamePlayerState, power: number) {
    audioService.playGrenadeThrow();
    const clampedPower = Math.max(0.3, Math.min(1.0, power));
    const speed = 250 + clampedPower * 420;
    const startX = player.x + Math.cos(player.aimAngle) * 20;
    const startY = player.y + Math.sin(player.aimAngle) * 20;

    this.grenades.push({
      id: `grenade_${Date.now()}_${Math.random()}`,
      ownerId: player.id,
      ownerTeam: player.team,
      x: startX,
      y: startY,
      vx: Math.cos(player.aimAngle) * speed,
      vy: Math.sin(player.aimAngle) * speed,
      fuseTime: 1.8,
      radius: 6,
      maxDistance: speed * 1.8,
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

    // 1. Update Players
    this.players.forEach((player) => {
      if (!player.isAlive) {
        player.respawnTimeRemaining -= dt;
        if (player.respawnTimeRemaining <= 0) {
          this.respawnPlayer(player);
        }
        return;
      }

      // Jump Physics
      if (player.isJumping) {
        player.jumpHeight += 180 * dt;
        if (player.jumpHeight > 24) {
          player.jumpHeight = 0;
          player.isJumping = false;
        }
      }

      // Movement & Wall Collision
      const nextX = player.x + player.vx * dt;
      const nextY = player.y + player.vy * dt;
      const playerRadius = 18;

      // X-axis check
      if (!this.checkWallCollision(nextX, player.y, playerRadius)) {
        player.x = Math.max(playerRadius + 40, Math.min(MAP_WIDTH - playerRadius - 40, nextX));
      }
      // Y-axis check
      if (!this.checkWallCollision(player.x, nextY, playerRadius)) {
        player.y = Math.max(playerRadius + 40, Math.min(MAP_HEIGHT - playerRadius - 40, nextY));
      }

      // Push Crates
      this.crates.forEach((crate) => {
        if (crate.broken) return;
        const dx = player.x - (crate.x + crate.width / 2);
        const dy = player.y - (crate.y + crate.height / 2);
        const dist = Math.hypot(dx, dy);
        const minDistance = playerRadius + crate.width / 2;

        if (dist < minDistance && dist > 0.001) {
          // Push crate lightly
          const pushAngle = Math.atan2(dy, dx) + Math.PI;
          crate.vx += Math.cos(pushAngle) * 70;
          crate.vy += Math.sin(pushAngle) * 70;
        }
      });
    });

    // 2. Update Crates Movement & Friction
    this.crates.forEach((crate) => {
      if (crate.broken) return;
      crate.x += crate.vx * dt;
      crate.y += crate.vy * dt;
      // Friction
      crate.vx *= 0.88;
      crate.vy *= 0.88;

      // Clamp within map bounds
      crate.x = Math.max(50, Math.min(MAP_WIDTH - crate.width - 50, crate.x));
      crate.y = Math.max(50, Math.min(MAP_HEIGHT - crate.height - 50, crate.y));
    });

    // 3. Update Projectiles
    this.projectiles = this.projectiles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Check boundary & wall hits
      if (this.checkWallCollision(p.x, p.y, p.radius)) {
        return false;
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
          if (crate.hp <= 0) {
            crate.broken = true;
            this.spawnExplosion(crate.x + crate.width / 2, crate.y + crate.height / 2, 40, '#d97706');
          }
          return false;
        }
      }

      // Check player hits
      for (const player of this.players.values()) {
        if (!player.isAlive || player.id === p.ownerId) continue;

        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist < 18 + p.radius) {
          // Hit detected! Friendly fire logic
          const isFriendly = player.team === p.ownerTeam;
          const finalDamage = isFriendly ? Math.round(p.damage * 0.5) : p.damage;

          this.damagePlayer(player, finalDamage, p.ownerId, p.weapon);
          return false;
        }
      }

      return true;
    });

    // 4. Update Grenades
    this.grenades = this.grenades.filter((g) => {
      g.fuseTime -= dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      // Rolling friction
      g.vx *= 0.94;
      g.vy *= 0.94;

      // Bounce off walls
      if (this.checkWallCollision(g.x, g.y, g.radius)) {
        g.vx = -g.vx * 0.6;
        g.vy = -g.vy * 0.6;
      }

      if (g.fuseTime <= 0) {
        this.detonateGrenade(g);
        return false;
      }
      return true;
    });

    // 5. Update Explosions
    this.explosions = this.explosions.filter((exp) => {
      exp.radius += (exp.maxRadius - exp.radius) * (dt * 12);
      exp.alpha -= dt * 2.2;
      return exp.alpha > 0.05;
    });
  }

  private detonateGrenade(g: GrenadeEntity) {
    audioService.playExplosion();
    const blastRadius = 160;
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
          this.spawnExplosion(crateCenterX, crateCenterY, 45, '#d97706');
        }
      }
    });

    // Damage players in blast
    this.players.forEach((player) => {
      if (!player.isAlive) return;
      const dist = Math.hypot(player.x - g.x, player.y - g.y);
      if (dist < blastRadius) {
        const falloff = 1 - dist / blastRadius;
        let baseDamage = Math.round(85 * falloff);
        if (player.team === g.ownerTeam && player.id !== g.ownerId) {
          baseDamage = Math.round(baseDamage * 0.5); // friendly fire reduction
        }
        this.damagePlayer(player, baseDamage, g.ownerId, 'grenade');
      }
    });
  }

  private damagePlayer(victim: GamePlayerState, damage: number, attackerId: string, weapon: WeaponType | 'grenade') {
    victim.hp -= damage;
    audioService.playPlayerHit();

    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.isAlive = false;
      victim.deaths += 1;
      victim.respawnTimeRemaining = 2.5;

      audioService.playDeath();
      this.spawnExplosion(victim.x, victim.y, 50, '#94a3b8');

      // Trigger Algerian Darija character voice line occasionally
      audioService.triggerRandomCharacterVoice();

      const attacker = this.players.get(attackerId);
      if (attacker) {
        if (attacker.team === victim.team && attacker.id !== victim.id) {
          // Team kill penalty
          attacker.score = Math.max(0, attacker.score - 50);
          this.teamScores[attacker.team] = Math.max(0, this.teamScores[attacker.team] - 50);
        } else {
          // Enemy kill reward
          attacker.kills += 1;
          attacker.score += 100;
          this.teamScores[attacker.team] += 100;
        }

        // Add to kill feed
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

    audioService.playRespawn();
    this.spawnExplosion(spawn.x, spawn.y, 40, '#10b981');
  }

  private getSafeSpawn(team: TeamColor): { x: number; y: number } {
    const baseSpawn = TEAM_SPAWNS[team];
    const candidateSpawns = [baseSpawn, ...NEUTRAL_SPAWNS];

    // Pick spawn with largest distance from active enemies
    let bestSpawn = baseSpawn;
    let maxMinDist = -1;

    for (const s of candidateSpawns) {
      // Verify not inside a wall or crate
      if (this.checkWallCollision(s.x, s.y, 20)) continue;

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
      x: bestSpawn.x + (Math.random() * 40 - 20),
      y: bestSpawn.y + (Math.random() * 40 - 20),
    };
  }

  private checkWallCollision(x: number, y: number, radius: number): boolean {
    // Map bounds
    if (x - radius < 40 || x + radius > MAP_WIDTH - 40 || y - radius < 40 || y + radius > MAP_HEIGHT - 40) {
      return true;
    }

    // Static walls
    for (const wall of MAP_WALLS) {
      // Find closest point on rectangle to circle center
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const distanceX = x - closestX;
      const distanceY = y - closestY;
      const distanceSquared = distanceX * distanceX + distanceY * distanceY;

      if (distanceSquared < radius * radius) {
        return true;
      }
    }

    return false;
  }

  private spawnExplosion(x: number, y: number, maxRadius: number, color: string) {
    this.explosions.push({
      id: `exp_${Date.now()}_${Math.random()}`,
      x,
      y,
      radius: 5,
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
