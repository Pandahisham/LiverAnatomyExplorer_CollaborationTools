// TODO moving the dialogs seems to stop the video
// TODO dialogs are not shown if the page is already scrolled down
$(document).ready(function() {
  $('#localVideoDialog').dialog({
	  height: 250,
	  dialogClass: "flora",
	  position: { my: "left", at: "left", of: window }
  });
  $('#remotes').dialog({
	  height: 250,
	  dialogClass: "flora",
	  position: { my: "right", at: "right", of: window }
  });
  $('.flora.ui-dialog').css({position:"fixed"});
});

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
