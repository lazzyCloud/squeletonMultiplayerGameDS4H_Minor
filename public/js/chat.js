let username;
let conversation, data, datasend, users;

let socket;

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
    // call the server-side function 'adduser' and send one parameter (value of prompt)
    socket.emit("adduser", username);
  });

  // listener, whenever the server emits 'updatechat', this updates the chat body
  socket.on("updatechat", (username, data) => {
    let chatMessage = "<b>" + username + ":</b> " + data + "<br>";
    conversation.innerHTML += chatMessage;
  });

  // just one player moved
  socket.on("updatepos", (username, newPos) => {
    updatePlayerNewPos(newPos);
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

  // we start the Game
  startGame();
}
