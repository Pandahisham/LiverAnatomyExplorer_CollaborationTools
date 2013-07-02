// node.js server script for serving the websocket

var io = require('socket.io').listen(3000)
var allOpenSockets = new Array()

io.sockets.on('connection', function (socket) {
	
	if (allOpenSockets.indexOf(socket, 0) == -1) {
		console.log("Pushing client: " + socket.id)
		allOpenSockets.push(socket)
	}
	
	socket.on('message', function (message) {
		console.log("Got message from client: " + message)
		for (var i=0; i<allOpenSockets.length; i++)
			if (allOpenSockets[i] != socket) // do not send back to self (no echo)
				allOpenSockets[i].emit('myMsg', message)
//				allOpenSockets[i].emit('myMsg', socket.id + " wrote: " + message)
	})
	
	socket.on('disconnect', function () {
		console.log("User disconnected: "+socket.id)
		socket.emit('myMsg', 'User disconnected')
		allOpenSockets.splice(allOpenSockets.indexOf(socket, 0), 1)
	})
 
})
