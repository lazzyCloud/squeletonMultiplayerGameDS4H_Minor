let username;
let conversation, data, datasend, users;

let artificialLatencyDelay=0;

let socket;

let nbUpdatesPerSeconds=2;
let requestList = [];

// on load of page
window.onload = init;

function init() {
  username = prompt("Quel est votre nom?");

  // initialize socket.io client-side
  socket = io.connect();

  // get handles on various GUI components
  conversation = document.querySelector("#conversation");
  data = document.querySelector("#data");
  datasend = document.querySelector("#datasend");
  users = document.querySelector("#users");

  // Listener for send button
  datasend.onclick = (evt) => {
    sendMessage();
  };

  // detect if enter key pressed in the input field
  data.onkeypress = (evt) => {
    // if pressed ENTER, then send
    if (evt.keyCode == 13) {
      this.blur();
      sendMessage();
    }
  };

  data.onblur = (event) => {
    console.log("Input field lost focus");
    canvas.focus(); // gives the focus to the canvas
  }

  // sends the chat message to the server
  function sendMessage() {
    let message = data.value;
    data.value = "";
    // tell server to execute 'sendchat' and send along one parameter
    socket.emit("sendchat", message);
  }
  // on connection to server, ask for user's name with an anonymous callback
  socket.on("connect", () => {
    clientStartTimeAtConnection = Date.now();

    // call the server-side function 'adduser' and send one parameter (value of prompt)
    socket.emit("adduser", username);
  });
  // update nbUpdatesPerSeconds
  socket.on("syncHeartbeat", (nbUpdatesPerSeconds) => {
    let spanNbUpdatesPerSecondsValue = document.querySelector("#nbUpdatesPerSeconds");
    spanNbUpdatesPerSecondsValue.innerHTML = nbUpdatesPerSeconds;
    document.getElementById("heartbeatRange").value = nbUpdatesPerSeconds;

  });
	setInterval(() => {
    let req = { 
      user: username, 
      status: allPlayers[username], 
      clientTime: Date.now()
    };
    requestList.push(req);
		send("updateClient", req);
	},1000/nbUpdatesPerSeconds);

  // listener, whenever the server emits 'updatechat', this updates the chat body
  socket.on("updatechat", (username, data) => {
    let chatMessage = "<b>" + username + ":</b> " + data + "<br>";
    conversation.innerHTML += chatMessage;
  });

  // just one player moved
  socket.on("updatepos", (username, newPos) => {
    updatePlayerNewPos(newPos);
  });
  function searchIndex(requestList, clientTime) {
    for (var i = 0; i < requestList.length; i++) {
      if (requestList[i].clientTime == clientTime) {
        return i; 
      }
    }
    return -1;
  }
  socket.on("heartbeat", (listOfplayers, listOfClientTime) => {
    updatePlayers(listOfplayers);
    //console.log(listOfClientTime);
    if (requestList.length > 0) {
      let idx = searchIndex(requestList, listOfClientTime[username]);
    
      if (idx == -1) {
        console.log("Sever replied a request not sent by this client");
      } else {
        if (idx !== 0) {
          console.log("Requests sent to server between timestamp ",  requestList[0].clientTime, " and timestamp ", requestList[idx].clientTime, " were lost. please have a check");
        }
        var currentX = listOfplayers[username].x;
        var currentY = listOfplayers[username].y;
        var prevTime = requestList[idx].clientTime;
        for (var i = idx + 1; i < requestList.length; i ++) {
          let tmp = requestList[i].clientTime - prevTime;
          prevTime = requestList[i];
          currentX += tmp/1000 * requestList[i].vx;
          currentY += tmp/1000 * requestList[i].vy;
        }
        listOfplayers[username].x = currentX;
        listOfplayers[username].y = currentY;
        requestList.splice(0, idx+1);
      }
    }


      
  

  });
  // listener, whenever the server emits 'updateusers', this updates the username list
  socket.on("updateusers", (listOfUsers) => {
    users.innerHTML = "";
    for (let name in listOfUsers) {
      let userLineOfHTML = "<div>" + name + "</div>";
      users.innerHTML += userLineOfHTML;
    }
  });

  // update the whole list of players, useful when a player
  // connects or disconnects, we must update the whole list
  socket.on("updatePlayers", (listOfplayers) => {
    updatePlayers(listOfplayers);
  });

  // Latency, ping etc.
  socket.on("ping", () => {
    send("pongo");
  });

  socket.on("data", (timestamp, rtt, serverTime) => {
    //console.log("rtt time received from server " + rtt);

    let spanRtt = document.querySelector("#rtt");
    spanRtt.innerHTML = rtt;

    let spanPing = document.querySelector("#ping");
    spanPing.innerHTML = (rtt/2).toFixed(1);

    let spanServerTime = document.querySelector("#serverTime");
    spanServerTime.innerHTML = (serverTime/1000).toFixed(2);

    let clientTime = Date.now() - clientStartTimeAtConnection;

    let spanClientTime = document.querySelector("#clientTime");
    spanClientTime.innerHTML = (serverTime/1000).toFixed(2);
  
  });

  // we start the Game
  startGame();
}

// PERMET D'ENVOYER SUR WEBSOCKET en simulant une latence (donnée par la valeur de delay)
function send(typeOfMessage, data) {
  setTimeout(() => {
      socket.emit(typeOfMessage, data)
  }, artificialLatencyDelay);
}

function changeArtificialLatency(value) {
  artificialLatencyDelay = parseInt(value);

  let spanDelayValue = document.querySelector("#delay");
  spanDelayValue.innerHTML = artificialLatencyDelay;
}

function changeNbUpdatesPerSeconds(value) {
  nbUpdatesPerSeconds = parseInt(value);

  let spanNbUpdatesPerSecondsValue = document.querySelector("#nbUpdatesPerSeconds");
  spanNbUpdatesPerSecondsValue.innerHTML = nbUpdatesPerSeconds;

  send("changeNbUpdates", nbUpdatesPerSeconds);
}

