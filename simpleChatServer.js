const express = require('express')
const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http);

let nbUpdatesPerSeconds = 2;

http.listen(8082, () => {
	console.log("Web server écoute sur http://localhost:8082");
})

// Indicate where static files are located. Without this, no external js file, no css...  
app.use(express.static(__dirname + '/public'));    


// routing
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// nom des joueurs connectés sur le chat
var playerNames = {};
var listOfPlayers = {};
var listOfClientTime = {};

io.on('connection', (socket) => {
	let emitStamp;
	let connectionStamp = Date.now();

	// read updateClient message 
	socket.on("updateClient",(data) => {
		listOfPlayers[data.user] = data.status
		//let elapsed = (Date.now() - data.clientTime)/1000
		//console.log(data.user)
		//console.log(elapsed)
		//listOfPlayers[data.user].x += elapsed * listOfPlayers[data.user].vx
		//listOfPlayers[data.user].y += elapsed * listOfPlayers[data.user].vy
		listOfClientTime[data.user] = data.clientTime
		//console.log(Date.now()-data.clientTime);
	});

	// send heartbeat message
	setInterval(() => {
		let timeNow = Date.now();
		for (var u in listOfPlayers) {
			if (listOfClientTime[u] !== undefined) {
				let elapsed = (timeNow - listOfClientTime[u])/1000
				listOfPlayers[u].x += elapsed * listOfPlayers[u].vx
				listOfPlayers[u].y += elapsed * listOfPlayers[u].vy
				listOfPlayers[u].vx = 0
				listOfPlayers[u].vy = 0
			}

		}
		//console.log(1000/nbUpdatesPerSeconds);
		io.emit("heartbeat", listOfPlayers);
	},1000/nbUpdatesPerSeconds);

	socket.on("changeNbUpdates",(newNbUpdatesPerSeconds) => {
		nbUpdatesPerSeconds = newNbUpdatesPerSeconds
		io.emit('syncHeartbeat', nbUpdatesPerSeconds);
	}
	);
	socket.emit("syncHeartbeat", nbUpdatesPerSeconds);
	
	// Pour le ping/pong mesure de latence
	setInterval(() => {
        emitStamp = Date.now();
        socket.emit("ping");
    },500);

	socket.on("pongo", () => { // "pong" is a reserved event name
		let currentTime = Date.now();
		let timeElapsedSincePing = currentTime - emitStamp;
		let serverTimeElapsedSinceClientConnected = currentTime - connectionStamp;

		//console.log("pongo received, rtt time = " + timeElapsedSincePing);

		socket.emit("data", currentTime, timeElapsedSincePing, serverTimeElapsedSinceClientConnected);
	});

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', (data) => {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.emit('updatechat', socket.username, data);
	});

	// when the client emits 'sendchat', this listens and executes
	//socket.on('sendpos', (newPos) => {
		// we tell the client to execute 'updatepos' with 2 parameters
		//console.log("recu sendPos");
	//	socket.broadcast.emit('updatepos', socket.username, newPos);
	//});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', (username) => {
		// we store the username in the socket session for this client
		// the 'socket' variable is unique for each client connected,
		// so we can use it as a sort of HTTP session
		socket.username = username;
		// add the client's username to the global list
		// similar to usernames.michel = 'michel', usernames.toto = 'toto'
		playerNames[username] = username;
		// echo to the current client that he is connected
		socket.emit('updatechat', 'SERVER', 'you have connected');
		// echo to all client except current, that a new person has connected
		socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
		// tell all clients to update the list of users on the GUI
		io.emit('updateusers', playerNames);

		// Create a new player and store his position too... for that
		// we have an object that is a "list of players" in that form
		// listOfPlayer = {'michel':{'x':0, 'y':0, 'v':0}, 
		// 							john:{'x':10, 'y':10, 'v':0}}
		// for this example we have x, y and v for speed... ?
		var player = {x:50, y:50, vx:0, vy:0};
		listOfPlayers[username] = player;
		listOfClientTime[username] = undefined;
		io.emit('updatePlayers',listOfPlayers);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', () => {
		// remove the username from global usernames list
		delete playerNames[socket.username];
				// update list of users in chat, client-side
		io.emit('updateusers', playerNames);

		// Remove the player too
		delete listOfPlayers[socket.username];
		delete listOfClientTime[socket.username];		
		io.emit('updatePlayers',listOfPlayers);
		
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
	});
});