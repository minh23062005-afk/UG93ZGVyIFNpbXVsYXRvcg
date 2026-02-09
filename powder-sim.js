// Powder Simulation BETA 1.3.5🔥❄️
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
let lavaCoolTime = 1200;
let solidHeatGainFromLava = 0.06;
let solidHeatDecay = 0.002;
let solidHeatSpread = 0.12;
let boilHeatThreshold = 0.7;
let glassHeatThreshold = 0.5;
let rockMeltThreshold = 0.95;
let basaltMeltThreshold = 0.99;
let coldSpreadRate = 0.45;
let iceMeltTime = 18;
let smokeParticles = [];
let maxSmokeParticles = 800;
let grassBurnTime = 60;
let dustDissolveTime = 60;
let dustHeatDissolveThreshold = 0.6;
let timeStopped = false;
let waterHeatGain = 0.04;
let waterHeatDecay = 0.004;
let waterBoilThreshold = 0.6;

function setup() {
  const canvas = createCanvas(1000, 1000);
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
    else if (mode === "WATER") mode = "LAVA";
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
    life: random(180, 300)
  });
}

function applyEnergyAt(x, y) {
  let cell = grid[x][y];
  if (!cell) return;

  if (energyMode === "HEAT") {
    if (cell.type !== "water" && cell.type !== "lava") {
      cell.heat = min(1, (cell.heat || 0) + 0.08);
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
      cell.heat = min(1, (cell.heat || 0) + 0.08);
      return;
    }
    if (cell.type === "water") {
      cell.heat = min(1, (cell.heat || 0) + 0.08);
      return;
    }
  } else if (energyMode === "COLD") {
    if (cell.type === "ice") return;
    if (cell.heat === undefined) cell.heat = 0.5;
    cell.heat = max(0, cell.heat - 0.08);
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
    spawnTimer++;
    if (spawnTimer >= spawnDelay) {
      spawnTimer = 0;

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
              heat: 0
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
      for (let x = 0; x < cols; x++) {
        let cell = grid[x][y];
        if (!cell || processed[x][y]) continue;

      if (cell.type === "sand") {
        let below = grid[x][y + 1];

        let hotContact = false;
        let sourceHeat = 0;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let n = grid[x + dx]?.[y + dy];
          if (n && (n.type === "rock" || n.type === "basalt")) {
            let h = n.heat || 0;
            if (h >= glassHeatThreshold) {
              hotContact = true;
              sourceHeat = max(sourceHeat, h);
            }
          }
        }
        if (hotContact) {
          let initialGlassiness = sourceHeat ? min(1, sourceHeat * 1.2) : 0.6;
          grid[x][y] = { type: "glass", decayTimer: 0, glassiness: initialGlassiness, heat: initialGlassiness * 0.6 };
          processed[x][y] = true;
          continue;
        }

        if (below && below.type === "water") {
          grid[x][y + 1] = cell;
          grid[x][y] = below;
          cell.fall++;
          continue;
        }

        if (!below) {
          cell.vy += gravity;
          cell.vy = min(cell.vy, maxFallSpeed);
          let steps = max(1, floor(cell.vy));

          for (let i = 0; i < steps; i++) {
            if (grid[x][y + 1] === null) {
              grid[x][y + 1] = cell;
              grid[x][y] = null;
              cell.fall++;
              y++;
            }
          }
        } else {
          let stackHeight = countStackBelow(x, y);
          let forcedCollapse = stackHeight >= maxStackHeight;

          if (cell.fall < impactThreshold && !forcedCollapse) {
            cell.vy = 0;
            cell.fall = 0;
            continue;
          }

          cell.vy = 0;

          let depth = min(4, cell.fall);
          for (let i = 1; i <= depth; i++) {
            if (grid[x][y + i]?.type === "sand") {
              grid[x][y + i].fall = impactThreshold;
            }
          }

          let options = [];
          if (x > 0 && grid[x - 1][y + 1] === null) options.push(-1);
          if (x < cols - 1 && grid[x + 1][y + 1] === null) options.push(1);

          if (options.length) {
            let d = random(options);
            grid[x + d][y + 1] = cell;
            grid[x][y] = null;
          } else {
            cell.fall = 0;
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

        if (below?.type === "water") {
          grid[x][y + 1] = cell;
          grid[x][y] = below;
          processed[x][y + 1] = true;
        } else if (!below) {
          cell.vy = (cell.vy || 0) + gravity;
          cell.vy = min(cell.vy, maxFallSpeed);
          let steps = max(1, floor(cell.vy));

          for (let i = 0; i < steps; i++) {
            if (grid[x][y + 1] === null) {
              grid[x][y + 1] = cell;
              grid[x][y] = null;
              y++;
            }
          }
        } else {
          cell.vy = 0;
          let options = [];
          if (x > 0 && grid[x - 1][y + 1] === null) options.push(-1);
          if (x < cols - 1 && grid[x + 1][y + 1] === null) options.push(1);

          if (options.length) {
            let d = random(options);
            grid[x + d][y + 1] = cell;
            grid[x][y] = null;
          }
        }
      }

      else if (cell.type === "water") {
        let below = grid[x][y + 1];

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
          processed[x][y + 1] = true;
          continue;
        }

        if (below?.type === "lava") {
          spawnSmoke(x, y);
          grid[x][y] = null;
          grid[x][y + 1] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), heat: 1 };
          processed[x][y + 1] = true;
          continue;
        }

        if (!below) {
          grid[x][y + 1] = cell;
          grid[x][y] = null;
        } else {
          let options = [];
          if (x > 0 && grid[x - 1][y] === null) options.push(-1);
          if (x < cols - 1 && grid[x + 1][y] === null) options.push(1);

          if (options.length) {
            let d = random(options);
            grid[x + d][y] = cell;
            grid[x][y] = null;
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

      else if (cell.type === "grass") {
        let hotRockContact = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let n = grid[x + dx]?.[y + dy];
          if ((n?.type === "rock" || n?.type === "basalt") && (n.heat || 0) >= glassHeatThreshold) {
            hotRockContact = true;
            break;
          }
        }

        if (hotRockContact) {
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
            let touchesWaterOrSand = false;
            let touchesOtherSolid = false;
            let iceDestroyed = 0;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
             let n = grid[x + dx]?.[y + dy];
            if (n?.type === "water" || n?.type === "sand") touchesWaterOrSand = true;
            else if (n?.type === "rock" || n?.type === "basalt" || n?.type === "glass") touchesOtherSolid = true;
            if (n?.type === "ice") {
              n.meltTimer = (n.meltTimer || 0) + 1;
              if (n.meltTimer >= iceMeltTime) {
                grid[x + dx][y + dy] = { type: "water", r: random(0, 30), g: random(80, 120), b: random(200, 255), heat: 0.3 };
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


if (touchesWaterOrSand) cell.coolTimer = 0;
else cell.coolTimer++;
if (iceDestroyed > 0) cell.coolTimer += iceDestroyed * 6;

if (cell.coolTimer >= lavaCoolTime) {
  grid[x][y] = { type: "basalt", r: random(30, 50), g: random(30, 50), b: random(35, 55), heat: 0.2 };
  processed[x][y] = true;
  continue;
}

        cell.moveTimer = 0;
        cell.heatAge++;

        let below = grid[x][y + 1];
        if (!below) {
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
          continue;
        } else {
          cell.vy = 0;
        }

        if (below?.type === "water") {
          spawnSmoke(x, y);
          grid[x][y] = null;
          grid[x][y + 1] = { type: "rock", r: random(90, 120), g: random(90, 120), b: random(90, 120), steamRock: true, spreadAge: 0, heat: 1 };
          processed[x][y + 1] = true;
          processed[x][y] = true;
          cell.coolTimer = 0;
          continue;
        }

        if (below?.type === "sand") {
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
          let d = random(dirs);
          let newLava = { ...cell, coolTimer: cell.coolTimer };
          grid[x + d][y] = newLava;
          processed[x + d][y] = true;
          grid[x][y] = null;
          processed[x][y] = true;
        } else if (y > 0 && grid[x][y - 1] === null && random() < 0.05) {
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
        if (c.type === "rock" || c.type === "basalt" || c.type === "glass" || c.type === "ice") {
          c.heat = c.heat || 0;
          let lavaAdj = 0;
          for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            if (grid[x + dx]?.[y + dy]?.type === "lava") lavaAdj++;
          }
          if (lavaAdj) c.heat = min(1, c.heat + solidHeatGainFromLava * lavaAdj);

          for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let n = grid[x + dx]?.[y + dy];
            if (n && (n.type === "rock" || n.type === "basalt" || n.type === "glass")) {
              n.heat = n.heat || 0;
              let d = (c.heat - n.heat) * solidHeatSpread;
              if (d > 0) n.heat = min(1, n.heat + d);
            }
          }

          c.heat = max(0, c.heat - solidHeatDecay);

          if (c.type === "rock" && c.heat >= rockMeltThreshold) {
            grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
            processed[x][y] = true;
            continue;
          }

          if (c.type === "basalt" && c.heat >= basaltMeltThreshold) {
            grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0, coolTimer: 0 };
            processed[x][y] = true;
            continue;
          }

          if (c.type === "ice" && c.heat >= 0.5) {
            grid[x][y] = { type: "water", r: random(0, 30), g: random(80, 120), b: random(200, 255), heat: c.heat };
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

        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          let nx = x + dx;
          let ny = y + dy;
          let n = grid[nx]?.[ny];
          if (!n || n.type === "water" || n.type === "lava") continue;

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
        if (c?.type === "glass") {
          c.decayTimer++;
          if (c.decayTimer >= glassDecayTime) {
            grid[x][y] = { type: "lava", moveTimer: 0, meltTimer: 0, vy: 0, heatAge: 0 };
          }
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
        fill(
          lerp(c.r, 150, c.wetness),
          lerp(c.g, 110, c.wetness),
          lerp(c.b, 70, c.wetness)
        );
      } else if (c.type === "water") {
        fill(c.r, c.g, c.b, 120);
      } else if (c.type === "rock") {
        let h = min(1, (c.heat || 0) * 2.5);
        fill(
          lerp(c.r, 255, h),
          lerp(c.g, 120, h),
          lerp(c.b, 60, h)
        );
      } else if (c.type === "basalt") {
        let h = min(1, (c.heat || 0) * 2.0);
        fill(
          lerp(c.r, 180, h),
          lerp(c.g, 110, h),
          lerp(c.b, 90, h)
        );
      } else if (c.type === "lava") {
        fill(255, random(80, 120), 0);
      } else if (c.type === "grass") {
        if (c.burning) {
          fill(120, 90, 40);
        } else {
          fill(c.r, c.g, c.b);
        }
      } else if (c.type === "dust") {
        fill(c.r, c.g, c.b);
      } else if (c.type === "glass") {
        let glassIntensity = c.glassiness || 0;
        fill(180 + glassIntensity * 30, 220, 255, 55 + glassIntensity * 45);
      } else if (c.type === "ice") {
        fill(c.r, c.g, c.b, 210);
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
    fill(200, 200, 200, map(s.life, 0, 300, 0, 180));
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

// That one game about fire boy and water girl
