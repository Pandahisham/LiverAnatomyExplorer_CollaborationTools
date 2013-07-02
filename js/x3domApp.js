var x3domApp; // Globale Referenz auf die X3DOMApp
/* ==================================
 * X3DOM WebApp
 * ==================================
 * 
 * Copyright (c) 2013 X3DOMApp | Steven Birr | http://www.steven-birr.de
 * This application is dual licensed under the MIT and GPL licenses (see license.txt)
 * GPL 3.0: http://www.opensource.org/licenses/gpl-3.0.html
 * MIT: http://www.opensource.org/licenses/mit-license.php
 * 
 * Datei: x3domApp.js
 * Version: 2.0.10
 * Letztes Update: 28.03.13
 * 
 * Changelog:
 * -----------------------------------
 * 2.0.10
 *  - Lizenzbedingungen hinzugefügt
 *  - Manuelle Checkbox kann nun einem bestimmten DIV zugeordnet werden
 *  - API-Option show3DOrientationHelper, um das Helper-Widget an/aus zu schalten
 * 2.0.9
 *  - Viewpoint-Animation für das 3D-Widget
 *  - Pulldownmenü für Standardsichtrichtungen (z.B. Sagittal)
 *  - Caching für Annotationen = false
 * 2.0.8.1 
 *  - Kleiner Bugfix und Performance-Update für den 3D-Tooltip
 * 2.0.8
 *  - HTML5 WebWorker: Laden der X3D-Datei im WebWorker-Prozess + Anzeige des Fortschritts in HTML5-Progressbar
 *  - X3D-Datei wird nun in PHP geparst und vorbereitet
 *  - Doku-Update
 * 2.0.7
 *  - Setzen des Rendermodus auf Basis eines "render"-Attributs
 * 2.0.6
 *  - Fixed 3DMouseOverListener bug (nur wenn Objekt tatsächlich gerendert wird)
 *  - Tooltip/Mouseover modi in UI
 *  - Background Gradient
 * 2.0.5
 *  - X3D-Knoten werden als Groups eingefügt (+ Abwärtskompatibilität für X3D-Dateien ohne Group-Knoten)
 *  - Checkboxes für X3D-Gruppen
 *  - CSS3-Transition-Effekt für Markierungsbox
 *  - Schöneres Annotation-Panel mit Buttons
 * 2.0.4
 *  - X3D-Knoten werden nun performanter in den DOM eingefügt
 *  - Diverse Bugfixes (3D-Tooltip, Crossbrowser-Konformität) und Doku
 * 2.0.3
 *  - Annotationen können per Klick an eine Struktur geheftet werden
 *  - Diverse Designänderungen
 * 2.0.2
 *  - Übergabeparameter für die X3DOMApp: X3D Filename
 * 2.0.1
 *  - Diverse Bugfixes für WebGL Showcase
 *  - Tooltips CSS-basiert
 * 2.0
 *  - Objektorientierte WebApp
 *  - Annotationsfunktionen (Kugeln, Pfeile)
 *  - JSON Import/Export der Annotationen
 * 1.0 
 *  - X3D/WebGL App
 */

function X3DOMApp()
{
    var self = this;
    
    this.worker = null;
    this.dir3Dfiles = "3d/";
    this.caseID = "";
    this.caseInfo = "";
    this.title = "";
    this.webGLsupported = null;
    this.initOK = false;
    
    // Speicher-Variablen
    this.x3dStructs = [];
    this.x3dGroups = [];
    this.x3dAnnotationObjects = [];

    // X3D-Ansicht-Optionen
    this.currentCanvas = null;
    this.initViewMats = {"main": null, "helper":null};
    
    // API 
    this.rotationAngleX = 0;
    this.rotationAngleY = 0;
    this.show3DWidget = true;
    this.show3DOrientationHelper = true;
    this.showOrientationModel1 = false;
    this.showOrientationModel2 = true;
    
    this.show3DTooltips = false;
    this.show3DMouseOver = false;
    this.highlightStructureIdOnMouseOver = false;

    // Annotations-Optionen
    this.annotationMode = false;
    this.myScene = null;
    this.bbox = null;
    this.runtime = false;    
    this.drag = false;
    this.w = 0;
    this.h = 0;
    this.uPlane = null;
    this.vPlane = null
    this.pPlane = null;
    this.isect = null;
    this.translationOffset = null;
    this.lastX = null;
    this.lastY = null;
    this.firstRay = null;
    this.buttonState = 0;
    this.currAnnObj = null;
    this.currAnnObjID = "";
    this.currAnnObjCounters = {sphereCounter: 1, arrowCounter: 1}; 
    this.currentMode = "exploration"; // 2 Modi: exploration & annotation
    this.lastAnnotationType = "Arrow";
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Initialisierung der X3DOMApp
     * Wenn kein <canvas>-Element geladen werden konnte, wird eine Fehlermeldung ausgegeben
     */
    this.initApp = function()
    {
        
        if (!self.checkWebGL('myCanvas'))
        {
            self.webGLsupported = false;
            self.showNoWebGLSupportMessage();
        }
        else
        {
            if (self.initOK)
            {
                self.webGLsupported = true;
                self.setWidgetEventHandler();
                self.loadX3D();
            }
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Check des Dateinamens
     */
    this.checkCase = function(filename)
    {
        if (typeof filename != "undefined")
        {
            self.caseID = filename;
            self.initOK = true;
            self.myX3Dfile = self.dir3Dfiles + "/" + self.caseID + ".x3d"; // Verzeichnis der X3D-Dateien
        }    
        else
            self.initOK = false;
        return self.initOK;
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Setzen des aktuellen Modus (Eploration oder Annotation)
     */
    this.setMode = function(mode)
    {
        self.currentMode = mode;
        if (self.currentMode == "annotation")
            self.runtime.getCanvas().style.cursor = "crosshair";
        else
            self.runtime.getCanvas().style.cursor = "pointer";
        self.highlightAnnotationLink(mode);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Der gerade aktivierte Modus wird im 3D-Interface hervorgehoben
     */
    this.highlightAnnotationLink = function(mode)
    {
        if (mode == "exploration")
        {
            $("#linkExplorationMode").removeClass("annotationLinkDeActivated").addClass("annotationLinkActivated");
            $("#linkSphere").removeClass("annotationLinkActivated");
            $("#linkArrow").removeClass("annotationLinkActivated");
        }
        else
        {
            // Kugelmodus
            if (self.lastAnnotationType == "Sphere")
            {
                $("#linkExplorationMode").removeClass("annotationLinkActivated");
                $("#linkArrow").removeClass("annotationLinkActivated");
                $("#linkSphere").removeClass("annotationLinkDeActivated").addClass("annotationLinkActivated");
            }
            // Pfeilmodus
            else
            {
                $("#linkExplorationMode").removeClass("annotationLinkActivated");
                $("#linkSphere").removeClass("annotationLinkActivated");
                $("#linkArrow").removeClass("annotationLinkDeActivated").addClass("annotationLinkActivated");
            }
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Ist der Annotationsmodus gerade aktiv?
     */
    this.isAnnotationModeActive = function()
    {
        if (self.currentMode == "annotation")
            return true;
        else return false;
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Ist der Explorationsmodus gerade aktiv?
     */
    this.isExplorationModeActive = function()
    {
        if (self.currentMode == "exploration") 
            return true;
        else return false;
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * AnnotationsModus soll aktiviert werden
     * @param annoType: "Sphere" | "Arrow"
     */
    this.setAnnotationMode = function(annoType)
    {
        self.lastAnnotationType = annoType;
        self.setMode("annotation");
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Check, ob der Browser WebGL unterstützt
     * @param canvas_element: ID des zu ladenden <canvas>
     */
    this.checkWebGL = function(canvas_element){
        var canvas = document.getElementById(canvas_element);
        var names = [ "webgl", "experimental-webgl", "moz-webgl", "webkit-3d" ];
        for (var i=0; i<names.length; i++)
        {
            try { 
                var gl = canvas.getContext(names[i]);
                if (gl) { return(names[i]); }
            } catch (e) { }
        }
        // Keine WebGL-Unterstützung
        return (false);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Fehlermeldung ausgeben, dass WebGL nicht unterstützt wird
     */
    this.showNoWebGLSupportMessage = function()
    {
        // Spezielle Meldung für IE-Nutzer
        if ($.browser.msie)
        {
            $("#IEoptions").show();
            $("#IE").show();    
        }
        else
        {
            $("#IE").hide();
            $("#notIE").show();
        }
        $("#splash").html($("#webglAlert").html());
        self.showLoadingMessage();
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Fehlermeldung ausgeben, dass X3D-Datei nicht geladen werden konnte
     */
    this.showLoadingErrorMessage = function()
    {
        self.showLoadingMessage();
        $("#splash").html($("#noCaseAlert").html());
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Öffnen eines Loading-Windows (Fancybox)
     */
    this.showLoadingMessage = function()
    {
        // Initialisierung der Fancybox-Message
        $("#show3DLoadingText").fancybox({
            'autoDimensions' : true,
            'hideOnContentClick': false
        });
        // Anzeigen der Fancybox-Message
        $("#show3DLoadingText").trigger('click');
    }

    /* ---------------------------------------------------------------------------------------------------------------
     * Initialisierung des Annotationsmodus
     */
    this.initAnnotationMode = function()
    {
        this.myScene = document.getElementById("main");
        this.runtime = this.myScene.runtime;
        
        this.myScene.addEventListener('mouseup', this.stop, false);
        this.myScene.addEventListener('mouseout', this.stop, false);
        this.myScene.addEventListener('mousemove', this.move, true);
        
        this.loadAnnotations(); // Laden der JSON-Annotationen
        self.bbox = self.runtime.getSceneBBox();
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Titel der Seite wird aktualisiert
     * @param title: Titel
     */
    this.setAppTitle = function(title)
    {
        self.title = title;
        $("#headlineLink").text(title);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Setzen der EventHandler für das 3D-Widget
     */
    this.setWidgetEventHandler = function()
    {
       // Alle Widget-Buttons hier aufzählen
       var widgetControls=["rotate-home", "rotate-left", "rotate-right", "rotate-down", "rotate-up", "zoom-in", "zoom-out"];
       // Alle Widget-Buttons iterieren und die Event-Handler festlegen
       $(widgetControls).each(function(i,value)
       {
          // Hover-Event: highlight-Class hinzufügen/löschen
          $("#" + value).hover(function(){
             $(this).toggleClass(value + "-highlight");
          });

          // Auf (mehrfachen) Klick auf einen Widget-Button reagieren (repeatedClick-jQuery-Plugin)
          $("#" + value).repeatedclick(function () {
             switch(value)
             {
                case "rotate-left":
					self.updateWidgetClickedState("panControls","widgetClickedLeft");
					self.rotateY(-45);
					x3domCollaborationApp.callOnRemote("x3domApp", "rotateY", [-45]);
					break;
                case "rotate-right":
					self.updateWidgetClickedState("panControls","widgetClickedRight");
					self.rotateY(45);
					x3domCollaborationApp.callOnRemote("x3domApp", "rotateY", [45]);
					break;
                case "rotate-up":
					self.updateWidgetClickedState("panControls","widgetClickedUp");
					self.rotateX(-45);
					x3domCollaborationApp.callOnRemote("x3domApp", "rotateX", [-45]);
					break;
                case "rotate-down":
					self.updateWidgetClickedState("panControls","widgetClickedDown");
					self.rotateX(45);
					x3domCollaborationApp.callOnRemote("x3domApp", "rotateX", [45]);
					break;
                case "rotate-home":
					self.updateWidgetClickedState("panControls","widgetClickedHome");
					break;
                case "zoom-in":
					self.updateWidgetClickedState("zoomControls","zoomControlsClicked");
					self.zoom(1);
					x3domCollaborationApp.callOnRemote("x3domApp", "zoom", [1]);
					break;
                case "zoom-out":
					self.updateWidgetClickedState("zoomControls","zoomControlsClicked");
					self.zoom(-1);
					x3domCollaborationApp.callOnRemote("x3domApp", "zoom", [-1]);
					break;
             }
          });
       });

       // ClickHandler für das Zurücksetzen der Szene
       $("#rotate-home").click(function(){
		  x3domCollaborationApp.callOnRemote("x3domApp", "resetViewpoint", ["main"]);
          self.resetViewpoint("main");
          if (self.show3DOrientationHelper) {
			x3domCollaborationApp.callOnRemote("x3domApp", "resetViewpoint", ["helper"]);
            self.resetViewpoint("helper");
		  }
       });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Update des Widget-Status (kurzes Verschieben des Widgets um ein Pixel um "haptisches Feedback" zu emulieren)
     * @param destControlPanel: Für welches Panel soll das Event ausgelöst werden
     * @param cssClass: Hinzufügen/Löschen der entsprechenden CSS-Klasse
     */
    this.updateWidgetClickedState = function(destControlPanel, cssClass)
    {
       $("#" + destControlPanel).addClass(cssClass);
       setTimeout(function()
       { 
          $("#" + destControlPanel).removeClass(cssClass);
       }, 100);
    }
    
   /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Zurücksetzen der 3D-Szene zum Ausgangs-Viewpoint (Die Szene wird dorthin animiert rotiert)
    * @param srcCanvas: Canvas, für das diese Aktion durchgeführt werden soll
    */
   this.resetViewpoint = function(srcCanvas)
   {
      var srcCanvasParent = document.getElementById("x3dom-" + srcCanvas + "-canvas").parent;
      var viewpoint = srcCanvasParent.doc._viewarea._scene.getViewpoint();
      srcCanvasParent.doc._viewarea.animateTo(self.initViewMats[srcCanvas],viewpoint); // Setze die initiale Sichtrichtung
      srcCanvasParent.doc.needRender = true; // Rendering update
   }

   /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Vergrößern/Verkleinern der 3D-Szene
    * @param zoomDelta: +1 = Hineinzoomen / -1 = Herauszoomen
    */
   this.zoom = function(zoomDelta)
   {
      var srcCanvas = "x3dom-main-canvas";
      var srcCanvasParent = document.getElementById(srcCanvas).parent; 
      var mat = srcCanvasParent.doc._viewarea._scene.getViewpoint().getViewMatrix();
      var zoomValue = 40; // Wert, um den gezoomt wird
      (zoomDelta >= 0) ? mat._23=mat._23+zoomValue : mat._23=mat._23-zoomValue; // Zoom hinein oder hinaus?
      srcCanvasParent.doc._viewarea._scene.getViewpoint().setView(mat); // die Rotationsmatrix übernehmen
      srcCanvasParent.doc.needRender = true; // Rendering update
   }
   
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Speichere die initiale ViewMatrix der 3D-Szene, um diese später zurücksetzen zu können
     * Hinweis: X3DOM hat Schwierigkeiten bei mehreren verwendeten Szenen, diese per $element.runtime.resetView(); korrekt zurückzusetzen
     * @param srcCanvas: Canvas, für das die ViewMatrix gespeichert werden soll
     */
    this.saveInitViewMatrix = function(srcCanvas)
    {
       var srcCanvasParent = document.getElementById("x3dom-" + srcCanvas + "-canvas").parent;
       var mat = srcCanvasParent.doc._viewarea._scene.getViewpoint().getViewMatrix();
       self.initViewMats[srcCanvas] = mat;
    }

    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Anzeige eines 2D-Tooltips mit dem Tooltip-Skript von Walter Zorn (http://www.walterzorn.de/tooltip/tooltip.htm)
     * --> Wird aktuell nicht mehr genutzt!
     * @param text: Anzuzeigender Text
     */
    this.show2DToolTip = function(text)
    {
        Tip(text);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Anzeige eines 3D-Tooltips
     * @param event: Das X3DOM-Mouseevent für die Mauskoordinaten
     * @param shapeID: Anzuzeigender Text (ID der Struktur)
     * @param color: Rahmenfarbe des Labels
     */
    this.show3DToolTip = function(event, shapeID, color)
    {
        //console.log(shapeID);
        var renderState = self.getX3DObject(shapeID).getAttribute("render"); // Get the render attribute value of the 3d object

        // Nur wenn Objekt sichtbar
        if (renderState)
        {
             $('#tooltip3D').remove();
             var newText = shapeID.replace(/_/g, " "); // Unterstrich in Text-Label ersetzen
             $('<div id="tooltip3D">' + newText + '</div>').appendTo('#mainScene');
             $('#tooltip3D').css({top: event.layerY + 20, left: event.layerX + 20, borderColor: self.rgbToHex(color)});   
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Verstecken des 3D-Tooltips
     */
    this.hide3DTooltip = function()
    {
        $('#tooltip3D').remove();
    }
        
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Anzeige eines 3D-Mouseover-Effektes (die emmissiveColor wird leicht angehoben)
     * @param shapeID: Für welches X3D-Objekt?
     */
    this.show3DMouseOverEffect = function(shapeID)
    {
        var my3dObj = self.getX3DObjectMaterialNode(shapeID);
        var transp = my3dObj.getAttribute("transparency"); // Get the Transparency value of the shape
        var color = my3dObj.getAttribute("diffuseColor"); // Get the DiffuseColor value of the shape
        
        my3dObj.setAttribute("emissiveColor", "0.2 0.2 0.2");
        if (self.highlightStructureIdOnMouseOver && transp < 1)
        {
            var label = $("#Check_" + shapeID + "_Label");
            label.removeClass("structureCheckboxLabel").addClass("structureCheckboxLabelHover");
            label.css("border-color", self.rgbToHex(color));
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Verstecken des 3D-Mouseover-Effektes
     * @param shapeID: Für welches X3D-Objekt?
     */
    this.hide3DMouseOverEffect = function(shapeID)
    {
        var my3dObj = self.getX3DObjectMaterialNode(shapeID);
        var transp = my3dObj.getAttribute("transparency"); // Get the Transparency value of the shape
        my3dObj.setAttribute("emissiveColor", "0");
        if (self.highlightStructureIdOnMouseOver && transp < 1)
        {
            $("#Check_" + shapeID + "_Label").removeClass("structureCheckboxLabelHover").addClass("structureCheckboxLabel");
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Einen RGB-String der Form "0.3 0.1 0.0" in einen Hex-Wert umwandeln
    * @param rgb: RGB-String
    * @return: Hex-Wert
    */
   this.rgbToHex = function(rgb)
   {
      var rgbValues = rgb.split(" ");
      return "#" + this.getHex(rgbValues[0]) + this.getHex(rgbValues[1]) + this.getHex(rgbValues[2]);
   }

   /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Eine Nummer der Form "0.3" in einen Hex-Wert umwandeln
    * @param n: Nummer
    * @return: Hex-Wert
    */
   this.getHex = function(n)
   {
      n = parseInt(n*255,10);
      if (isNaN(n)) return "00";
      n = Math.max(0,Math.min(n,255));
      return "0123456789ABCDEF".charAt((n-n%16)/16) + "0123456789ABCDEF".charAt(n%16);
   }

   /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Umwandeln eines Hex-Wertes in ein RGB-Tupel
    * @param hex: Hex-Wert
    * @return RGB-Objekt
    */
   this.hexToRgb = function(hex) {
     if (hex[0]=="#") hex=hex.substr(1);
     if (hex.length==3) {
       var temp=hex; hex='';
       temp = /^([a-f0-9])([a-f0-9])([a-f0-9])$/i.exec(temp).slice(1);
       for (var i=0;i<3;i++) hex+=temp[i]+temp[i];
     }
     var triplets = /^([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(hex).slice(1);
     return {
       red:   parseInt(triplets[0],16)/255,
       green: parseInt(triplets[1],16)/255,
       blue:  parseInt(triplets[2],16)/255
     }
   }
   
   /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Update der ViewMatrix des WebGL-Canvas
    * @param srcCanvas: Ausgangs-Canvas, von dem die ViewMatrix übernommen werden soll
    * @param targetCanvas: Ziel-Canvas, das die ViewMatrix übernehmen soll
    */
   this.updateCanvas = function(srcCanvas,targetCanvas)
   {
      var targetCanvasParent = document.getElementById("x3dom-" + targetCanvas + "-canvas").parent;
      var srcCanvasParent = document.getElementById("x3dom-" + srcCanvas + "-canvas").parent; 
      var mat = new x3dom.fields.SFMatrix4f();
      mat.setValues(srcCanvasParent.doc._viewarea._rotMat);
      mat._03 = mat._13 = mat._23 = mat._30 = mat._31 = mat._32 = 0;
      mat._33 = 1;
      targetCanvasParent.doc._viewarea._rotMat.setValues(mat);
      targetCanvasParent.doc.needRender = true;
   }

   /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Gradmaß in Bogenmaß umrechnen
    * @param deg: Winkel im Gradmaß (z.B. -90 für -90°)
    * @return Winkel im Bogemaß
    */
    this.getRadian = function(deg)
    {
       return (2 * Math.PI * deg) / 360;
    }
   
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Bogenmaß in Gradmaß umrechnen
     * @param rad: Winkel im Bogenmaß (z.B. 0.5)
     * @return Winkel im Gradmaß
     */
    this.getDegree = function(rad)
    {
       return (360 * rad) / (2 * Math.PI);
    }

    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Rotation der beiden 3D-Szenen (main und helper) um einen bestimmten Winkel um die X-Achse
     * @param alpha: Drehwinkel
     */
    this.rotateX = function(alpha)
    {
       this.rotate('x','main',this.getRadian(alpha));
       this.rotate('x','helper',this.getRadian(alpha));
    }

    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Rotation der beiden 3D-Szenen (main und helper) um einen bestimmten Winkel um die Y-Achse
     * @param alpha: Drehwinkel
     */
    this.rotateY = function(alpha)
    {
       this.rotate('y','main',this.getRadian(alpha));
       this.rotate('y','helper',this.getRadian(alpha));
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Rotation der 3D-Szene um einen bestimmten Winkel um die X- oder Y-Achse
     * @param axis: Drehachse (x oder y)
     * @param srcCanvas: Canvas, auf das die Viewport-Transformation angewendet werden soll
     * @param alpha: Drehwinkel
     * @param viewMat: optionaler Parameter, der eine initiale Sichtmatrix angibt
     */
    this.rotate = function(axis, srcCanvas, alpha, viewMat)
    {
       srcCanvas = "x3dom-" + srcCanvas + "-canvas";
       var srcCanvasParent = document.getElementById(srcCanvas).parent;
       var mat;
       if (typeof viewMat != "undefined")
           mat = viewMat;
       else
           mat = srcCanvasParent.doc._viewarea._scene.getViewpoint().getViewMatrix();
       var viewpoint = srcCanvasParent.doc._viewarea._scene.getViewpoint();
       var oldPosition = mat.e3();
       var center = viewpoint.getCenterOfRotation();
       var mx,my;
       if (axis == "x")
       {
          mx=x3dom.fields.SFMatrix4f.rotationX(alpha); 
          my=x3dom.fields.SFMatrix4f.rotationY(0);
       }
       else
       {
          mx=x3dom.fields.SFMatrix4f.rotationX(0); 
          my=x3dom.fields.SFMatrix4f.rotationY(alpha);
       }
       var rotMat=mat.mult(x3dom.fields.SFMatrix4f.translation(center)).mult(mat.inverse()).mult(mx).mult(my).mult(mat).mult(x3dom.fields.SFMatrix4f.translation(center.negate()));
       rotMat.setTranslate(oldPosition); // Zurück in den Ursprung verschieben
       srcCanvasParent.doc._viewarea.animateTo(rotMat, viewpoint); // die Rotationsmatrix übernehmen + Animation
       srcCanvasParent.doc.needRender = true; // Rendering update
    }
    
	this.setOrientationViewpoint = function(direction)
    {
		x3domCollaborationApp.callOnRemote("x3domApp", "setOrientationViewpointInner", [direction]);
		this.setOrientationViewpointInner(direction);
	}
	
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Rotation der 3D-Szene zu einer mediz. Standardsichtrichtung
     * @param direction: "Axial" | "Sagittal" | "Coronal"
     */
    this.setOrientationViewpointInner = function(direction)
    {	
       switch(direction)
       {
           case "Axial": 
               self.rotate('x','main',this.getRadian(-90), self.initViewMats["main"]);
               self.rotate('x','helper',this.getRadian(-90), self.initViewMats["helper"]);
           break;
           case "Sagittal": 
               self.rotate('y','main',this.getRadian(-90), self.initViewMats["main"]);
               self.rotate('y','helper',this.getRadian(-90), self.initViewMats["helper"]);
           break;
           case "Coronal": 
               self.resetViewpoint("main");
               self.resetViewpoint("helper");
           break;
       }
    }

    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Verändern der Default-X3DOM-Mouse-Events:
     * - linke Maustaste: Reibungskraft auf Rotation addieren (für leichtgängigere Rotation)
     * - mittlere und rechte Maustaste bei OrientationHelper deaktivieren
     * @param srcCanvas: Canvas, auf das die MouseDrag-Events angewendet werden sollen
     */
    this.setX3DOM_mouseDragEvents = function(srcCanvas)
    {
       var va = self.getVa(srcCanvas)

	   va.onDrag = function(x, y, buttonState) {
//		   x3domCollaborationApp.callOnRemote("x3domApp", "onDragInner", [x, y, buttonState, srcCanvas]);
//		   self.onDragInner(x, y, buttonState, srcCanvas, va)
			self.hide3DTooltip();
			var navi = va._scene.getNavigationInfo();
			if (navi._vf.type[0].length <= 1 || navi._vf.type[0].toLowerCase() === "none") {
				return;
			}
			var mouseForce = 0.6; // amount of effect the mouse dragging has on Camera movement.
			var dx = (x - (va._lastX)) * mouseForce;
			var dy = (y - (va._lastY)) * mouseForce;

			var min, max, ok, d, vec;
			var viewpoint = va._scene.getViewpoint();

			if (navi._vf.type[0].toLowerCase() === "examine")
			{
				if (buttonState & 1) // left mouse button ==> rotate scene
				{
					x3domCollaborationApp.callOnRemote("x3domApp", "rotateScene", [dx, dy, srcCanvas]);
					self.rotateScene(dx, dy, srcCanvas, va)
				}

				if (buttonState & 4) //middle mouse button ==> translate scene
				{
				   if (srcCanvas == "helper") return; // disable middle mouse button for orientation helper
					min = x3dom.fields.SFVec3f.MAX();
					max = x3dom.fields.SFVec3f.MIN();
					ok = va._scene.getVolume(min, max, true);

					d = ok ? (max.subtract(min)).length() : 10;
					d = (d < x3dom.fields.Eps) ? 1 : d;

					vec = new x3dom.fields.SFVec3f(d*dx/va._width,d*(-dy)/va._height,0);
					va._movement = va._movement.add(vec)
					var matrix = viewpoint.getViewMatrix().inverse().
						mult(x3dom.fields.SFMatrix4f.translation(va._movement)).
						mult(viewpoint.getViewMatrix())
					x3domCollaborationApp.callOnRemote("x3domApp", "translateScene", [matrix, srcCanvas]);
					self.translateScene(matrix, srcCanvas, va)
				}
				if (buttonState & 2) //right mouse button ==> zoom scene
				{
				   if (srcCanvas == "helper") return;  // disable right mouse button for orientation helper
					min = x3dom.fields.SFVec3f.MAX();
					max = x3dom.fields.SFVec3f.MIN();
					ok = va._scene.getVolume(min, max, true);

					d = ok ? (max.subtract(min)).length() : 10;
					d = (d < x3dom.fields.Eps) ? 1 : d;
					d=d*3.5; // Zoom-Beschleunigungwert
					vec = new x3dom.fields.SFVec3f(0,0,d*(dx+dy)/va._height);
					var zoomMatrix = viewpoint.getViewMatrix();
					zoomMatrix._23 = zoomMatrix._23+vec.z;
					x3domCollaborationApp.callOnRemote("x3domApp", "zoomScene", [zoomMatrix, srcCanvas]);
					self.zoomScene(zoomMatrix, srcCanvas, va)
				}
			}
			va._dx = dx;
			va._dy = dy;
			va._lastX = x;
			va._lastY = y;
		}
	}
	
	this.getVa = function(srcCanvas, va) {
		// remote calls have to first get va, since it cannot be transfered over the socket completely (too big)
		return va ? va : document.getElementById("x3dom-" + srcCanvas + "-canvas").parent.doc._viewarea
	}

	this.rotateScene = function(dx, dy, srcCanvas, va) {
		va = self.getVa(srcCanvas, va)
		
		var viewpoint = va._scene.getViewpoint();
		var alpha = (dy * 2 * Math.PI) / va._width;
		var beta = (dx * 2 * Math.PI) / va._height;

		var mx = x3dom.fields.SFMatrix4f.rotationX(alpha);
		var my = x3dom.fields.SFMatrix4f.rotationY(beta);

		var center = viewpoint.getCenterOfRotation();
		var vec = new x3dom.fields.SFVec3f(0,0,0)
		var translateMatrix = va.getViewMatrix();
		translateMatrix.setTranslate(vec);

		translateMatrix = va._rotMat.
			mult(x3dom.fields.SFMatrix4f.translation(center)).
			mult(translateMatrix.inverse()).
			mult(mx).mult(my).
			mult(translateMatrix).
			mult(x3dom.fields.SFMatrix4f.translation(center.negate()));
		
		va._rotMat = translateMatrix
		self.renderUpdate(srcCanvas)
	}
	
	this.translateScene = function(matrix, srcCanvas, va) {
		va = self.getVa(srcCanvas, va)
		va._transMat = matrix
		self.renderUpdate(srcCanvas)
	}
	
	this.zoomScene = function(matrix, srcCanvas, va) {
		va = self.getVa(srcCanvas, va)
		va._scene.getViewpoint().setView(matrix);
		self.renderUpdate(srcCanvas)
	}
	
	this.renderUpdate = function(srcCanvas) {
		document.getElementById("x3dom-" + srcCanvas + "-canvas").parent.doc.needRender = true;
	}

    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Ein Leerzeichen aus dem inputString durch einen Unterstrich ersetzen
     * @param inputString
     */
    this.escapeBlank = function(inputString)
    {
       if (inputString != undefined)
          return inputString.replace(/ /g, "_"); // Replace " " by "_""
       else
       {
          return "";
       }
    }

    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Einen Unterstrich aus dem inputString durch ein Leerzeichen ersetzen
     * @param inputString
     */
    this.escapeUnderscore = function(inputString)
    {
       if (inputString != undefined)
          return inputString.replace(/_/g, " "); // Replace "_" by " "
       else
       {
          return "";
       }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Schließen der Fancybox
    * --> Im Chrome funktioniert das automatische Schließen der Fancybox oft nicht,
    * daher werden die Fancybox-Elemente hier manuell geschlossen
    */
    this.closeFancyBox = function()
    {
        $.fancybox.close();
        /*
        $("#fancybox-wrap").hide();
        $("#fancybox-outer").hide();
        $("#fancybox-overlay").hide();
        $("#fancybox-content").hide();
        */
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * Das X3D Object für spätere Clickhandler-Zuweisungen in einem Array speichern
    * @param structID: Die ID des Objekts
    * @param renderState: Soll das aktuelle Objekt gerendert werden?
    * @param renderGroupFlag: Soll die Gruppe gerendert werden?
    * @param transp: Der Transparenzwert des Objekts
    * @param color: Der Farbwert des Objekts
    * @param groupID: Der ID des Parent-Group-Knoten
    */
    this.saveTempX3DObj = function(structID, renderState, renderGroupFlag, transp, color, groupID)
    {
       // Nur wenn es eine ID gibt und es sich nicht um das OrientationModel handelt...
       if (structID != undefined && structID != "orientationModel")
       {
          // Wenn kein Transparenzknoten da war: Nimm Defaultwert 0.0
          if (transp == undefined)
             transp = "0.0";
          var x3dObj = new X3DIndexedTriangleSetObject(structID, renderState, renderGroupFlag, transp, color, groupID);
          self.x3dStructs.push(x3dObj); // Speichern der Daten
          self.saveGroupID(groupID); // Die Group-ID wird nochmal gesondert gespeichert
       }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
       Speichern alle Gruppen-IDs in einem Array, wenn sie nicht schon gespeichert wurden
       @param groupID: Der ID des Parent-Group-Knoten
     */
    this.saveGroupID = function(groupID)
    {
        var groupExists = false;
        $.each(self.x3dGroups, function(i,id){
          if (id == groupID)
          {
              groupExists = true;
              return false;
          }
        });
        if (!groupExists)
            self.x3dGroups.push(groupID);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Jede X3D-Group bekommt eine Default-Checkbox
     *  - Setzen einer Checkbox für jeden Children-Transform-Knoten dieser Group
     *  - Setzen eines Clickhandlers für jeden Children-Transform-Knoten
     *  - Wenn die Group-Checkbox geklickt wird, werden alle Children-Checkboxes upgedatet
     *    und die 3D-Objekte ein-/ausgeblendet
     *  - Das show-Flag (show="true/false") jeder Group wird genommen, um alle Checkboxes dieser Group
     *    zu (de-)aktivieren
     */
    this.setAllDefaultGroupCheckboxes = function()
    {
       var lastGroupID,currentGroupID;
       $.each(self.x3dStructs, function(i,x3dObj){
            currentGroupID = x3dObj.groupID;
            if (currentGroupID != lastGroupID)
            {
                lastGroupID = currentGroupID;
                self.setGroupCheckbox(x3dObj);
            }
            self.setDefaultCheckbox(x3dObj);
       });
       self.setAllDefaultClickHandler(); // Jede Default-Checkbox bekommt einen Clickhandler
       self.setAllDefaultGroupClickHandler(); // Jede Group-Checkbox bekommt einen Clickhandler
    }

    /* ---------------------------------------------------------------------------------------------------------------
     * Jede X3D-Teilstruktur bekommt eine Default-Checkbox
     * @param exceptions Array: Für welche Object-IDs soll keine (!) Checkbox ausgegeben werden 
     * --> diese werden stattdessen manuell vom User eingestellt
     */
    this.setAllDefaultCheckboxes = function(exceptions)
    {
       $.each(self.x3dStructs, function(i,x3dObj){
        // Wenn die aktuelle Objekt-ID nicht zu den Ausnahmen gehört, erstelle eine Checkbox
        if (!self.isExcepted(exceptions, x3dObj.id))
          self.setDefaultCheckbox(x3dObj);
       });
       self.setAllDefaultClickHandler();
    }

    /* ---------------------------------------------------------------------------------------------------------------
     * Jede X3D-Teilstruktur bekommt einen Default-Clickhandler
     * @param exceptions Array: Für welche Object-IDs soll kein (!) Clickhandler gesetzt werden 
     * --> diese werden stattdessen manuell vom User eingestellt
     */
    this.setAllDefaultClickHandler = function(exceptions)
    {
       $.each(self.x3dStructs, function(i,x3dObj){
          // Wenn die aktuelle Objekt-ID nicht zu den Ausnahmen gehört, setze einen Clickhandler
          if (!self.isExcepted(exceptions, x3dObj.id))
            self.setDefaultClickHandler(x3dObj);
       });
    }
    
     /* ---------------------------------------------------------------------------------------------------------------
     * Jede X3D-Teilstruktur bekommt einen Default-AnnotationClickhandler,
     * d.h. wenn bei aktiviertem Annotationsmodus dieses Objekt angelickt wird, 
     * wird das Annotationsobjekt (z.B. ein Pfeil) an der Klickposition eingefügt
     * @param exceptions Array: Für welche Object-IDs soll kein (!) Clickhandler gesetzt werden 
     * --> diese werden stattdessen manuell vom User eingestellt
     */
    this.setAllDefaultInteractiveAnnotationClickHandler = function(exceptions)
    {
       $.each(self.x3dStructs, function(i,x3dObj){
          // Wenn die aktuelle Objekt-ID nicht zu den Ausnahmen gehört, setze einen Mousedownlistener
          if (!self.isExcepted(exceptions, x3dObj.id))
            document.getElementById(x3dObj.id).addEventListener('mousedown', self.addMyAnnotationObject, false);
       });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Jede X3D-Teilstruktur bekommt einen Default-Mouseoverhandler
     */
    this.setAllDefault3DMouseOverHandler = function()
    {
        // Verhindert, dass ein 3D-Tooltip weiter angezeigt wird, selbst wenn man nicht mehr über der 3D-Szene ist
        document.getElementById("mainScene").onmouseout = function()
        {
            if (self.show3DTooltips)
                self.hide3DTooltip();
        };
       
        $.each(self.x3dStructs, function(i,x3dObj){
           self.setDefault3DMouseOverHandler(x3dObj);
        });
    }
    
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Wurde eine Ausnahme definiert, z.B. für eine Checkbox
     * @param exceptions Array: Welche Object-IDs sollen getestet werden?
     * @param idToCheck String: Welche aktuelle Object-ID sollen getestet werden?
     * @return boolean: Wurde für die zu testende ID eine Ausnahme definert
     */
    this.isExcepted = function(exceptions, idToCheck)
    {
        var except = false;
        if (typeof (exceptions) !== "undefined")
        {
              $.each(exceptions, function(i,exceptId){
                if (exceptId == idToCheck)
                {
                    except = true;
                    return false;
                }
            });
        }
        return except;
    }

    /* ---------------------------------------------------------------------------------------------------------------
     * Hole das in den DOM eingefügte X3D-Objekt
     * @param structID: X3D-Object-ID
     */
    this.getX3DObject = function(structID)
    {
        return document.getElementById(structID);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Hole den Material-Knoten des in den DOM eingefügten X3D-Objektes
     * @param structID: X3D-Object-ID
     */
    this.getX3DObjectMaterialNode = function(structID)
    {
        var my3dObj = $(self.getX3DObject(structID)).children().children().children();
        return my3dObj[0]; // return <Material> Knoten
    }
            
    /* ---------------------------------------------------------------------------------------------------------------
     * Eine X3D-Struktur (un-)sichtbar machen (Altes Verhalten) --> X3DOM-"transparency"-Attribut verändern
     * @param structID: X3D-Object-ID
     * @param transp: Transparenzwert der Struktur --> 1.0 = unsichtbar
     */
    this.setX3DObjectTransparency = function(structID, transp)
    {
        self.getX3DObjectMaterialNode(structID).setAttribute("transparency", transp);
    }

    /* ---------------------------------------------------------------------------------------------------------------
     * Eine X3D-Struktur (un-)sichtbar machen (Neues Verhalten) --> X3DOM-"render"-Attribut verändern
     * @param structID: X3D-Object-ID
     * @param renderState boolean: Struktur unsichtbar/sichtbar machen
     */
    this.setX3DObjectRenderState = function(structID, renderState)
    {
        self.getX3DObject(structID).setAttribute("render", renderState);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Ausgabe einer Checkbox
     * @param x3dObj: X3D-Object
     */
    this.setDefaultCheckbox = function(x3dObj)
    {
       var structID = x3dObj.id;
       var checkboxId = "Check_" + self.escapeBlank(structID);
       var checkboxLabel = self.escapeUnderscore(structID);
       
       // Soll die Checkbox aktiviert sein?
       var checked = "";
       if (x3dObj.render == "true")
           checked = "checked = 'checked'";
       
       var input = "<input type='checkbox' class='childCb " + x3dObj.groupID + "' " + checked + " id='" + checkboxId + "'" + "><label id='" + checkboxId + "_Label" + "' for='" + checkboxId + "'>" + checkboxLabel + "</label><br>";
       $(input).appendTo("#x3dObjects");
       return input;
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Ausgabe einer Checkbox
     * @param x3dObj: X3D-Object
     */
    this.setGroupCheckbox = function(x3dObj)
    {
       var groupID = x3dObj.groupID;
       var checkboxId = "CheckAll_" + self.escapeBlank(groupID);
       var checkboxLabel = self.escapeUnderscore(groupID);
       
       // Soll die Checkbox aktiviert sein?
       var checked = "";
       if (x3dObj.renderGroup == "true")
           checked = "checked = 'checked'";
       
       var input = "<input type='checkbox' class='groupCb' " + checked + " id='" + checkboxId + "'" + "><label id='" + checkboxId + "_Label" + "' for='" + checkboxId + "' class='groupCbLabel'>" + checkboxLabel + "</label><br>";
       $(input).appendTo("#x3dObjects");
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Default-Group-Klick-Handler
     * Bei Klick auf eine Group-Checkbox werden alle Children-Checkboxes upgedatet
     */
    this.setAllDefaultGroupClickHandler = function()
    {
       var groupCheckbox, childCheckboxes, showChildren;
       
       $.each(self.x3dGroups, function(i,grID)
       {
           groupCheckbox = $("#CheckAll_" + grID);
           $(groupCheckbox).click(function()
           {
              childCheckboxes = $("#x3dObjects ." + grID);   
              $(this).is(':checked') ? showChildren = true : showChildren = false;
              $(childCheckboxes).attr("checked", showChildren);
              
              // Zuerst wird die Gruppe auf den neuen Renderstatus gesetzt, danach alle Children
              self.getX3DObject(grID).setAttribute("render", showChildren);
              $(childCheckboxes).trigger("change"); // Change-Trigger und damit Update der Szene
           });
       });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Default-Klick-Handler
     * Bei Klick auf eine Checkbox wird ein 3D-Objekt über das render-Attribute ein-/ausgeblendet
     * @param x3dObj: X3D-Object
     */
    this.setDefaultClickHandler = function(x3dObj)
    {
       var renderState;
       var structID = self.escapeBlank(x3dObj.id);
       $("#Check_" + structID).change(function()
       {
          $(this).is(':checked') ? renderState = true : renderState = false;
          self.setX3DObjectRenderState(structID, renderState);
          /* Wenn der Renderstatus eines Childs true gesetzt wird, muss die ganze Gruppe auch gerendert werden,
           * damit das Objekt tatsächlich sichtbar wird */
          if (renderState)
              self.getX3DObject(x3dObj.groupID).setAttribute("render", renderState);
       });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Default-3D-MouseoverHandler
     * Wird die Maus über einem 3D-Objekt bewegt, wird ein MouseOverEffekt angezeigt
     * ACHTUNG: Dies wird nur für gerenderte Objekte gemacht, indem das "render"-Attribut
     * des Transform-Knoten genutzt wird --> nur so kann sichergestellt werden, dass der
     * MouseOverEffect auch für Objekte getriggert wird, die hinter (!) anderen Objekten liegen
     * @param x3dObj: X3D-Object
     */
    this.setDefault3DMouseOverHandler = function(x3dObj)
    {
        var structID = self.escapeBlank(x3dObj.id);
        var renderState = self.getX3DObject(structID).getAttribute("render");
        
        // Wenn Objekt nicht gerendert wird --> Entferne alle MouseListener
        if (!renderState)
        {
            document.getElementById(structID).onmousemove = null;
            document.getElementById(structID).onmouseover = null;
            document.getElementById(structID).onmouseout = null;
        }
        // Sonst, setze die entsprechenden MouseListener
        else
        {
            // Außer bei der äußeren umschließenden Leberoberfläche!
            if (structID != "Liver")
            {
                document.getElementById(structID).onmousemove = function(evt)
                {
                    if (self.show3DTooltips)
                        self.show3DToolTip(evt, x3dObj.id, x3dObj.color);
                };

                document.getElementById(structID).onmouseover = function()
                {
                    if (self.show3DMouseOver)
                    {
                        self.show3DMouseOverEffect(structID);
                    }       
                };

                document.getElementById(structID).onmouseout = function()
                {
                    if (self.show3DTooltips)
                        self.hide3DTooltip();
                    if (self.show3DMouseOver)
                        self.hide3DMouseOverEffect(structID);
                };
                
            }
        }
    }

    /* ---------------------------------------------------------------------------------------------------------------
     * Ausgabe einer Checkbox
     * @param checkboxID: ID der Checkbox
     * @param checkFlag: Flag der Checkbox, der angibt, ob die Checkbox checked/unchecked sein soll
     * @param disabledFlag: Flag der Checkbox, der angibt, ob die Checkbox disabled/enabled sein soll
     */
    this.setCheckbox = function(checkboxID, checkFlag, disabledFlag)
    {  
       var checkboxId = "CheckSpecial_" + self.escapeBlank(checkboxID);
       var checkboxLabel = checkboxID;
       var checked = "";
       var disabled = "";
       if (checkFlag)
          checked = " checked='checked' ";
       if (disabledFlag)
          disabled = " disabled='true' ";
       var input = "<input type='checkbox'" + checked + disabled + "id='" + checkboxId + "'" + ">";
       var label = "<label id='" + checkboxId + "_Label" + "' for='" + checkboxId + "'>" + checkboxLabel + "</label>";
       //$(input).appendTo("#x3dObjects");
       return {"checkbox" : $("#"+checkboxId), "checkboxAndLabel" : input+label};
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Ausgabe Textfelds für die Markierung/Annotation von 3D-Strukturen
     * @param annoObjType: Typ der Annotation (Sphere, Arrow)
     * @param text: Text, der in dem Textfeld angezeigt werden soll
     * @param borderColor: Rahmenfarbe = Farbe der X3D-Struktur
     */
    this.addTextfield = function(annoObjType, text, borderColor)
    {
        var obj = null;
        var label;
        
        if (annoObjType == "Sphere")
        {
            label = self.getWordTranslation(annoObjType) + self.currAnnObjCounters.sphereCounter;
            obj = annoObjType + self.currAnnObjCounters.sphereCounter;
        }
        else
        {
            label = self.getWordTranslation(annoObjType) + self.currAnnObjCounters.arrowCounter;
            obj = annoObjType + self.currAnnObjCounters.arrowCounter;
        }
           
        $($("#x3dAnnotationObjectPanelWrapper").clone().html()).appendTo("#annotations");
        var oldBgColor = $("#annotations #x3dAnnotationObjectPanel").css("background-color");
       
        $("#annotations #x3dAnnotationObjectPanel")
        .attr("id", "x3dAnnotationObjectPanel_" + obj)
        .css("border-color", self.rgbToHex(borderColor))
        .hover(
            function(){
                $(this).css("transition", "background-color 1s");
                $(this).css("background-color", self.rgbToHex(borderColor));
            },
            function(){
                $(this).css("background-color", oldBgColor);
            }
        )
        .attr("annoObjType", annoObjType)
        .find(".objectID").html(label);

        
        $("#annotations #x3dAnnotationObjectTextfield")
        .val(text)
        .attr("id", "x3dAnnotationObjectTextfield_" + obj);
        
        $("#annotations #x3dAnnotationObjectDeleteButton")
        .attr("id", "x3dAnnotationObjectDeleteButton_" + obj)
        .click(function() {
			self.x3dAnnotationObjectDeleteButtonFunction(obj)
			x3domCollaborationApp.callOnRemote("x3domApp", "x3dAnnotationObjectDeleteButtonFunction", [obj]);
		});
    }
	
	this.x3dAnnotationObjectDeleteButtonFunction = function(obj) {
		$("#" + obj).remove();
		$("#annotations #x3dAnnotationObjectPanel_" + obj).slideUp("normal", function() { $(this).remove(); } );
	}
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Laden von Annotationen (JSON-Dateien im Verzeichnis /annotations)
     */ 
    this.loadAnnotations = function()
    {
        $.ajax({
            type: "GET",
            url: "annotations/" + self.caseID + ".json",
            cache: false,
            async: true,
            dataType: "json",
            success: function(data)
            {   
                $(data).each(function(i,obj)
                {
                    // @TODO: Überarbeitung
                    if(typeof obj.caseInfo !== "undefined" || typeof obj.caseID !== "undefined")
                    {
                        if(typeof obj.caseInfo !== "undefined" && obj.caseInfo != "")
                        {
                            self.caseInfo = obj.caseInfo;
                            $("#caseInfo").val(self.caseInfo);
                        }
                        if (typeof obj.caseID !== "undefined")
                        {
                            self.caseID = obj.caseID;
                        }
                    }
                    else
                        self.addObject(obj.type, obj, true);
                });
                self.bbox = self.runtime.getSceneBBox();
            },
            error: function(err)
            {
                console.log("Fehler: JSON-Datei konnte nicht geladen werden.");
                console.log(err);
            }
        });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Zurückrechnen des Pfeil-Translationswertes
     */ 
    this.getObjectTranslation = function(type, transXYZ)
    {
        var originalTrans = x3dom.fields.SFVec3f.parse(transXYZ);
        // Wenn Array: Berechne den originalen Click-Punkt (offset!)
        if (type == "Arrow")
        {
            originalTrans.y + self.getArrowOffset();
        }
        return originalTrans;
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Speichern alle Annotationen in einem JSON-File
     */ 
    this.saveAnnotations = function()
    {
        var textpanels = $("#annotations .x3dAnnotationObjectPanel");
        var id, type, translation, scale, diffColor, transparency, info, jsonobj, allJsonObj, jsonString;
        allJsonObj = [];
        
        allJsonObj.push({"caseID" : this.caseID}); // Speichern der Fall-ID
        allJsonObj.push({"caseInfo" : $("#caseInfo").val()}); // Speichern der Textdaten
        
        $(textpanels).each(function(i,obj)
        {
            type = $(obj).attr("annoObjType");
            id = $(obj).attr("id").split("_");
            id = id[1];
            translation = self.getObjectTranslation(type, $("#"+id).attr("translation"));
            scale = $("#"+id).attr("scale");
            diffColor = $("#"+id + " Material").attr("diffuseColor");
            transparency = $("#"+id + " Material").attr("transparency");
            info = $("#x3dAnnotationObjectTextfield_" + id).val();
            jsonobj = new JSONAnnotationObject(type, id, translation, scale, diffColor, transparency, info);
            allJsonObj.push(jsonobj);
        });
        jsonString = JSON.stringify(allJsonObj);
        $.ajax({
           type: "POST",
           url: "save.php",
           data: {"annotationObjects":jsonString, "caseID":self.caseID},
           dataType: "json",
           success: function(data)
           {
                $("#saveResultInfo").show();
                $("#saveResultInfo").css("color", "#5b9e1d");
                $("#saveResultInfo").html("Vielen Dank! Ihre Markierungen wurden gespeichert.");
                $("#saveResultInfo").fadeOut(4500);
           },
           error: function()
           {
                $("#saveResultInfo").show();
                $("#saveResultInfo").css("color", "#b02e2e"); 
                $("#saveResultInfo").html("Es ist leider ein Fehler aufgetreten! Bitte versuchen Sie es sp&auml;ter noch einmal!");
           }
        });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Englisch->Deutsch-Übersetzung
     * @param wordToTranslate: Das zu übersetzende Wort
     * @TODO: Language-Files einbinden!
     */ 
    this.getWordTranslation = function(wordToTranslate)
    {
        switch (wordToTranslate)
        {
            case "Arrow" : return "Pfeil"; break;
            case "Sphere" : return "Kugel"; break;
            default : return "Dummy";
        }
    }
    
    /* -----------------------------------------------------------------------------------
     * Ein neues Annotationsobjekt hinzufügen
     */
    this.addObject = function(type, obj, loadMode)
    {   
        if (type == "Sphere")
            X3DSphere.prototype = new X3DObject();
        else
            X3DArrow.prototype = new X3DObject();
        
        var color, myObj;
        
        var scaleXYZ = {x:10,y:10,z:10};
        var transXYZ = {x:obj.translation.x,y:obj.translation.y,z:obj.translation.z}
        var id = type;
        var transp = 0;
        var infoText = "";
        
        // Annotationsobjekt wird aus der JSON-Datei geladen
        if (loadMode)
        {
            color = obj.diffuseColor;
            infoText = obj.info;
            transp = parseFloat(obj.transparency);
            scaleXYZ = x3dom.fields.SFVec3f.parse(obj.scale);
        }
        // Annotationsobjekt wurde interaktiv eingezeichnet
        else
        {
            color = self.getAnnoObjColor(type);
        }
        
        if (type == "Sphere")
            myObj = new X3DSphere(id, color, 0.2);
        else
            myObj = new X3DArrow(id, color, transp);
        
        myObj.setTransXYZ(transXYZ.x, transXYZ.y, transXYZ.z);
        myObj.setScaleXYZ(scaleXYZ.x, scaleXYZ.y, scaleXYZ.z);
        
        self.addTextfield(type, infoText, color);
        if (type == "Sphere")
            myObj.initThis();
        else
        {
            if (!loadMode)
                myObj.setTransXYZ(transXYZ.x, transXYZ.y-self.getArrowOffset(), transXYZ.z);
            myObj.initArrow();
        }
    }
    
    /* -----------------------------------------------------------------------------------
     * Default-Offset für das Pfeilobjekt
     */
    this.getArrowOffset = function()
    {
        var offset = 15;
        return offset;
    }
    
     /* -----------------------------------------------------------------------------------
      * Jedes neu hinzugefügte Annotationsobjekt bekommt eine neue Farbe 
      * @param annoObjType: "Sphere", "Arrow"
     */
    this.getAnnoObjColor = function(annoObjType)
    {
        var counter = 0;
        if (annoObjType == "Sphere")
            counter = self.currAnnObjCounters.sphereCounter;
        else
            counter = self.currAnnObjCounters.arrowCounter;
        var colors = {1:"#C90442", 2:"#FFBF00", 3:"#4F9E00", 4:"#009E9E", 5:"#8800BA", 6:"#FFC9BC", 7:"#1F497D", 8:"#131608", 9:"#E33A28", 10:"#499D85", 11:"#E5E5E5"};
        
        var color = null;
        
        if (counter <= 10)
            color = colors[counter];
        else
            color = colors[11];
        
        var rgb = self.hexToRgb(color);
        return rgb.red + " " + rgb.green + " " + rgb.blue;
    }
    
    /* -----------------------------------------------------------------------------------
     * Hole ein spezielles AnnotationObject anhand seiner ID
     * @param id: ID des AnnotationObjects
     */
    this.getX3DAnnotationObject = function(id)
    {
        var myObj;
        $(self.x3dAnnotationObjects).each(function(i, obj)
        {
            if (obj.id == id)
            {
                myObj = obj;
            }
        });
        return myObj;
    }
    
    /* -----------------------------------------------------------------------------------
     * Event, welches ausgelöst wird, wenn ein Annotationsobjekt das erste Mal eingefügt oder angeklickt wird
     * @param event: X3DOM-Event
     */
    this.start = function(event) 
    {
        // Solange wie das Objekt nicht verschoben wird...
        if (!self.drag)
        {
            self.currAnnObj = document.getElementById(event.target.id);
            self.currAnnObjID = event.target.id; // ID des aktuell angeklickten Annotations-Objektes

            //console.log(self.currAnnObjID);
            self.lastX = event.layerX;
            self.lastY = event.layerY;

            self.drag = true;
            self.runtime.noNav(); // disable navigation

            // calc view-aligned plane through original pick position
            self.isect = new x3dom.fields.SFVec3f(event.worldX, event.worldY, event.worldZ); // 3D-Clickposition in World-Koord. (z.B. x -60.06 y -0.45 z -20.09)
            self.calcViewPlane(self.isect);
            self.firstRay = self.runtime.getViewingRay(event.layerX, event.layerY);
            
            // to distinguish between parallel or orthogonal movement
            self.buttonState = event.button;
            var translation = self.currAnnObj.getAttribute("translation");
            self.translationOffset = x3dom.fields.SFVec3f.parse(translation);
            self.runtime.getCanvas().style.cursor = "move";
        }
    };
    
    /* -----------------------------------------------------------------------------------
     * Verschieben eines Annotation-Objektes in der Bildebene (XY: linke Maustaste) oder in der Z-Richtung (rechte Maustaste)
     * @param event: X3DOM-Event
     */
    this.move = function(event)
    {
        // Ist der Verschiebemodus aktiv?
        if (self.drag) 
        {
            var pos = self.runtime.mousePosition(event); // X,Y-Position auf der XY-Ebene
            var ray = self.runtime.getViewingRay(pos[0], pos[1]); // Line-Objekt, dass die Richtung des Sichtstrahls angibt
            
            var track = null;

            if (self.buttonState === 2) // rechter Mausbutton
                track = self.translateZ(self.firstRay, pos[1]);
            else
                track = self.translateXY(ray);
            
            // Translationswerte aktualisieren
            if (track)
                self.currAnnObj.setAttribute("translation", track.x + "," + track.y + "," + track.z);     

            self.lastX = pos[0];
            self.lastY = pos[1];
        }
    };

    /* ------------------------------------------------------------------------
     * Beenden des Verschiebemodus
     * @param event: X3DOM-Event
     */
    this.stop = function(event)
    {
        // Ist der Verschiebemodus aktiv?
        if (self.drag) 
        {
            self.lastX = event.layerX;
            self.lastY = event.layerY;
            self.isect = null;
            self.drag = false;
            self.runtime.examine(); // Navigation aktivieren
        }
    }
    
    /* ------------------------------------------------------------------------
     * Determinante einer Matrix zurückgeben
     * @param mat: Matrix
     */
    this.det = function(mat)
    {
        return mat[0][0]*mat[1][1]*mat[2][2] + mat[0][1]*mat[1][2]*mat[2][0] +
               mat[0][2]*mat[2][1]*mat[1][0] - mat[2][0]*mat[1][1]*mat[0][2] -
               mat[0][0]*mat[2][1]*mat[1][2] - mat[1][0]*mat[0][1]*mat[2][2] ;
    }
    
    /* ------------------------------------------------------------------------
     * Berechnung der Sichtebene
     * @param origin: 3D-Klickposition
     */
    this.calcViewPlane = function(origin) 
    {
        var ray = null;

        this.w = this.runtime.getWidth();
        this.h = this.runtime.getHeight();

        ray = this.runtime.getViewingRay(0, this.h-1);
        var r = ray.pos.add(ray.dir);   //bottom left of viewarea

        ray = this.runtime.getViewingRay(this.w-1, this.h-1);
        var s = ray.pos.add(ray.dir);   //bottom right of viewarea

        ray = this.runtime.getViewingRay(0, 0);
        var t = ray.pos.add(ray.dir);   //top left of viewarea

        this.uPlane = s.subtract(r).normalize();
        this.vPlane = t.subtract(r).normalize();

        if (arguments.length === 0)
            this.pPlane = r;
        else
            this.pPlane = x3dom.fields.SFVec3f.copy(origin);
    }
    
    /* ------------------------------------------------------------------------
     * Maximal mögliche Verschiebung eines Annotationsobjektes in XYZ
     */
    this.getMaxTranslation = function(track)
    {
        var delta = 100;
        if ((track.x >= this.bbox.min.x-delta && track.x <=this.bbox.max.x+delta) &&
            (track.y >= this.bbox.min.y-delta && track.y <=this.bbox.max.y+delta) &&
            (track.z >= this.bbox.min.z-delta && track.z <=this.bbox.max.z+delta))
            {
                return true;
            }
        return false;
    }
    
    /* ------------------------------------------------------------------------
     * X3DOM: Translation along plane parallel to viewing plane E:x=p+t*u+s*v
     */
    this.translateXY = function(l)
    {
        var track = null;
        var z = [], n = [];

        for (var i=0; i<3; i++) {
            z[i] = [];
            n[i] = [];

            z[i][0] = this.uPlane.at(i);
            n[i][0] = z[i][0];

            z[i][1] = this.vPlane.at(i);
            n[i][1] = z[i][1]

            z[i][2] = (l.pos.subtract(this.pPlane)).at(i);
            n[i][2] = -l.dir.at(i);
        }

        // get intersection line-plane with cramer's rule
        var s = this.det(n);

        if (s !== 0) {
            var t = this.det(z) / s;
            track = l.pos.addScaled(l.dir, t);
        }

        if (track) {
            if (this.isect) {
                // calc offset from first click position
                track = track.subtract(this.isect);
            } 
                track = track.add(this.translationOffset);
        }
        if (this.getMaxTranslation(track))
            return track;
    }
    
    /* ------------------------------------------------------------------------
     * X3DOM: Translation along picking ray
     */
    this.translateZ = function(l, currY)
    {
        var vol = this.bbox;
        var sign = (currY < this.lastY) ? 1 : -1;
        var fact = sign * (vol.max.subtract(vol.min)).length() / 100;
        if (this.getMaxTranslation(this.translationOffset.addScaled(l.dir, fact)))
        {
            this.translationOffset.setValues(this.translationOffset.addScaled(l.dir, fact));
        }
        return this.translationOffset;
    }
    
    /* ------------------------------------------------------------------------
     * MouseOverEvent für Annotationsobjekt
     */
    this.over = function(event)
    {
        if (!self.isAnnotationModeActive())
            self.runtime.getCanvas().style.cursor = "move";
        $("#x3dAnnotationObjectPanel_" + event.target.id).css("border-width", "3px");
    }
    
    /* ------------------------------------------------------------------------
     * MouseOutEvent für Annotationsobjekt
     */
    this.out = function(event)
    {
        if (!self.drag)
        {
            if (!self.isAnnotationModeActive())
                self.runtime.getCanvas().style.cursor = "pointer";
            $("#x3dAnnotationObjectPanel_" + event.target.id).css("border-width", "2px");
        }
    }
    
    /* ------------------------------------------------------------------------
     * Ein neues Annotationsobjekt hinzufügen
     * @param event: X3DOM-Event
     */
    this.addMyAnnotationObject = function(event)
    {
        // Wenn der Annotationsmodus aktiv ist...
        if (self.isAnnotationModeActive()) 
        {
            self.isect = new x3dom.fields.SFVec3f(event.worldX, event.worldY, event.worldZ); // 3D-Klickposition
            var center = {translation : {x:0,y:0,z:0}};
            center.translation.x = self.isect.x;
            center.translation.y = self.isect.y;
            center.translation.z = self.isect.z;
			x3domCollaborationApp.callOnRemote("x3domApp", "addObject", [self.lastAnnotationType, center, false]);
            self.addObject(self.lastAnnotationType, center, false);
            self.setMode("exploration"); // Explorationsmodus wieder aktivieren
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Laden des Orientierungsmodells als zweite X3DOM-Szene
     */ 
    this.loadHelperModel = function()
    {
        self.currentCanvas = "helper"; // Aktualisieren des aktuellen Canvas
        // Anpassen des X3D-Dateinamens, weil nun das Orientationmodell geladen wird
        if (self.showOrientationModel2)
           self.myX3Dfile = self.dir3Dfiles + "/orientationModel2.x3d";
        else
           self.myX3Dfile = self.dir3Dfiles + "/orientationModel1.x3d";
        self.initWebWorker();
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Laden der Hauptszene (per WebWorker wird die X3D-Datei vom Server geholt)
     */ 
    this.loadX3D = function()
    {
        this.x3dStructs = new Array(); // Ein leeres Array für die IDs der X3D-Elemente anlegen
        this.currentCanvas = "main";  // Aktualisieren des aktuellen Canvas

        self.showLoadingMessage(); // Lade-Window anzeigen
        self.initWebWorker(); // Initialisierung des WebWorker-Threads
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Stoppen des WebWorker-Threads
     */ 
    this.stopWorker = function()
    {
        self.worker.postMessage({'cmd': 'stop'});
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Initialisierung des WebWorkers
     */ 
    this.initWebWorker = function()
    {
        self.worker = new Worker("js/webWorker.js"); // WebWorker-Skript aufrufen
        var json, xml;
        
        // EventListener für den WebWorker
        self.worker.addEventListener('message', function(e)
        { 
            // Aktueller Lade-Fortschritt soll angezeigt werden...
            if (e.data.showProgress == "true")
            {
                self.showWebWorkerProgress(e.data.progress, e.data.end);
            }
            // Ein X3D-Transform-Knoten wurde geholt...
            else if (e.data.param == "getX3DTransformNode")
            {
                json = JSON.parse(e.data.response); // Parse den X3D-Code (JSON-Notation!)
                self.saveTempX3DObj(json.id, json.renderState, json.renderGroup, json.transp, json.color, json.groupID); // Speichere alle Szenendaten
                xml = self.str2xml(json.x3dNode); // Erzeuge aus dem XML-String ein DOM-Objekt
                document.getElementById(json.groupID).appendChild(xml.documentElement); // Hänge den X3D-Knoten in die entsprechende Group
            }
            // Die globalen Szeneneigenschaften wurden geholt...
            else if (e.data.param == "getGlobalSceneData")
            {
                json = JSON.parse(e.data.response);
                self.prepareGlobalSceneData(json["GlobalSceneInfo"]); // Viewpoints usw. einfügen
                self.prepareScenegraph(json["GroupData"]); // Für jede Group-ID einen Group-Knoten im DOM erzeugen
            }
            // Der Worker wurde beendet
            else if (e.data == "WORKER CLOSED")
            {
                self.initScene();
                if (self.currentCanvas == "main" && self.show3DOrientationHelper)
                    self.loadHelperModel(); // Starte einen neuen Worker, um auch das Orientierungsmodell zu laden
                else
                    self.loadingFinished(); // Lade finales Skript, nachdem alle X3D-Elemente geladen wurden
            }
            else
                console.log(e.data);
        }, false);
        
        self.worker.postMessage({'cmd': 'start', 'x3dFile' : self.myX3Dfile}); // Starte den WebWorker-Thread
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Vorbereitung der Szeneneigenschaften: Hänge Viewpoints, NavigationInfo und DirectionalLight in den DOM
     */ 
    this.prepareGlobalSceneData = function(sceneData)
    {
        var scene = document.getElementById(self.currentCanvas + "_scene");
        var xml;
        $.each(sceneData, function (i,elem)
        {
            xml = self.str2xml(elem);
            scene.appendChild(xml.documentElement);
        });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Vorbereitung des Szenengraphen: Erzeuge für jede Group-ID einen Group-Knoten im DOM
     */ 
    this.prepareScenegraph = function(groupData)
    {
        var groupNode, scene;
        scene = document.getElementById(self.currentCanvas + "_scene");
        $.each(groupData, function (i,group)
        {
            groupNode = document.createElement("Group");
            groupNode.setAttribute("id", group.id);
            groupNode.setAttribute("render", group.render);
            scene.appendChild(groupNode);   
        });
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Nachdem Main- und Helper-Szene geladen worden sind, werden beide in die richtige Position rotiert
     */ 
    this.initScene = function()
    {
        if (self.rotationAngleX != 0)
           rotate('x',self.currentCanvas, self.getRadian(self.rotationAngleX)); // Rotation der Szene um die X-Achse
        if (self.rotationAngleY != 0)
           rotate('y',self.currentCanvas, self.getRadian(self.rotationAngleY)); // Rotation der Szene um die Y-Achse
        self.saveInitViewMatrix(self.currentCanvas); // Speichern der initialen ViewMatrix nach der Rotation
        self.setX3DOM_mouseDragEvents(self.currentCanvas); // Update der Default-X3DOM-MouseDrag-Events
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Finales Skript nach dem Laden aller Szenenelemente
     */ 
    this.loadingFinished = function()
    {
        // Setzen der bilateralen Mousemove-Listener für die Main- und die Helper-Szene
        $("#x3dom-main-canvas").mousemove(function(){self.updateCanvas("main", "helper")});
        $("#x3dom-helper-canvas").mousemove(function(){self.updateCanvas("helper", "main")});
        $("#helperScene").show();

        // Mousewheel-Funktion über dem Canvas (Verhindert Side-Scrolling im Chrome)
        $('#mainScene').mousewheel(function(event, delta) {
            return false;
        });

        $('#controlsWrapper').show(); // UI anzeigen
        if (!self.showOrientationModel1 && !self.showOrientationModel2)
           $("#helperScene").hide(); // Helper anzeigen
        if (self.show3DWidget)
           $("#widget3D").show(); // 3D-Widget anzeigen
        
        // Wenn der Annotationsmodus aktiv ist, setze auch die ClickHandler für die AnnotationObjects
        if (self.annotationMode)
        {
            self.setAllDefaultInteractiveAnnotationClickHandler();
            self.initAnnotationMode();
        }
         // Das User Script (myScript.js) starten
        try
        {
            runMyScript();
        }
        catch(e){};
        self.closeFancyBox(); // Das Lade-Window schließen
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Wandelt einen XML-String in ein "richtiges" XML-Objekt um
     * var xmlDoc = str2xml("<root></root>"); // XML String --> XML Document
    */
    this.str2xml = function(strXML)
    {
        var doc;
        // Old Microsoft browsers
        if (window.ActiveXObject)
        {
            doc=new ActiveXObject("Microsoft.XMLDOM");
            doc.async="false";
            doc.loadXML(strXML);
        }
        // Mozilla, Firefox, Opera, etc.
        else
        {
            var parser=new DOMParser();
            doc=parser.parseFromString(strXML,"text/xml");
        }
        return doc; // doc.documentElement repräsentiert den Root-Knoten
    }
    
    /* ---------------------------------------------------------------------------------------------------------------
     * Ladefortschritt in HTML5-Progressbar anzeigen
     * @param progress: Aktueller Fortschritt
     * @param end: Ende
    */
    this.showWebWorkerProgress = function(progress, end)
    {   
        var value = parseInt(progress) / parseInt(end);
        $("#progressBar").val(value);
        $("#progressValue").html(Math.floor(value * 100));
    }

}


/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Zwischenspeicher-Objekt für X3D-Teilstrukturen
 * @param id: ID des Knotens
 * @param renderState: Soll der Knoten gerendert werden?
 * @param renderGroup: Soll der Group-Knoten gerendert werden?
 * @param transp: Transparenzwert des Knotens
 * @param color: Farbwert des Knotens
 * @param groupID: Group-ID
 */
function X3DIndexedTriangleSetObject(id, renderState, renderGroup,  transp, color, groupID)
{
   this.id = id;
   this.render = renderState;
   this.renderGroup = renderGroup;
   this.transparency = transp;
   this.color = color;
   this.groupID = groupID;
}
/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Annotationsobjekt: Kugel
 */
function X3DSphere(id, diffColor, transp)
{
    this.constructor(id, "Sphere", diffColor, transp);
}

/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Annotationsobjekt: Cylinder (als Teil des Pfeils)
 */
function X3DCylinder(id, diffColor, transp)
{
    this.constructor(id, "Cylinder", diffColor, transp);   
}

/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Annotationsobjekt: Kegel (als Teil des Pfeils)
 */
function X3DCone(id, diffColor, transp)
{
    this.constructor(id, "Cone", diffColor, transp);
}

/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Annotationsobjekt: Pfeil
 */
function X3DArrow(id, diffColor, transp)
{
    this.constructor(id, "Arrow", diffColor, transp);
    
    X3DCylinder.prototype = new X3DObject();
    var myCylinder = new X3DCylinder("ArrowCylinder", diffColor, transp);
    
    myCylinder.setTransXYZ(0, -25, 0);
    myCylinder.setScaleXYZ(8, 12, 8);
    myCylinder.setRadius(1);
    myCylinder.setHeight(2);
    myCylinder.init();

    X3DCone.prototype = new X3DObject();
    var myCone = new X3DCone("ArrowCone", diffColor, transp);
    myCone.setTransXYZ(0, 0, 0);
    myCone.setScaleXYZ(15, 15, 15);
    myCone.init();
    
    // Initialisierung des Pfeils
    this.initArrow = function()
    {
        this.init();
        var objectTransform = this.getOldX3DObjectTransform();

        objectTransform.appendChild(myCylinder.getOldX3DObjectTransform());
        objectTransform.appendChild(myCone.getOldX3DObjectTransform());

        this.addToDOM();
        this.addEventListener();
    }
}

/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Klasse für ein Annotationsobjekt
 */
function JSONAnnotationObject(type, id, trans, scale, diffColor, transp, info)
{
    this.type = type;
    this.id = id;
    this.translation = trans;
    this.scale = scale;
    this.diffuseColor = diffColor;
    this.transparency = transp;
    this.info = info;
}

/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Klasse für ein X3D-Objekt
 */
function X3DObject(id, type, diffuseColor, transparency)
{
    var self = this;
    var app = getX3DOMApp();
    
    this.id = id;
    this.type = type;
    this.transX = 0;
    this.transY = 0;
    this.transZ = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.scaleZ = 1;
    this.diffuseColor = diffuseColor;
    this.emissiveColor = "";
    this.transparency = transparency;
    this.radius = null;
    this.height = null;
   
    this.objectTransform = null;
    var objectMaterial = null;
   
    this.initThis = function()
    {
        this.init();
        this.addToDOM();
        this.addEventListener();
    }
    
    // GETTER 
    this.getTransXYZ = function(){return {"transX":this.transX,"transY":this.transY,"transZ":this.transZ}}
    this.getScaleXYZ = function(){return {"scaleX":this.scaleX,"scaleY":this.scaleY,"scaleZ":this.scaleZ}}
    this.getRadius = function(){return this.radius;}
    this.getHeight = function(){return this.height;}
    this.getOldX3DObjectTransform = function(){return this.objectTransform;}
   
    // SETTER
    this.setTransXYZ = function(transX, transY, transZ){this.transX = transX; this.transY = transY; this.transZ = transZ;}
    this.setScaleXYZ = function(scaleX, scaleY, scaleZ){this.scaleX = scaleX; this.scaleY = scaleY; this.scaleZ = scaleZ;}
    this.setRadius = function(radius){this.radius = radius;}
    this.setHeight = function(height){this.height = height;}
    
    // Aktualisieren der Farbe des Annotationsobjektes
    this.setDiffuseColor = function(diffColor)
    {
        self.diffuseColor = diffColor;
        // Hole jeden Material-Knoten und aktualisiere die Farbe
        var x3dfile_Material = $("#" + self.id).find("Material");
        $(x3dfile_Material).each(function(i, materialNode){
            materialNode.setAttribute("diffuseColor", self.diffuseColor);
        }); 
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Erhöhe den internen Counter für ein hinzugefügtes Annotationsobjekt
     */
    this.incObjectCounter = function()
    {
        switch (self.type)
        {
            case "Sphere":
                this.id = this.id + app.currAnnObjCounters.sphereCounter++; break;
            case "Arrow":
                this.id = this.id + app.currAnnObjCounters.arrowCounter++; break;
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Speichere das aktuelle Objekt in der Haupt-App
     */
    this.saveObjectRef = function()
    {
        app.x3dAnnotationObjects.push(this);
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Initialisierung eines Annotationsobjektes
     */
    this.init = function()
    {
        this.incObjectCounter();
         
        this.objectTransform = document.createElement('Transform');
        this.objectTransform.setAttribute("translation", this.transX + "," + this.transY + "," + this.transZ);
        this.objectTransform.setAttribute("id", this.id);
        
        if (this.type == "Arrow" || this.type == "Sphere")
        {
            this.saveObjectRef();
        }
        
        if (this.type != "Arrow")
        {
            var objectShape = document.createElement('Shape');   
            var objectAppearance = document.createElement('Appearance');
            objectMaterial = document.createElement('Material');
            var object = document.createElement(this.type);

            this.objectTransform.setAttribute("scale", this.scaleX +  "," + this.scaleY + "," + this.scaleZ);
            objectMaterial.setAttribute("diffuseColor", this.diffuseColor);
            objectMaterial.setAttribute("transparency", this.transparency);
            
            if (this.radius !== null)
                object.setAttribute("radius", this.radius);
            if (this.height !== null)
                object.setAttribute("height", this.height);

            objectAppearance.appendChild(objectMaterial);
            objectShape.appendChild(objectAppearance);
            objectShape.appendChild(object);
            this.objectTransform.appendChild(objectShape);
        }
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Annotationsobjekt in die Hauptszene hängen
     */
    this.addToDOM = function()
    {
        document.getElementById("main_scene").appendChild(this.objectTransform); // Transform-Knoten an <Scene> anhängen
    }
    
    /* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * Eventlistener für ein Annotationsobjekt definieren
     */
    this.addEventListener = function()
    {
        this.objectTransform.addEventListener('mousedown', app.start, false);
        this.objectTransform.addEventListener('mouseover', app.over, false);
        this.objectTransform.addEventListener('mouseout', app.out, false);
    }
}

/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * Aus einer anderen Datei die X3DOM-App aufrufen
 */
function getX3DOMApp()
{
    return x3domApp;
}