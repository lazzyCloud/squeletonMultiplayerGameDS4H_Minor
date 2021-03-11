let canvas, ctx, mousePos;

// Autres joueurs
let allPlayers = {};
let target = {x:150, y:200, radius:50, color:'yellow'};

let obstacles = [];

// for time based animation
// for time based animation
let delta, oldTime;
let playerSpeed = 100; // 100 pixels/s

function startGame() {
  console.log("init");
  canvas = document.querySelector("#myCanvas");
  ctx = canvas.getContext("2d");

  // Les écouteurs
  //canvas.addEventListener("mousedown", traiteMouseDown);
  //canvas.addEventListener("mousemove", traiteMouseMove);

  canvas.onkeydown = processKeydown;
  canvas.onkeyup = processKeyup;

  createObstacles();

  requestAnimationFrame(animationLoop);
}

function createObstacles() {
  let o1 = {x:50, y:50, width:20, height:100, color:"black", vy:50, range:110}
  let o2 = {x:150, y:50, width:20, height:50, color:"orange", vy:30, range:100}
  obstacles.push(o1);
  obstacles.push(o2);
}

function processKeydown(event) {
  event.preventDefault();
  event.stopPropagation(); // avoid scrolling with arri-ow keys

  switch (event.key) {
    case "ArrowRight":
      allPlayers[username].vx = playerSpeed;
      break;
    case "ArrowLeft":
      allPlayers[username].vx = -playerSpeed;
      break;
    case "ArrowUp":
      allPlayers[username].vy = -playerSpeed;
      break;
    case "ArrowDown":
      allPlayers[username].vy = playerSpeed;
      break;
  }

  //console.log('keydown key = ' + event.key);
}

function processKeyup(event) {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowLeft":
      allPlayers[username].vx = 0;
      break;
    case "ArrowUp":
    case "ArrowDown":
      allPlayers[username].vy = 0;
      break;
  }
}

function traiteMouseDown(evt) {
  console.log("mousedown");
}

function traiteMouseMove(evt) {
  console.log("mousemove");

  mousePos = getMousePos(canvas, evt);
  //console.log(mousePos.x + " " + mousePos.y);

  allPlayers[username].x = mousePos.x;
  allPlayers[username].y = mousePos.y;

  console.log("On envoie sendPos");
  let pos = { user: username, pos: mousePos };
  socket.emit("sendpos", pos);
}

function updatePlayerNewPos(newPos) {
  allPlayers[newPos.user].x = newPos.pos.x;
  allPlayers[newPos.user].y = newPos.pos.y;
}

// Mise à jour du tableau quand un joueur arrive
// ou se deconnecte
function updatePlayers(listOfPlayers) {
  allPlayers = listOfPlayers;
}

function drawPlayer(player) {
  ctx.save();

  ctx.translate(player.x, player.y);

  ctx.strokeStyle = "green";
  ctx.fillRect(0, 0, 10, 10);

  ctx.restore();
}

function drawAllPlayers() {
  for (let name in allPlayers) {
    drawPlayer(allPlayers[name]);
  }
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function moveCurrentPlayer() {
  if (allPlayers[username] !== undefined) {
    allPlayers[username].x += calcDistanceToMove(delta, allPlayers[username].vx);
    allPlayers[username].y += calcDistanceToMove(delta, allPlayers[username].vy);

    socket.emit("sendpos", { user: username, pos: allPlayers[username]});

  }
}

function drawTarget() {
  ctx.save();

  ctx.translate(target.x, target.y);

  // draws the target as a circle
  ctx.beginPath();
  ctx.fillStyle = target.color;
  ctx.arc(0, 0, target.radius, 0, Math.PI*2);
  ctx.fill();

  ctx.lineWidth=5;
  ctx.strokeStyle = "black";
  ctx.stroke();

  ctx.restore();
}

// Collisions between rectangle and circle
function circRectsOverlap(x0, y0, w0, h0, cx, cy, r) {
  var testX=cx; 
  var testY=cy; 
  
  if (testX < x0) testX=x0; 
  if (testX > (x0+w0)) testX=(x0+w0); 
  if (testY < y0) testY=y0; 
  if (testY > (y0+h0)) testY=(y0+h0); 

  return (((cx-testX)*(cx-testX)+(cy-testY)*(cy-testY))<r*r); 
}

function checkIfPlayerHitTarget(player) {
  if(player === undefined) return;

  if(circRectsOverlap(player.x, player.y, 10, 10, target.x, target.y, target.radius)) {
    console.log("COLLISION TARGET REACHED BY PLAYER");
    target.color = "red";
    player.x = 10;
    player.y = 10;
  } else {
    target.color = "yellow";
  }
}

function drawObstacles() {
  ctx.save();

  obstacles.forEach(o => {
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.width, o.height);

    o.y += calcDistanceToMove(delta,o.vy);

    if(o.y > 250) {
      console.log("y > 250 we reverse the speed");
      // we must put the obstacle back at contact point
      o.y = 249;
      o.vy = -o.vy;
    } 

    if(o.y <40) {
      o.y = 41;
      o.vy = -o.vy;
    }
  });

  ctx.restore();
}


// returns the time elapsed since last frame has been drawn, in seconds
function timer(currentTime) {
  var delta = currentTime - oldTime;
  oldTime = currentTime;
  return delta/1000;
}

function animationLoop(time) {
  if(!oldTime) {
    oldTime = time;
    requestAnimationFrame(animationLoop);
  }

  delta = timer(time); // delta is in seconds
  

  if (username != undefined) {
    // 1 On efface l'écran
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2 On dessine des objets
    drawAllPlayers();

    drawTarget();
    drawObstacles();

    moveCurrentPlayer();
    checkIfPlayerHitTarget(allPlayers[username]);

    //checkCollisionsPlayerWithObstacles()
  }

  // 3 On rappelle la fonction d'animation à 60 im/s
  requestAnimationFrame(animationLoop);
}

// Delta in seconds, speed in pixels/s
var calcDistanceToMove = function(delta, speed) {
  //console.log("#delta = " + delta + " speed = " + speed);
  return (speed * delta); 
};