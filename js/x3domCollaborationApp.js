function X3DOMCollaborationApp() {
    console.log("init X3DOMCollaborationApp")
    console.log(this)
	
//	var socket = io.connect('http://rbyte.no-ip.biz:3000')
	var socket = io.connect('http://localhost:3000')

	socket.on('connect', function () {
		x3domCollaborationApp.log("Client has connected to the server!")
	})
	
	socket.on('myMsg', function(data) {
//		console.log(data)
		var dataParsed = JSON.parse(data)
		switch (dataParsed[0]) {
			case "callOnRemote":
				// this is of course completely unsafe to do ... but its simple
				eval(dataParsed[1]+'.'+dataParsed[2]+'.apply('+dataParsed[1]+', dataParsed[3])')
				break
			case "text":
				console.log(dataParsed[1])
				break
			default:
				console.log("error. fell through.")
		}
	})
	
	this.callOnRemote = function(context, func, args) {
		socket.send(JSON.stringify(["callOnRemote", context, func, args]))
	}
	
	this.log = function(msg) {
		console.log(msg)
	}
	
	this.sendText = function(txt) {
		this.log("< " + txt)
		socket.send(JSON.stringify(["text", txt]))
	}
	
//	this.sendText("hard coded msg :)")
}
