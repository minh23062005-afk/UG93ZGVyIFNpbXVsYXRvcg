// Powder Simulation BETA 1.4.0🐜🙌
let cellSize = 4;
let cols, rows;
let grid = [];
let processed = [];

let gravity = 0.15;
let maxFallSpeed = 1.89;

let spawnDelay = 3;
let spawnTimer = 0;

let impactThreshold = 5;
let maxStackHeight = 20;

let mode = "SAND (Press E to switch modes)";
let brushSize = 3;
let energyMode = "NONE";

let wetSpreadRadius = 20;
let wetSpreadRate = 0.02;
let wetDecay = 0.002;

let maxLavaFallSpeed = 1.0;
let glassDecayTime = 600;
let steamRockSpreadLimit = 4;
let glassSpreadRate = 0.015;
let glassDecay = 0.003;
let lavaCoolTime = 1800;
let solidHeatGainFromLava = 0.06;
let rockHeatGainMultiplier = 0.55;
let solidHeatDecay = 0.002;
let solidHeatSpread = 0.12;
let boilHeatThreshold = 0.7;
let glassHeatThreshold = 0.5;
let sandToGlassHeatThreshold = 0.42;
let rockMeltThreshold = 0.985;
let basaltMeltThreshold = 0.99;
let rockMeltTime = 60 * 60;
let basaltMeltTime = 80 * 60;
let rockMeltHeatThreshold = 0.9;
let basaltMeltHeatThreshold = 0.95;
let glassMeltHeatThreshold = 0.88;
let glassMeltTime = 45 * 60;
let glassMeltCooldown = 3;
let meltTimerCooldown = 2;
let basaltHeatDecayMultiplier = 0.22;
let coldSpreadRate = 0.45;
let iceMeltTime = 18;
let smokeParticles = [];
let maxSmokeParticles = 800;
let acidEvaporateTime = 11;
let acidHeatThreshold = 0.6;
let grassBurnTime = 60;
let dustDissolveTime = 60;
let dustHeatDissolveThreshold = 0.6;
let timeStopped = false;
let waterHeatGain = 0.04;
let waterHeatDecay = 0.004;
let waterBoilThreshold = 0.6;
let waterRunnyHeatThreshold = 0.45;
let waterRunnyChance = 0.18;
let acidDissolveTime = 120;
let acidDamageRecoverTime = 120;
let acidTransferRate = 0.05;
let acidWaterToAcidThreshold = 4.0;
let acidTintR = 130;
let acidTintG = 205;
let acidTintB = 130;
let acidLavaDissolveTime = 18;
let acidWaterAbsorbChance = 0.08;
let acidWaterAbsorbChanceAcidOnWater = 0.05;
let acidDilutionRate = 1.0;
let acidDilutionMax = 6.0;
let acidDiluteTintR = 115;
let acidDiluteTintG = 220;
let acidDiluteTintB = 205;
let waterAcidSplashChance = 0.9;
let waterAcidSplashExtraDropsChance = 0.55;
let acidWaterSpreadRate = 0.03;
let acidDilutionSpreadRate = 0.06;
let lavaBaseTemp = 1200;
let lavaMaxTemp = 2500;
let lavaSuperHotTemp = 2000;
let lavaNeighborHeatTransfer = 0.9;
let lavaSuperHotBasaltMultiplier = 4;
let lavaPassiveCoolRate = 0.12;
let lavaSuperHotCoolRate = 0.025;
let lavaWaterContactCoolRate = 0.2;
let energyHeatGain = 0.55;
let energySolidHeatGain = 0.75;
let energySandToGlassSeconds = 1;
let energyGlassMeltSeconds = 5;
let energyWaterEvapSeconds = 2;
let energyRockMeltSeconds = 30;
let energyBasaltMeltSeconds = 35;
let energyLavaTempGain = 18;
let energyLavaCoolTimerDrop = 6;
let coldEnergyStep = 0.01;

//holy shit this is a lot of variables

function setup() {
  const canvas = createCanvas(1000, 1000);
  noSmooth();
  const canvasWrap = document.getElementById("canvasWrap");
  if (canvasWrap) canvas.parent(canvasWrap);
  document.oncontextmenu = () => false;
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearGrid);

  cols = floor(width / cellSize);
  rows = floor(height / cellSize);

  for (let x = 0; x < cols; x++) {
    grid[x] = [];
    processed[x] = [];
    for (let y = 0; y < rows; y++) {
      grid[x][y] = null;
      processed[x][y] = false;
    }
  }
}

function clearGrid() {
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      grid[x][y] = null;
      processed[x][y] = false;
    }
  }
  smokeParticles = [];
}

function keyPressed() {
  if (key === 'e' || key === 'E') {
    if (mode === "SAND" || mode === "SAND (Press E to switch modes)") mode = "WATER";
    else if (mode === "WATER") mode = "ACID";
    else if (mode === "ACID") mode = "LAVA";
    else if (mode === "LAVA") mode = "GRASS";
    else if (mode === "GRASS") mode = "DUST";
    else if (mode === "DUST") mode = "ROCK";
    else if (mode === "ROCK") mode = "ERASER";
    else if (mode === "ERASER") mode = "NONE";
    else mode = "SAND";
  }
  if (key === 'p' || key === 'P') {
    if (energyMode === "NONE") energyMode = "HEAT";
    else if (energyMode === "HEAT") energyMode = "COLD";
    else energyMode = "NONE";
  }
  if (key === ' ') {
    timeStopped = !timeStopped;
  }
}

function mouseWheel(e) {
  brushSize = constrain(brushSize + (e.delta > 0 ? -1 : 1), 1, 12);
}

function countStackBelow(x, y) {
  let count = 0;
  for (let i = y + 1; i < rows; i++) {
    if (grid[x][i] && grid[x][i].type === "sand") count++;
    else break;
  }
  return count;
}

function spawnSmoke(x, y) {
  if (smokeParticles.length >= maxSmokeParticles) {
    smokeParticles.shift();
  }
  smokeParticles.push({
    x: x * cellSize + cellSize / 2,
    y: y * cellSize + cellSize / 2,
    vy: random(0.2, 0.5),
    life: random(180, 300),
    lifeMax: 300,
    r: 200,
    g: 200,
    b: 200
  });
}

function spawnToxicSmoke(x, y) {
  if (smokeParticles.length >= maxSmokeParticles) {
    smokeParticles.shift();
  }
  smokeParticles.push({
    x: x * cellSize + cellSize / 2,
    y: y * cellSize + cellSize / 2,
    vy: random(0.12, 0.3),
    life: random(360, 520),
    lifeMax: 520,
    r: random(45, 70),
    g: random(45, 70),
    b: random(45, 70)
  });
}

function heatGlowLevel(heat, curve = 1.8) {
  return pow(constrain(heat || 0, 0, 1), curve);
}

function acidDarkenFactor(cell) {
  if (!cell || cell.acidDamage === undefined) return 1;
  let t = constrain((cell.acidDamage || 0) / max(1, acidDissolveTime), 0, 1);
  return lerp(1, 0.35, t);
}

function acidDissolveRate(type) {
  if (type === "basalt") return 0.4;
  if (type === "rock") return 0.6;
  if (type === "glass") return 0.75;
  return 1.0;
}

function lavaTemperature(cell) {
  if (cell.temp !== undefined) return constrain(cell.temp, lavaBaseTemp, lavaMaxTemp);
  let ageHeat = constrain((cell.heatAge || 0) / 900, 0, 1);
  let cooling = constrain((cell.coolTimer || 0) / max(1, lavaCoolTime), 0, 1);
  let temp = lavaBaseTemp + ageHeat * (lavaMaxTemp - lavaBaseTemp);
  temp -= cooling * 250;
  return constrain(temp, lavaBaseTemp, lavaMaxTemp);
}

function energyTicks(seconds) {
  return max(1, ceil((seconds * 60) / max(1, spawnDelay)));
}

function applyEnergyAt(x, y) {
  let cell = grid[x][y];
  if (!cell) return;
  if (cell.type === "acid") {
    if (energyMode === "HEAT") cell.energyHeatTick = frameCount;
    if (energyMode === "COLD") {
      grid[x][y] = { type: "ice", r: random(140, 170), g: random(180, 210), b: random(220, 255), heat: 0, meltTimer: 0 };
    }
    return;
  }

  if (energyMode === "HEAT") {
    let sandToGlassTicks = energyTicks(energySandToGlassSeconds);
    let glassMeltTicks = energyTicks(energyGlassMeltSeconds);
    let waterEvapTicks = energyTicks(energyWaterEvapSeconds);
    let rockMeltTicks = energyTicks(energyRockMeltSeconds);
    let basaltMeltTicks = energyTicks(energyBasaltMeltSeconds);

    if (cell.type === "lava") {
      cell.temp = lavaTemperature(cell);
      cell.temp = min(lavaMaxTemp, cell.temp + energyLavaTempGain);
      cell.heatAge = (cell.heatAge || 0) + 2;
      cell.coolTimer = max(0, (cell.coolTimer || 0) - energyLavaCoolTimerDrop);
      return;
    }

    if (cell.type !== "water" && cell.type !== "lava") {
      cell.heat = min(1, (cell.heat || 0) + energyHeatGain);
    }
    if (cell.type === "sand") {
      cell.energyTimer = (cell.energyTimer || 0) + 1;
      if (cell.energyTimer % 4 === 0) spawnSmoke(x, y);
      if (cell.energyTimer >= sandToGlassTicks) {
        spawnSmoke(x, y);
        grid[x][y] = {
          type: "glass",
          decayTimer: 0,
          glassiness: min(1, max(0.75, cell.heat || 0)),
          heat: min(1, max(0.7, cell.heat || 0))
        };
      }
      return;
    }
    if (cell.type === "grass") {
      cell.heatAge = (cell.heatAge || 0) + 1;
      if (cell.heatAge % 6 === 0) spawnSmoke(x, y);
      if (cell.heatAge >= 30) {
        grid[x][y] = { type: "dust", r: random(110, 140), g: random(110, 140), b: random(110, 140), vy: 0 };
      }
      return;
    }
    if (cell.type === "dust") {
      cell.heatAge = (cell.heatAge || 0) + 1;
      if (cell.heatAge % 6 === 0) spawnSmoke(x, y);
      if (cell.heatAge >= 30) {
        grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
      }
      return;
    }

    if (cell.type === "rock" || cell.type === "basalt" || cell.type === "glass" || cell.type === "ice") {
      cell.heat = min(1, (cell.heat || 0) + energySolidHeatGain);

      if (cell.type === "rock" || cell.type === "basalt") {
        cell.energyTimer = (cell.energyTimer || 0) + 1;
        if (cell.energyTimer % 20 === 0) spawnSmoke(x, y);
        let meltTicks = cell.type === "rock" ? rockMeltTicks : basaltMeltTicks;
        if (cell.energyTimer >= meltTicks) {
          grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
        }
        return;
      }

      if (cell.type === "glass") {
        cell.energyTimer = (cell.energyTimer || 0) + 1;
        if (cell.energyTimer % 8 === 0) spawnSmoke(x, y);
        if (cell.energyTimer >= glassMeltTicks) {
          spawnSmoke(x, y);
          grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
        }
        return;
      }
      return;
    }
    if (cell.type === "water") {
      cell.heat = min(1, (cell.heat || 0) + energyHeatGain);
      cell.energyTimer = (cell.energyTimer || 0) + 1;
      if (cell.energyTimer % 6 === 0) spawnSmoke(x, y);
      if (cell.energyTimer >= waterEvapTicks) {
        spawnSmoke(x, y);
        grid[x][y] = null;
      }
      return;
    }
  } else if (energyMode === "COLD") {
    if (cell.type === "ice") return;
    if (cell.type === "lava") {
      cell.temp = lavaTemperature(cell);
      let lavaColdStep = cell.temp >= lavaSuperHotTemp ? 0.25 : 1.0;
      cell.temp = max(lavaBaseTemp, cell.temp - lavaColdStep);
      cell.heatAge = max(0, (cell.heatAge || 0) - 1);
      return;
    }
    if (cell.heat === undefined) cell.heat = 0.5;
    cell.heat = max(0, cell.heat - coldEnergyStep);
    if (cell.heat <= 0.05) {
      grid[x][y] = { type: "ice", r: random(140, 170), g: random(180, 210), b: random(220, 255), heat: 0, meltTimer: 0 };
    }
  }
}

function draw() {
  background(220);

  let cx = floor(mouseX / cellSize);
  let cy = floor(mouseY / cellSize);

  if (mouseIsPressed) {
    let energyBrushActive = mode === "NONE" && energyMode !== "NONE";
    if (!energyBrushActive) spawnTimer++;

    if (energyBrushActive || spawnTimer >= spawnDelay) {
      if (!energyBrushActive) spawnTimer = 0;

      for (let dx = -brushSize; dx <= brushSize; dx++) {
        for (let dy = -brushSize; dy <= brushSize; dy++) {
          let x = cx + dx;
          let y = cy + dy;
          if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

          if (mode === "ERASER") {
            grid[x][y] = null;
            continue;
          }
          if (mode === "NONE") {
            applyEnergyAt(x, y);
            continue;
          }

          if (grid[x][y] !== null) continue;

          if (mode === "SAND" || mode === "SAND (Press E to switch modes)") {
            grid[x][y] = {
              type: "sand",
              r: random(210, 235),
              g: random(180, 205),
              b: random(120, 150),
              vy: 0,
              fall: 0,
              wetness: 0
            };
          }

          if (mode === "WATER") {
            grid[x][y] = {
              type: "water",
              r: random(0, 30),
              g: random(80, 120),
              b: random(200, 255),
              heat: 0,
              acidLevel: 0
            };
          }

          if (mode === "ACID") {
            grid[x][y] = {
              type: "acid",
              r: random(120, 170),
              g: random(190, 230),
              b: random(120, 170),
              dilution: 0,
              diluteVar: random(-10, 10)
            };
          }

          if (mode === "ROCK") {
            grid[x][y] = {
              type: "rock",
              r: random(90, 120),
              g: random(90, 120),
              b: random(90, 120)
            };
          }

          if (mode === "LAVA") {
            grid[x][y] = {
              type: "lava",
              moveTimer: 0,
              meltTimer: 0,
              vy: 0,
              heatAge: 0,
              coolTimer: 0
            };
          }

          if (mode === "GRASS") {
            grid[x][y] = {
              type: "grass",
              r: random(40, 70),
              g: random(140, 190),
              b: random(40, 70),
              burning: false,
              burnTimer: 0
            };
          }

          if (mode === "DUST") {
            grid[x][y] = {
              type: "dust",
              r: random(110, 140),
              g: random(110, 140),
              b: random(110, 140),
              vy: 0,
              dissolveTimer: 0
            };
          }
        }
      }
    }
  } else {
    spawnTimer = spawnDelay;
  }

  if (!timeStopped) {
    for (let px = 0; px < cols; px++) {
      for (let py = 0; py < rows; py++) processed[px][py] = false;
    }

    for (let y = rows - 2; y >= 0; y--) {
      let scanLeftToRight = (y + frameCount) % 2 === 0;
      for (let ix = 0; ix < cols; ix++) {
        let x = scanLeftToRight ? ix : cols - 1 - ix;
        let cell = grid[x][y];
        if (!cell || processed[x][y]) continue;
        processed[x][y] = true;

      if (cell.type === "sand") {
        let below = grid[x][y + 1];

        let hotContact = false;
        let sourceHeat = 0;
        let lavaContact = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
          let n = grid[x + dx]?.[y + dy];
          if (n?.type === "lava") {
            hotContact = true;
            sourceHeat = 1;
            lavaContact = lavaTemperature(n) >= lavaSuperHotTemp;
            break;
          }
          if (n && (n.type === "rock" || n.type === "basalt" || n.type === "glass")) {
            let h = n.heat || 0;
            if (h >= sandToGlassHeatThreshold) {
              hotContact = true;
              sourceHeat = max(sourceHeat, h);
            }
          }
        }
        if (hotContact) {
          if (lavaContact) {
            spawnSmoke(x, y);
            grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
            processed[x][y] = true;
            continue;
          }
          if (sourceHeat >= sandToGlassHeatThreshold && random() < 0.2) spawnSmoke(x, y);
          let initialGlassiness = sourceHeat ? min(1, sourceHeat * 1.2) : 0.6;
          grid[x][y] = { type: "glass", decayTimer: 0, glassiness: initialGlassiness, heat: initialGlassiness * 0.6 };
          processed[x][y] = true;
          continue;
        }

        if (below && (below.type === "water" || below.type === "acid")) {
          grid[x][y + 1] = cell;
          grid[x][y] = below;
          cell.fall = 0;
          cell.vy = 0;
          processed[x][y + 1] = true;
          processed[x][y] = true;
          continue;
        }

        if (!below) {
          grid[x][y + 1] = cell;
          grid[x][y] = null;
          cell.fall = 0;
          cell.vy = 0;
          processed[x][y + 1] = true;
          processed[x][y] = true;
          continue;
        }

        let dirs = random() < 0.5 ? [-1, 1] : [1, -1];
        for (let d of dirs) {
          let nx = x + d;
          if (nx < 0 || nx >= cols) continue;
          let diag = grid[nx][y + 1];
          if (diag === null || diag?.type === "water" || diag?.type === "acid") {
            if (diag?.type === "water" || diag?.type === "acid") grid[x][y] = diag;
            else grid[x][y] = null;
            grid[nx][y + 1] = cell;
            cell.fall = 0;
            cell.vy = 0;
            processed[nx][y + 1] = true;
            processed[x][y] = true;
            break;
          }
        }
      }

      else if (cell.type === "dust") {
        let below = grid[x][y + 1];

        let dissolving = false;
        let hotContact = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let n = grid[x + dx]?.[y + dy];
          if (n?.type === "water") dissolving = true;
          if ((n?.type === "rock" || n?.type === "basalt" || n?.type === "glass") && (n.heat || 0) >= dustHeatDissolveThreshold) {
            dissolving = true;
            hotContact = true;
          }
          if (dissolving) break;
        }

        if (dissolving) {
          cell.dissolveTimer = (cell.dissolveTimer || 0) + (hotContact ? 2 : 1);
          if (hotContact && cell.dissolveTimer % 4 === 0) spawnSmoke(x, y);
          if (cell.dissolveTimer >= dustDissolveTime) {
            grid[x][y] = null;
            processed[x][y] = true;
            continue;
          }
        } else {
          cell.dissolveTimer = 0;
        }

        if (below?.type === "water" || below?.type === "acid") {
          grid[x][y + 1] = cell;
          grid[x][y] = below;
          processed[x][y + 1] = true;
          processed[x][y] = true;
        } else if (!below) {
          cell.vy = (cell.vy || 0) + gravity;
          cell.vy = min(cell.vy, maxFallSpeed);
          let steps = max(1, floor(cell.vy));

          for (let i = 0; i < steps; i++) {
            if (grid[x][y + 1] === null) {
              grid[x][y + 1] = cell;
              grid[x][y] = null;
              processed[x][y + 1] = true;
              y++;
            }
          }
        } else {
          cell.vy = 0;
          let options = [];
          if (x > 0 && grid[x - 1][y + 1] === null) options.push(-1);
          if (x < cols - 1 && grid[x + 1][y + 1] === null) options.push(1);

          if (options.length) {
            if (random() < 0.45) {
              let d = random(options);
              grid[x + d][y + 1] = cell;
              grid[x][y] = null;
              processed[x + d][y + 1] = true;
              processed[x][y] = true;
            }
          }
        }
      }

      else if (cell.type === "water") {
        let below = grid[x][y + 1];

        let lavaContact = null;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          if (grid[x + dx]?.[y + dy]?.type === "lava") {
            lavaContact = [x + dx, y + dy];
            break;
          }
        }
        if (lavaContact) {
          let lx = lavaContact[0];
          let ly = lavaContact[1];
          let lavaCell = grid[lx]?.[ly];
          let lavaTemp = lavaCell ? lavaTemperature(lavaCell) : lavaBaseTemp;
          spawnSmoke(x, y);
          spawnSmoke(lx, ly);
          grid[x][y] = null;
          if (lavaCell && lavaTemp >= lavaSuperHotTemp) {
            lavaCell.temp = min(lavaMaxTemp, lavaTemp + 8);
            grid[lx][ly] = lavaCell;
          } else {
            grid[lx][ly] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), steamRock: true, spreadAge: 0, heat: 0.85 };
          }
          processed[x][y] = true;
          processed[lx][ly] = true;
          continue;
        }

        cell.heat = cell.heat || 0;
        let heatedBySolid = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let n = grid[x + dx]?.[y + dy];
          if (n && (n.type === "rock" || n.type === "basalt" || n.type === "glass")) {
            let h = n.heat || 0;
            if (h > 0) {
              heatedBySolid = true;
              cell.heat = min(1, cell.heat + h * waterHeatGain);
            }
          }
        }
        if (!heatedBySolid) cell.heat = max(0, cell.heat - waterHeatDecay);

        if (cell.heat >= waterBoilThreshold) {
          for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
            let nx = x + dx;
            let ny = y + dy;
            let n = grid[nx]?.[ny];
            if (n?.type === "sand" || n?.type === "dust") {
              spawnSmoke(nx, ny);
              grid[nx][ny] = null;
              processed[nx][ny] = true;
            }
          }
          spawnSmoke(x, y);
          grid[x][y] = null;
          processed[x][y] = true;
          continue;
        }

        if (below?.type === "dust") {
          grid[x][y] = below;
          grid[x][y + 1] = cell;
          processed[x][y] = true;
          processed[x][y + 1] = true;
          continue;
        }

        if (below?.type === "acid") {
          let splashMoves = [];
          if (x > 0 && grid[x - 1][y] === null) splashMoves.push([-1, 0]);
          if (x < cols - 1 && grid[x + 1][y] === null) splashMoves.push([1, 0]);
          if (y > 0 && grid[x][y - 1] === null) splashMoves.push([0, -1]);
          if (x > 0 && y > 0 && grid[x - 1][y - 1] === null) splashMoves.push([-1, -1]);
          if (x < cols - 1 && y > 0 && grid[x + 1][y - 1] === null) splashMoves.push([1, -1]);
          if (x > 0 && y > 1 && grid[x - 1][y - 2] === null) splashMoves.push([-1, -2]);
          if (x < cols - 1 && y > 1 && grid[x + 1][y - 2] === null) splashMoves.push([1, -2]);
          if (y > 1 && grid[x][y - 2] === null) splashMoves.push([0, -2]);
          if (y > 2 && grid[x][y - 3] === null) splashMoves.push([0, -3]);
          if (x > 1 && y > 1 && grid[x - 2][y - 2] === null) splashMoves.push([-2, -2]);
          if (x < cols - 2 && y > 1 && grid[x + 2][y - 2] === null) splashMoves.push([2, -2]);
          if (x > 1 && grid[x - 2][y] === null) splashMoves.push([-2, 0]);
          if (x < cols - 2 && grid[x + 2][y] === null) splashMoves.push([2, 0]);
          if (x > 0 && grid[x - 1][y] === null && random() < 0.7) splashMoves.push([-1, 0]);
          if (x < cols - 1 && grid[x + 1][y] === null && random() < 0.7) splashMoves.push([1, 0]);
          if (splashMoves.length && random() < waterAcidSplashChance) {
            let m = random(splashMoves);
            let nx = x + m[0];
            let ny = y + m[1];
            grid[nx][ny] = cell;
            grid[x][y] = null;
            processed[nx][ny] = true;
            processed[x][y] = true;
            if (random() < waterAcidSplashExtraDropsChance) {
              let extraMoves = [];
              if (x > 0 && grid[x - 1][y] === null) extraMoves.push([-1, 0]);
              if (x < cols - 1 && grid[x + 1][y] === null) extraMoves.push([1, 0]);
              if (y > 0 && grid[x][y - 1] === null) extraMoves.push([0, -1]);
              if (x > 0 && y > 0 && grid[x - 1][y - 1] === null) extraMoves.push([-1, -1]);
              if (x < cols - 1 && y > 0 && grid[x + 1][y - 1] === null) extraMoves.push([1, -1]);
              if (y > 1 && grid[x][y - 2] === null) extraMoves.push([0, -2]);
              if (extraMoves.length) {
                let em = random(extraMoves);
                let ex = x + em[0];
                let ey = y + em[1];
                if (!grid[ex][ey]) {
                  grid[ex][ey] = { ...cell };
                  processed[ex][ey] = true;
                }
              }
            }
          }
          continue;
        }

        if (below?.type === "lava") {
          let lavaTemp = lavaTemperature(below);
          spawnSmoke(x, y);
          grid[x][y] = null;
          if (lavaTemp >= lavaSuperHotTemp) {
            below.temp = min(lavaMaxTemp, lavaTemp + 8);
            grid[x][y + 1] = below;
          } else {
            grid[x][y + 1] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), heat: 0.85 };
          }
          processed[x][y + 1] = true;
          continue;
        }

        if (cell.heat >= waterRunnyHeatThreshold && random() < waterRunnyChance) {
          let jitterMoves = [];
          if (x > 0 && grid[x - 1][y] === null) jitterMoves.push([-1, 0]);
          if (x < cols - 1 && grid[x + 1][y] === null) jitterMoves.push([1, 0]);
          if (y > 0 && grid[x][y - 1] === null) jitterMoves.push([0, -1]);
          if (x > 0 && y > 0 && grid[x - 1][y - 1] === null) jitterMoves.push([-1, -1]);
          if (x < cols - 1 && y > 0 && grid[x + 1][y - 1] === null) jitterMoves.push([1, -1]);
          if (jitterMoves.length) {
            let m = random(jitterMoves);
            let nx = x + m[0];
            let ny = y + m[1];
            grid[nx][ny] = cell;
            grid[x][y] = null;
            processed[nx][ny] = true;
            continue;
          }
        }

        if (!below) {
          grid[x][y + 1] = cell;
          grid[x][y] = null;
          processed[x][y + 1] = true;
          processed[x][y] = true;
        } else {
          let options = [];
          if (x > 0 && grid[x - 1][y] === null) options.push(-1);
          if (x < cols - 1 && grid[x + 1][y] === null) options.push(1);

          if (options.length) {
            let d = random(options);
            grid[x + d][y] = cell;
            grid[x][y] = null;
            processed[x + d][y] = true;
            processed[x][y] = true;
          }
        }

        let nb = [[0,1],[0,-1],[1,0],[-1,0]];
        for (let n of nb) {
          let nx = x + n[0];
          let ny = y + n[1];
          if (grid[nx]?.[ny]?.type === "sand") {
            grid[nx][ny].wetness = min(1, grid[nx][ny].wetness + 0.05);
          }
        }
      }

      else if (cell.type === "acid") {
        let heated = false;
        let touchedLava = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let n = grid[x + dx]?.[y + dy];
          if (n?.type === "lava") {
            touchedLava = true;
            heated = true;
            continue;
          }
          if (n && (n.type === "rock" || n.type === "basalt" || n.type === "glass") && (n.heat || 0) >= acidHeatThreshold) {
            heated = true;
          }
        }
        if (touchedLava) {
          cell.lavaDamage = (cell.lavaDamage || 0) + 1;
          if (cell.lavaDamage >= acidLavaDissolveTime) {
            grid[x][y] = null;
            processed[x][y] = true;
            continue;
          }
        } else {
          cell.lavaDamage = 0;
        }

        if (cell.energyHeatTick === frameCount) heated = true;
        if (heated) {
          cell.heatTimer = (cell.heatTimer || 0) + 1;
          if (cell.heatTimer >= acidEvaporateTime) {
            spawnToxicSmoke(x, y);
            spawnToxicSmoke(x, y);
            grid[x][y] = null;
            processed[x][y] = true;
            continue;
          }
        } else {
          cell.heatTimer = max(0, (cell.heatTimer || 0) - 1);
        }

        let waterNeighbors = [];
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          if (grid[x + dx]?.[y + dy]?.type === "water") {
            waterNeighbors.push([x + dx, y + dy]);
          }
        }
        if (waterNeighbors.length) {
          if (random() < acidWaterAbsorbChance) {
            let pick = random(waterNeighbors);
            let wx = pick[0];
            let wy = pick[1];
            grid[wx][wy] = null;
            processed[wx][wy] = true;
            cell.dilution = min(acidDilutionMax, (cell.dilution || 0) + acidDilutionRate);
            if (cell.diluteVar === undefined) cell.diluteVar = random(-10, 10);
          }
        }

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let nx = x + dx;
          let ny = y + dy;
          let n = grid[nx]?.[ny];
          if (!n || n.type === "acid" || n.type === "water" || n.type === "lava") continue;
          n.acidDamage = (n.acidDamage || 0) + acidDissolveRate(n.type);
          n.acidDamageTick = frameCount;
          if (n.acidDamage >= acidDissolveTime) {
            grid[nx][ny] = null;
            processed[nx][ny] = true;
          }
        }

        let below = grid[x][y + 1];
        if (below?.type === "dust") {
          grid[x][y] = below;
          grid[x][y + 1] = cell;
          processed[x][y] = true;
          processed[x][y + 1] = true;
          continue;
        }

        if (below?.type === "water") {
          if (random() < acidWaterAbsorbChanceAcidOnWater) {
            below.acidLevel = min(acidWaterToAcidThreshold, (below.acidLevel || 0) + acidTransferRate);
            if (below.acidLevel >= acidWaterToAcidThreshold) {
              grid[x][y + 1] = { type: "acid", r: random(120, 170), g: random(190, 230), b: random(120, 170), dilution: 0, diluteVar: random(-10, 10) };
            } else {
              grid[x][y + 1] = below;
            }
            grid[x][y] = null;
            processed[x][y + 1] = true;
            processed[x][y] = true;
          }
        } else if (!below) {
          grid[x][y + 1] = cell;
          grid[x][y] = null;
          processed[x][y + 1] = true;
          processed[x][y] = true;
        } else {
          let options = [];
          if (x > 0 && grid[x - 1][y] === null) options.push(-1);
          if (x < cols - 1 && grid[x + 1][y] === null) options.push(1);

          if (options.length) {
            let d = random(options);
            grid[x + d][y] = cell;
            grid[x][y] = null;
            processed[x + d][y] = true;
            processed[x][y] = true;
          }
        }
      }

      else if (cell.type === "grass") {
        let hotSolidContact = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let n = grid[x + dx]?.[y + dy];
          if ((n?.type === "rock" || n?.type === "basalt" || n?.type === "glass") && (n.heat || 0) >= glassHeatThreshold) {
            hotSolidContact = true;
            break;
          }
        }

        if (hotSolidContact) {
          spawnSmoke(x, y);
          grid[x][y] = { type: "dust", r: random(110, 140), g: random(110, 140), b: random(110, 140), vy: 0 };
          processed[x][y] = true;
          continue;
        }

        if (cell.burning) {
          cell.burnTimer++;
          if (cell.burnTimer % 6 === 0) spawnSmoke(x, y);
          if (cell.burnTimer >= grassBurnTime) {
            grid[x][y] = { type: "dust", r: random(110, 140), g: random(110, 140), b: random(110, 140), vy: 0 };
            processed[x][y] = true;
          }
        } else {
          cell.burnTimer = 0;
        }
      }

      else if (cell.type === "lava") {
            cell.temp = lavaTemperature(cell);
            let superHot = cell.temp >= lavaSuperHotTemp;
            let touchesWaterOrSand = false;
            let touchesOtherSolid = false;
            let iceDestroyed = 0;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
             let nx = x + dx;
             let ny = y + dy;
             let n = grid[nx]?.[ny];
             if (n?.type === "lava") {
               n.temp = lavaTemperature(n);
               let dTemp = cell.temp - n.temp;
               if (dTemp > 0) {
                 n.temp = min(lavaMaxTemp, n.temp + dTemp * lavaNeighborHeatTransfer);
                 if (superHot) n.temp = max(n.temp, cell.temp - 12);
               }
             }
             if (superHot && n) {
               if (n.type === "water") {
                 touchesWaterOrSand = true;
                 spawnSmoke(nx, ny);
                 grid[nx][ny] = null;
                 processed[nx][ny] = true;
                 continue;
               }
               if (n.type !== "lava" && n.type !== "water") {
                 spawnSmoke(nx, ny);
                  grid[nx][ny] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0, temp: max(lavaSuperHotTemp, cell.temp - 40) };
                 processed[nx][ny] = true;
                 continue;
               }
             }
             if (n?.type === "water" || n?.type === "sand") touchesWaterOrSand = true;
             else if (n?.type === "rock" || n?.type === "basalt" || n?.type === "glass") touchesOtherSolid = true;
             if (n?.type === "ice") {
               n.meltTimer = (n.meltTimer || 0) + 1;
               if (n.meltTimer >= iceMeltTime) {
                grid[x + dx][y + dy] = { type: "water", r: random(0, 30), g: random(80, 120), b: random(200, 255), heat: 0.3, acidLevel: 0 };
                processed[x + dx][y + dy] = true;
                iceDestroyed++;
              }
            }

            if (n?.type === "grass") {
              n.burning = true;
            }

            if (n?.type === "dust") {
              spawnSmoke(x + dx, y + dy);
              grid[x + dx][y + dy] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
              processed[x + dx][y + dy] = true;
            }
        }


if (touchesWaterOrSand) {
  if (superHot) cell.coolTimer = max(0, cell.coolTimer - 0.1);
  else cell.coolTimer = max(0, cell.coolTimer - 2);
} else {
  cell.coolTimer++;
}
if (iceDestroyed > 0) cell.coolTimer += superHot ? iceDestroyed : iceDestroyed * 6;

let lavaBasaltThreshold = lavaCoolTime;
if (superHot) {
  let hotFactor = map(cell.temp, lavaSuperHotTemp, lavaMaxTemp, 4, lavaSuperHotBasaltMultiplier);
  lavaBasaltThreshold = lavaCoolTime * hotFactor;
}

if (cell.coolTimer >= lavaBasaltThreshold) {
  grid[x][y] = { type: "basalt", r: random(8, 28), g: random(8, 24), b: random(12, 34), heat: 0.25 };
  processed[x][y] = true;
  continue;
}

let coolProgress = constrain(cell.coolTimer / max(1, lavaBasaltThreshold), 0, 1);
let moveFactor = max(0, 1 - pow(coolProgress, 1.8));

if (touchesWaterOrSand) {
  cell.temp = max(lavaBaseTemp, cell.temp - lavaWaterContactCoolRate);
} else {
  cell.temp = max(lavaBaseTemp, cell.temp - (superHot ? lavaSuperHotCoolRate : lavaPassiveCoolRate));
}

        cell.moveTimer = 0;
        cell.heatAge++;

        let below = grid[x][y + 1];
        if (!below) {
          if (random() < moveFactor) {
            cell.vy = maxLavaFallSpeed;
            let steps = max(1, floor(cell.vy));
            for (let i = 0; i < steps; i++) {
              if (!grid[x][y + 1]) {
                grid[x][y + 1] = cell;
                grid[x][y] = null;
                processed[x][y + 1] = true;
                processed[x][y] = true;
                y++;
              }
            }
          }
          continue;
        } else {
          cell.vy = 0;
        }

        if (!superHot && below?.type === "water") {
          spawnSmoke(x, y);
          grid[x][y] = null;
          grid[x][y + 1] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), steamRock: true, spreadAge: 0, heat: 0.85 };
          processed[x][y + 1] = true;
          processed[x][y] = true;
          cell.coolTimer = 0;
          continue;
        }

        if (!superHot && below?.type === "sand") {
          grid[x][y] = null;
          grid[x][y + 1] = { type: "glass", decayTimer: 0, glassiness: 1, heat: 1 };
          processed[x][y + 1] = true;
          processed[x][y] = true;
          cell.coolTimer = 0;
          continue;
        }

        if (below?.type === "rock") {
          let adjacentLava = 0;
          for (let [dx, dy] of [[0,-1],[1,0],[-1,0]]) {
            if (grid[x + dx]?.[y + dy]?.type === "lava") adjacentLava++;
          }
          let meltThreshold = random(6000, 12000) - (adjacentLava * 1500);
          cell.meltTimer++;
          if (cell.meltTimer > meltThreshold) {
            grid[x][y + 1] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
            processed[x][y + 1] = true;
          }
          continue;
        }

        let dirs = [];
        if (x > 0 && grid[x - 1][y] === null) dirs.push(-1);
        if (x < cols - 1 && grid[x + 1][y] === null) dirs.push(1);

        if (dirs.length && random() < 0.35) {
          if (random() >= moveFactor) continue;
          let d = random(dirs);
          let newLava = { ...cell, coolTimer: cell.coolTimer };
          grid[x + d][y] = newLava;
          processed[x + d][y] = true;
          grid[x][y] = null;
          processed[x][y] = true;
        } else if (y > 0 && grid[x][y - 1] === null && random() < 0.05 * moveFactor) {
          let newLava = { ...cell, coolTimer: cell.coolTimer };
          grid[x][y - 1] = newLava;
          processed[x][y - 1] = true;
          grid[x][y] = null;
          processed[x][y] = true;
        }
      }
    }
  }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (!c) continue;
        if (c.acidDamage !== undefined && c.type !== "acid" && c.type !== "water" && c.type !== "lava") {
          if (c.acidDamageTick !== frameCount) {
            c.acidDamage = max(0, (c.acidDamage || 0) - (acidDissolveTime / max(1, acidDamageRecoverTime)));
          }
        }
        if (c.type === "rock" || c.type === "basalt" || c.type === "glass" || c.type === "ice") {
          c.heat = c.heat || 0;
          let lavaAdj = 0;
          let hotMaterialAdj = 0;
          for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let n = grid[x + dx]?.[y + dy];
            if (n?.type === "lava") {
              lavaAdj++;
              hotMaterialAdj++;
              continue;
            }
            if ((n?.type === "rock" || n?.type === "basalt" || n?.type === "glass") && (n.heat || 0) >= glassMeltHeatThreshold) {
              hotMaterialAdj++;
            }
          }
          if (lavaAdj) {
            let gain = solidHeatGainFromLava * lavaAdj;
            if (c.type === "rock") gain *= rockHeatGainMultiplier;
            c.heat = min(1, c.heat + gain);
          }

          for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let n = grid[x + dx]?.[y + dy];
            if (n && (n.type === "rock" || n.type === "basalt" || n.type === "glass")) {
              n.heat = n.heat || 0;
              let d = (c.heat - n.heat) * solidHeatSpread;
              if (d > 0) n.heat = min(1, n.heat + d);
            }
          }

          let decay = solidHeatDecay;
          if (c.type === "basalt") decay *= basaltHeatDecayMultiplier;
          c.heat = max(0, c.heat - decay);

          if (c.type === "rock" || c.type === "basalt") {
            let heatGate = c.type === "rock" ? rockMeltHeatThreshold : basaltMeltHeatThreshold;
            let meltTime = c.type === "rock" ? rockMeltTime : basaltMeltTime;
            c.meltTimer = c.meltTimer || 0;

            if (lavaAdj > 0 && c.heat >= heatGate) {
              c.meltTimer++;
            } else {
              c.meltTimer = max(0, c.meltTimer - meltTimerCooldown);
            }

            if (c.meltTimer >= meltTime && c.heat >= heatGate) {
              grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
              processed[x][y] = true;
              continue;
            }
          }

          if (c.type === "glass") {
            c.meltTimer = c.meltTimer || 0;
            if (c.heat >= glassMeltHeatThreshold && hotMaterialAdj > 0) {
              c.meltTimer += hotMaterialAdj;
            } else {
              c.meltTimer = max(0, c.meltTimer - glassMeltCooldown);
            }

            if (c.meltTimer >= glassMeltTime) {
              grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
              processed[x][y] = true;
              continue;
            }
          }

          if (c.type === "ice" && c.heat >= 0.5) {
            grid[x][y] = { type: "water", r: random(0, 30), g: random(80, 120), b: random(200, 255), heat: c.heat, acidLevel: 0 };
            processed[x][y] = true;
            continue;
          }

          if (c.heat >= boilHeatThreshold) {
            for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
              let nx = x + dx;
              let ny = y + dy;
              if (grid[nx]?.[ny]?.type === "water") {
                grid[nx][ny] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), steamRock: false, spreadAge: 0, heat: c.heat * 0.6 };
                processed[nx][ny] = true;
              }
            }
          }
        }
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (!c) continue;
        if (c.type === "water" || c.type === "lava") continue;
        if (c.type === "rock" || c.type === "basalt" || c.type === "glass" || c.type === "ice") continue;
        if (c.heat === undefined) continue;

        c.heat = max(0, c.heat - solidHeatDecay);
        if (c.heat >= rockMeltThreshold) {
          grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
          processed[x][y] = true;
        }
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (!c || c.heat === undefined) continue;
        if (c.type === "water" || c.type === "lava") continue;
        if (c.type === "rock" || c.type === "basalt" || c.type === "glass" || c.type === "ice") continue;

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let nx = x + dx;
          let ny = y + dy;
          let n = grid[nx]?.[ny];
          if (!n || n.type === "water" || n.type === "lava") continue;
          if (n.type === "rock" || n.type === "basalt" || n.type === "glass" || n.type === "ice") continue;

          if (n.heat === undefined) {
            if (c.heat <= 0.25) n.heat = 0.35;
            continue;
          }

          if (c.heat < n.heat) {
            let d = (n.heat - c.heat) * coldSpreadRate;
            n.heat = max(0, n.heat - d);
          }
        }
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (c?.type === "rock" && c.steamRock && c.spreadAge < steamRockSpreadLimit) {
          c.spreadAge++;
          for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let nx = x + dx;
            let ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !grid[nx][ny]) {
              grid[nx][ny] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), steamRock: true, spreadAge: c.spreadAge, heat: c.heat || 0 };
            }
          }
        }
      }
    }

    if (frameCount % 2 === 0) {
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          let c = grid[x][y];
          if (!c || c.type !== "glass" || c.glassiness <= 0) continue;

          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              let nx = x + dx;
              let ny = y + dy;
              let n = grid[nx]?.[ny];
              if (n?.type === "sand") {
                let d = (c.glassiness - (n.glassiness || 0)) * glassSpreadRate;
                if (d > 0) n.glassiness = min(1, (n.glassiness || 0) + d);
                if (n.glassiness >= 0.5) {
                  grid[nx][ny] = { type: "glass", decayTimer: 0, glassiness: n.glassiness, heat: n.glassiness * 0.5 };
                }
              }
            }
          }

          c.glassiness = max(0, c.glassiness - glassDecay);
        }
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (!c || c.type !== "sand" || c.wetness <= 0) continue;

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx;
            let ny = y + dy;
            if (grid[nx]?.[ny]?.type === "sand") {
              let delta = (c.wetness - grid[nx][ny].wetness) * wetSpreadRate;
              if (delta > 0) {
                grid[nx][ny].wetness = min(1, grid[nx][ny].wetness + delta);
              }
            }
          }
        }

        c.wetness = max(0, c.wetness - wetDecay);
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (!c || c.type !== "water" || !c.acidLevel) continue;

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let nx = x + dx;
          let ny = y + dy;
          let n = grid[nx]?.[ny];
          if (n?.type !== "water") continue;
          let delta = (c.acidLevel - (n.acidLevel || 0)) * acidWaterSpreadRate;
          if (delta > 0) {
            n.acidLevel = min(acidWaterToAcidThreshold, (n.acidLevel || 0) + delta);
          }
        }
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (!c || c.type !== "acid" || !c.dilution) continue;

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let nx = x + dx;
          let ny = y + dy;
          let n = grid[nx]?.[ny];
          if (n?.type !== "acid") continue;
          let delta = (c.dilution - (n.dilution || 0)) * acidDilutionSpreadRate;
          if (delta > 0) {
            n.dilution = min(acidDilutionMax, (n.dilution || 0) + delta);
          }
        }
      }
    }

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let c = grid[x][y];
        if (c?.type === "glass") {
          c.decayTimer = (c.decayTimer || 0) + 1;
        }
      }
    }
  }

  noStroke();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let c = grid[x][y];
      if (!c) continue;

      if (c.type === "sand") {
        let acidDark = acidDarkenFactor(c);
        let baseR = lerp(c.r, 150, c.wetness);
        let baseG = lerp(c.g, 110, c.wetness);
        let baseB = lerp(c.b, 70, c.wetness);
        let h = heatGlowLevel(c.heat, 1.8);
        fill(
          lerp(baseR, 245, h) * acidDark,
          lerp(baseG, 140, h) * acidDark,
          lerp(baseB, 80, h) * acidDark
        );
      } else if (c.type === "water") {
        let acidDark = acidDarkenFactor(c);
        let acidMix = constrain(c.acidLevel || 0, 0, 1);
        let waterR = lerp(c.r, acidTintR, acidMix);
        let waterG = lerp(c.g, acidTintG, acidMix);
        let waterB = lerp(c.b, acidTintB, acidMix);
        fill(waterR * acidDark, waterG * acidDark, waterB * acidDark, 220);
      } else if (c.type === "acid") {
        let d = constrain((c.dilution || 0) / max(1, acidDilutionMax), 0, 1);
        let ar = lerp(c.r, acidDiluteTintR, d);
        let ag = lerp(c.g, acidDiluteTintG, d);
        let ab = lerp(c.b, acidDiluteTintB, d);
        let v = c.diluteVar || 0;
        fill(
          constrain(ar + v * 0.6, 0, 255),
          constrain(ag + v * 0.4, 0, 255),
          constrain(ab + v * 1.1, 0, 255),
          220
        );
      } else if (c.type === "rock") {
        let acidDark = acidDarkenFactor(c);
        let h = heatGlowLevel(c.heat, 1.8);
        fill(
          lerp(c.r, 245, h) * acidDark,
          lerp(c.g, 120, h) * acidDark,
          lerp(c.b, 70, h) * acidDark
        );
      } else if (c.type === "basalt") {
        let acidDark = acidDarkenFactor(c);
        let h = heatGlowLevel(c.heat, 1.6);
        fill(
          lerp(c.r, 110, h) * acidDark,
          lerp(c.g, 68, h) * acidDark,
          lerp(c.b, 62, h) * acidDark
        );
      } else if (c.type === "lava") {
        let temp = lavaTemperature(c);
        let superHotMix = constrain((temp - lavaSuperHotTemp) / max(1, (lavaMaxTemp - lavaSuperHotTemp)), 0, 1);
        let flicker = random(-14, 14);
        let colorVar = random(-20, 20) * superHotMix;
        let coolingHotFactor = superHotMix > 0 ? map(temp, lavaSuperHotTemp, lavaMaxTemp, 4, lavaSuperHotBasaltMultiplier) : 1;
        let lavaBasaltThreshold = lavaCoolTime * coolingHotFactor;
        let coolProgress = constrain((c.coolTimer || 0) / max(1, lavaBasaltThreshold), 0, 1);
        let darkenMix = pow(constrain((coolProgress - 0.6) / 0.4, 0, 1), 1.8);
        let lavaR = constrain(lerp(255, 145, superHotMix) + flicker * 0.6 + colorVar * 0.4, 0, 255);
        let lavaG = constrain(lerp(random(80, 130), 225, superHotMix) + flicker * 0.2 - colorVar * 0.2, 0, 255);
        let lavaB = constrain(lerp(random(0, 20), 255, superHotMix) - flicker * 0.2 + colorVar * 0.7, 0, 255);
        fill(
          lerp(lavaR, 18, darkenMix),
          lerp(lavaG, 16, darkenMix),
          lerp(lavaB, 28, darkenMix)
        );
      } else if (c.type === "grass") {
        let acidDark = acidDarkenFactor(c);
        if (c.burning) {
          fill(120 * acidDark, 90 * acidDark, 40 * acidDark);
        } else {
          let h = heatGlowLevel(c.heat, 2.1);
          fill(
            lerp(c.r, 230, h) * acidDark,
            lerp(c.g, 135, h) * acidDark,
            lerp(c.b, 85, h) * acidDark
          );
        }
      } else if (c.type === "dust") {
        let acidDark = acidDarkenFactor(c);
        let h = heatGlowLevel(c.heat, 1.9);
        fill(
          lerp(c.r, 230, h) * acidDark,
          lerp(c.g, 135, h) * acidDark,
          lerp(c.b, 90, h) * acidDark
        );
      } else if (c.type === "glass") {
        let acidDark = acidDarkenFactor(c);
        let glassIntensity = c.glassiness || 0;
        let h = heatGlowLevel(c.heat, 1.7);
        let baseR = 180 + glassIntensity * 30;
        let baseG = 220;
        let baseB = 255;
        let baseA = 55 + glassIntensity * 45;
        fill(
          lerp(baseR, 255, h) * acidDark,
          lerp(baseG, 190, h) * acidDark,
          lerp(baseB, 135, h) * acidDark,
          min(255, baseA + h * 65)
        );
      } else if (c.type === "ice") {
        let acidDark = acidDarkenFactor(c);
        let h = heatGlowLevel(c.heat, 1.8);
        fill(
          lerp(c.r, 250, h) * acidDark,
          lerp(c.g, 215, h) * acidDark,
          lerp(c.b, 170, h) * acidDark,
          210
        );
      }

      rect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    let s = smokeParticles[i];
    if (!timeStopped) {
      s.y -= s.vy;
      s.life--;
    }
    let lifeMax = max(1, s.lifeMax || 520);
    let a = map(s.life, 0, lifeMax, 0, 180);
    fill(s.r ?? 200, s.g ?? 200, s.b ?? 200, a);
    ellipse(s.x, s.y, 6);
    if (s.life <= 0) smokeParticles.splice(i, 1);
  }

  noFill();
  stroke(0);
  rect(
    (cx - brushSize) * cellSize,
    (cy - brushSize) * cellSize,
    (brushSize * 2 + 1) * cellSize,
    (brushSize * 2 + 1) * cellSize
  );

  noStroke();
  fill(0);
  text(`MODE: ${mode}`, 6, 12);
  text(`ENERGY: ${energyMode}`, 6, 48);
  text(`SIZE: ${brushSize}`, 6, 24);
  text(`TIME: ${timeStopped ? "STOPPED" : "RUNNING"}`, 6, 36);

  noFill();
  stroke(0);
  strokeWeight(2);
  rect(0, 0, width, height);
}

// Biggest bug fix session ever.
