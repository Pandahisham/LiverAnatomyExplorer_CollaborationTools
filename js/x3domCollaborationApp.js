function X3DOMCollaborationApp() {
    console.log("init X3DOMCollaborationApp")
    console.log(this)
	
//	var socket = io.connect('http://rbyte.no-ip.biz:3000')
	var socket = io.connect('http://localhost:3000')

	socket.on('connect', function () {
		x3domCollaborationApp.log("Client has connected to the server!")
	})
	
	socket.on('myMsg', function(data) {
		var dataParsed = JSON.parse(data)
		switch (dataParsed[0]) {
			case "callOnRemote":
				// this is of course completely unsafe to do ... but its simple
//				console.log("excuting: "+dataParsed[1]+'.'+dataParsed[2]+'.apply('+dataParsed[1]+', '+dataParsed[3]+')')
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
		var toBeSend = this.stringify(["callOnRemote", context, func, args])
//		console.log("sending: "+context+'.'+func+'.apply('+context+', '+args+')')
//		console.log("stringified: "+toBeSend)
		socket.send(toBeSend)
	}
	
	this.stringify = function(object) {
		var finished = false
		window.setTimeout(function () {
			if (!finished)
				console.log("stringifying failed!!!")
		}, 50)
		var toBeSend = JSON.stringify(object)
		finished = true
		return toBeSend
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
