/* ==================================
 * X3DOM WebApp
 * ==================================
 * 
 * Copyright (c) 2013 X3DOMApp | Steven Birr | http://www.steven-birr.de
 * This application is dual licensed under the MIT and GPL licenses (see license.txt)
 * GPL 3.0: http://www.opensource.org/licenses/gpl-3.0.html
 * MIT: http://www.opensource.org/licenses/mit-license.php
 * 
 * Datei: webWorker.js
 * 
 * Ein HTML5-WebWorker wird genutzt, um das ladeintensive Parsen der X3D-Datei in einen zweiten Thread auszulagern.
 * Der WebWorker nimmt Commands vom Hauptskript entgegen und leitet diese an den PHP-X3D-Parser weiter.
 * Dort wird die X3D-Datei geparst und Szeneneigenschaften an den WebWorker zurückdelegiert.
 * Der aktuelle Ladefortschritt wird über eine HTML5-Progressbar angezeigt.
 */

// Initialisiere neuen WebWorker
new WebWorker();

function WebWorker()
{
    // Members
    var worker = self;      // "self": Scope des HTML 5 WebWorker-Objekts
    var that = this;        // "that": Scope meiner WebWorker-Klasse (this/self verweisen hier sonst auf den WebWorker!)
    
    that.xmlHttp = null;
    that.x3dFile = "";      // Pfad und Dateiname der X3D-Datei werden per Command gesetzt
    that.parser = "../x3dParser.php"; // Pfad zum PHP-X3D-Parser
        
    /* ---------------------------------------------------------------------------------------------------------------
     * Event-Listener für den WebWorker
     *  - Es wird ein Command (cmd) erwartet; dieser wird an den PHP-X3D-Parser weitergeleitet und dort verarbeitet
     *  - Dazu wird ein XmlHttpRequest an PHP gesendet und das Ergebnis (JSON) entgegenommen
     *  - Das geparste Resultat wird dann an das Hauptskript zurückgeleitet, z.B. um den aktuellen Ladefortschritt anzuzeigen
     */
    worker.addEventListener('message', function(e)
    {
        var data = e.data;
        var numNodes = 0;
        // Welcher Command soll ausgeführt werden?
        switch (data.cmd)
        {
            case 'start':
                //worker.postMessage('WORKER STARTED');
                that.checkXMLHttpRequest(); // Cross-Browser-XMLHttpRequest
                
                that.x3dFile = data.x3dFile; // Pfad + Name der X3D-Datei
                var answer = that.sendXmlHttpRequest("cmd=getGlobalSceneData", "getGlobalSceneData"); // Sende den Request
                var json = JSON.parse(answer.response);
                numNodes = json["NumTransformNodes"]; // Wieviel zu ladende Transform-Knoten gibt es?
                
                // Sende einen neuen Request und hole nach und nach jeden Transform-Knoten
                // (Dieser wird dann im Hauptskript an die richtige Stelle im DOM eingefügt)
                for (var i=0; i<=numNodes-1;i++)
                {
                    // Rückgabe des aktuellen Fortschritts an das Hauptskript
                    worker.postMessage({"showProgress":"true", "progress":i+1, "end":numNodes});
                    that.sendXmlHttpRequest("cmd=getX3DTransformNode&nodeNr=" + i, "getX3DTransformNode");
                }
                // Wichtig: Über diese close-Message werden finalisierende Prozesse im Main-Thread ausgelöst
                worker.postMessage("WORKER CLOSED"); 
                worker.close(); // Terminiere den Worker
                break;
        };
    }, false);
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Sende einen Request mit plain-JavaScript an den PHP-X3D-Parser
     * @param cmd: Das Kommando, dass serverseitig ausgewertet werden soll
     * @param sendParamBack: Welche Daten werden an das Hauptskript zurückgeführt?
     * @return: JSON-Objekt mit dem Ergebnis des Requests
    */
    that.sendXmlHttpRequest = function(cmd, sendParamBack)
    {
        var returnObj = false;
        if (that.xmlHttp)
        {
            var param = that.parser + "?x3dFile=" + that.x3dFile + "&" + cmd; // PHP Parameter
            that.xmlHttp.open('GET', param, false);
            that.xmlHttp.onreadystatechange = function ()
            {
                // Wenn Request erfolgreich
                if (that.xmlHttp.readyState == 4)
                {
                    var obj = {"param" : sendParamBack, "response" : that.xmlHttp.responseText};
                    returnObj = obj; // Das intern zurückgegebene JSON-Objekt
                    worker.postMessage(obj); // Sende das JSON-Objekt an den Hauptthread zurück
                }
            };
            that.xmlHttp.send(null); // Sende den Request
        }
        return returnObj;
    }
    
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Cross-Browser-XMLHttpRequest
     */
    that.checkXMLHttpRequest = function()
    {
        try {
            // Mozilla, Opera, Safari and Internet Explorer (> v7)
            that.xmlHttp = new XMLHttpRequest();
        } catch(e) {
            try {
                // MS Internet Explorer (> v6)
                that.xmlHttp  = new ActiveXObject("Microsoft.XMLHTTP");
            } catch(e) {
                try {
                    // MS Internet Explorer (> v5)
                    that.xmlHttp  = new ActiveXObject("Msxml2.XMLHTTP");
                } catch(e) {
                    that.xmlHttp  = null;
                }
            }
        }
    }
    
}