// Powder Simulation BETA 1.2.0
// for the heat and for the rocky 😤🔥
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

let mode = "SAND";
let brushSize = 3;

let wetSpreadRadius = 20;
let wetSpreadRate = 0.02;
let wetDecay = 0.002;

let lavaGravity = 0.2;
let maxLavaFallSpeed = 2.5;
let glassDecayTime = 600;
let steamRockSpreadLimit = 4;
let glassSpreadRate = 0.015;
let glassDecay = 0.003;
let lavaCoolTime = 1600;
let solidHeatGainFromLava = 0.12;
let solidHeatDecay = 0.002;
let solidHeatSpread = 0.12;
let boilHeatThreshold = 0.7;
let glassHeatThreshold = 0.5;
let smokeParticles = [];

function setup() {
  createCanvas(1000, 1000);
  document.oncontextmenu = () => false;

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

function keyPressed() {
  if (key === 'e' || key === 'E') {
    if (mode === "SAND") mode = "WATER";
    else if (mode === "WATER") mode = "ROCK";
    else if (mode === "ROCK") mode = "LAVA";
    else if (mode === "LAVA") mode = "ERASER";
    else mode = "SAND";
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
  smokeParticles.push({
    x: x * cellSize + cellSize / 2,
    y: y * cellSize + cellSize / 2,
    vy: random(0.2, 0.5),
    life: random(180, 300)
  });
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

          if (grid[x][y] !== null) continue;

          if (mode === "SAND") {
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
              b: random(200, 255)
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
        }
      }
    }
  } else {
    spawnTimer = spawnDelay;
  }

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

      else if (cell.type === "water") {
        let below = grid[x][y + 1];

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

      else if (cell.type === "lava") {
            let touchesWaterOrSand = false;
            let touchesOtherSolid = false;
        for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
             let n = grid[x + dx]?.[y + dy];
            if (n?.type === "water" || n?.type === "sand") touchesWaterOrSand = true;
            else if (n?.type === "rock" || n?.type === "basalt" || n?.type === "glass") touchesOtherSolid = true;
        }


if (touchesWaterOrSand) cell.coolTimer = 0;
else cell.coolTimer++;

if (cell.coolTimer >= lavaCoolTime) {
  grid[x][y] = { type: "basalt", r: random(30, 50), g: random(30, 50), b: random(35, 55), heat: 0.2 };
  processed[x][y] = true;
  continue;
}

        cell.moveTimer++;
        if (cell.moveTimer < 10) continue;
        cell.moveTimer = 0;
        cell.heatAge++;

        let below = grid[x][y + 1];
        if (!below) {
          cell.vy = min(cell.vy + lavaGravity, maxLavaFallSpeed);
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

        if (dirs.length) {
          let d = random(dirs);
          let newLava = { ...cell, coolTimer: cell.coolTimer };
          grid[x + d][y] = newLava;
          processed[x + d][y] = true;
          grid[x][y] = null;
          processed[x][y] = true;
        } else if (y > 0 && grid[x][y - 1] === null && random() < 0.2) {
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
      if (c.type === "rock" || c.type === "basalt" || c.type === "glass") {
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
        let h = c.heat || 0;
        fill(
          lerp(c.r, 255, h * 0.5),
          lerp(c.g, 140, h * 0.4),
          lerp(c.b, 80, h * 0.4)
        );
      } else if (c.type === "basalt") {
        let h = c.heat || 0;
        fill(
          lerp(c.r, 90, h * 0.6),
          lerp(c.g, 70, h * 0.5),
          lerp(c.b, 80, h * 0.4)
        );
      } else if (c.type === "lava") {
        fill(255, random(80, 120), 0);
      } else if (c.type === "glass") {
        let glassIntensity = c.glassiness || 0;
        fill(180 + glassIntensity * 30, 220, 255, 100 + glassIntensity * 55);
      }

      rect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    let s = smokeParticles[i];
    s.y -= s.vy;
    s.life--;
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
  text(`SIZE: ${brushSize}`, 6, 24);

  noFill();
  stroke(0);
  strokeWeight(2);
  rect(0, 0, width, height);
}

// LA-LA-LA LAVA CH-CH-CH-CH CHICKEN, STEVE'S LAVA CHICKEN YEAH IT'S TASTY AS HELL, OOO MAMACITA NOW YOU'RE RINGING THE BELL, CRISPY AND JUICY

// NOW YOU'RE HAVING A SNACK, OOOO SUPER SPICY IT'S A LAVA ATTACK
