// TODO moving/resizing the dialogs seems to stop the video
$(document).ready(function() {
	// TODO dialogs are not shown if the page is already scrolled down
	window.scrollTo(0, 0)
	
	$('#localVideoDialog').dialog({
		width: "25%",
		height: 250,
		dialogClass: "flora",
		position: { my: "left bottom", at: "left bottom", of: window }
	})
	$('#remotes').dialog({
		width: "25%",
		height: 250,
		dialogClass: "flora",
		position: { my: "right bottom", at: "right bottom", of: window }
	})
	$('#chat').dialog({
		width: "40%",
		height: 200,
		dialogClass: "flora",
		position: { my: "center bottom", at: "center bottom", of: window }
	})
	$('.flora.ui-dialog').css({position:"fixed"})
	
	$("#chatInput").keypress(function(event) {
		if (event.which == 13) { // enter
			x3domCollaborationApp.sendText($("#chatInput").val())
			$("#chatInput").val("")
		}
	})
})

// TODO does not work yet in chrome because chrome requires https for webrtc
// that is, encryption of the socket.io and the http
var webrtc = new SimpleWebRTC({
	// the id/element dom element that will hold "our" video
	localVideoEl: 'localVideo',
	// the id/element dom element that will hold remote videos
	remoteVideosEl: 'remotes',
	// immediately ask for camera access
	autoRequestMedia: true,
	log: true
})

// when it's ready, join if we got a room from the URL
webrtc.on('readyToCall', function () {
	webrtc.joinRoom("myCoolRoom")
})

$('body').addClass('active')
