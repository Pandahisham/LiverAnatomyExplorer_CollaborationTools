/*global console*/
var yetify = require('yetify'),
    config = require('getconfig'),
    uuid = require('node-uuid'),
    io = require('socket.io').listen(config.server.port);

function describeRoom(name) {
    var clients = io.sockets.clients(name);
    var result = {
        clients: {}
    };
    clients.forEach(function (client) {
        result.clients[client.id] = client.resources;
    });
    return result;
}

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}

var allOpenSockets = new Array()

io.sockets.on('connection', function (client) {
	if (allOpenSockets.indexOf(client, 0) == -1) {
		console.log("Pushing client: " + client.id)
		allOpenSockets.push(client)
	}
	
	client.on('mySyncChannel', function (message) {
//		console.log("Got message from client: " + message)
		for (var i=0; i<allOpenSockets.length; i++)
			if (allOpenSockets[i] != client) // do not send back to self (no echo)
				allOpenSockets[i].emit('callFromRemote', message)
	})
	
	client.on('myTextChannel', function (message) {
		for (var i=0; i<allOpenSockets.length; i++)
			allOpenSockets[i].emit('myText', message)
	})
	
    client.resources = {
        screen: false,
        video: true,
        audio: false
    };

    // pass a message to another id
    client.on('message', function (details) {
        var otherClient = io.sockets.sockets[details.to];
        if (!otherClient) return;
        details.from = client.id;
        otherClient.emit('message', details);
    });

    client.on('shareScreen', function () {
        client.resources.screen = true;
    });

    client.on('unshareScreen', function (type) {
        client.resources.screen = false;
        if (client.room) removeFeed('screen');
    });

    client.on('join', join);

    function removeFeed(type) {
        io.sockets.in(client.room).emit('remove', {
            id: client.id,
            type: type
        });
    }

    function join(name, cb) {
        // sanity check
        if (typeof name !== 'string') return;
        // leave any existing rooms
        if (client.room) removeFeed();
        safeCb(cb)(null, describeRoom(name))
        client.join(name);
        client.room = name;
    }

    // we don't want to pass "leave" directly because the
    // event type string of "socket end" gets passed too.
    client.on('disconnect', function () {
		console.log("User disconnected: "+client.id)
		client.emit('myMsg', 'User disconnected')
		allOpenSockets.splice(allOpenSockets.indexOf(client, 0), 1)
		
        removeFeed();
    });
    client.on('leave', removeFeed);

    client.on('create', function (name, cb) {
        if (arguments.length == 2) {
            cb = (typeof cb == 'function') ? cb : function () {};
            name = name || uuid();
        } else {
            cb = name;
            name = uuid();
        }
        // check if exists
        if (io.sockets.clients(name).length) {
            safeCb(cb)('taken');
        } else {
            join(name);
            safeCb(cb)(null, name);
        }
    });
});

if (config.uid) process.setuid(config.uid);
console.log(yetify.logo() + ' -- signal master is running on port: ' + config.server.port);
