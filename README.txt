Copyright (c) 2013 Matthias Graf
Licensed under the GPLv3.
This program is based on the LiverAnatomyExplorer by Steven Birr, forked in May 2013.

It adds the following collaboration tools to the LiverAnatomyExplorer: 3D-scene synchronisation, a chat and video conferencing.

See doc/ for more detailed information.

To run, first set this up on a webserver.
For the collaboration application to work, run the signalmaster as a node.js process:

cd js
node signalmaster.js
(The webserver and signalmaster may be different machines.)

Set the URL of the signalmaster in the following files:

js/x3domCollaborationApp.js
js/simplewebrtc.bundle.js

Open in your browser:
index.php?caseID=demoLiver

Other users join by simply loading the same page.
You can try this locally by opening multiple tabs.

