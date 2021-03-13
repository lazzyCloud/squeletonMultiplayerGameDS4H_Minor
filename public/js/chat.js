let username;
let conversation, data, datasend, users;

let artificialLatencyDelay=0;

let socket;

// initialize number of updates per seconds to 10 (100 ms per heartbeat)
let nbUpdatesPerSeconds=10;
// initialize request list
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

  // if receive new nbUpdatesPerSeconds from serve, update local value
  socket.on("syncHeartbeat", (nbUpdatesPerSeconds) => {
    // update GUI value
    let spanNbUpdatesPerSecondsValue = document.querySelector("#nbUpdatesPerSeconds");
    spanNbUpdatesPerSecondsValue.innerHTML = nbUpdatesPerSeconds;
    document.getElementById("heartbeatRange").value = nbUpdatesPerSeconds;

  });
  // send updateClient message every 1000/nbUpdatesPerSeconds ms
	setInterval(() => {
    let t = Date.now()
    // send username, status (x, y, speed) and timestamp (also used as request id)
    let req = { 
      user: username, 
      status: allPlayers[username], 
      clientTime: t
    };
    // record this request in local list
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
      // if current timestamp greater than the one we want to search, directly break
      if (requestList[i].clientTime > clientTime) {
        break; 
      }
      if (requestList[i].clientTime == clientTime) {
        return i; 
      }
    }
    return -1;
  }

  // when client receive heartbeat message, reconciliate its position with the one calculated by server
  socket.on("heartbeat", (listOfplayers, listOfClientTime) => {
    // update other players position as received from server
    let tmpUser = allPlayers[username];
    allPlayers = listOfplayers;
    allPlayers[username] = tmpUser;

    // check if request list is empty, if its empty, means we receive unknown heartbeat, should throw error
    if (requestList.length > 0) {
      // check the index of this request in request list
      let idx = searchIndex(requestList, listOfClientTime[username]);
      
      if (idx == -1) {
        // if not find the request id (timestamp) in list, ignore message
      } else {
        if (idx !== 0) {
          // if the request is not the head of queue, means some replies from server were lost
          console.log("Requests sent to server between timestamp ",  requestList[0].clientTime, " and timestamp ", requestList[idx].clientTime, " were lost. please have a check");
        }
        // reconciliate client side position with server side position
        var currentX = listOfplayers[username].x;
        var currentY = listOfplayers[username].y;
        var prevTime = listOfClientTime[username];
        // calculate new positon by using request sent after this id
        for (var i = idx+1 ; i < requestList.length; i ++) {
          let tmp = requestList[i].clientTime - prevTime;
          prevTime = requestList[i].clientTime;
          currentX += tmp/1000 * requestList[i-1].status.vx;
          currentY += tmp/1000 * requestList[i-1].status.vy;

        }
        // update client position
        if (!isNaN(currentX) && !isNaN(currentY)) {
          allPlayers[username].x = currentX;
          allPlayers[username].y = currentY;
          //console.log(requestList[i-1].status.vx);
          //console.log(requestList[i-1].status.vy);
        }
        requestList = requestList.splice(idx+1);
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

// parse GUI nbUpdatesPerSeconds change to backend, and send message to server to inform this change
function changeNbUpdatesPerSeconds(value) {
  nbUpdatesPerSeconds = parseInt(value);

  let spanNbUpdatesPerSecondsValue = document.querySelector("#nbUpdatesPerSeconds");
  spanNbUpdatesPerSecondsValue.innerHTML = nbUpdatesPerSeconds;

  send("changeNbUpdates", nbUpdatesPerSeconds);
}

