<?php
if (empty($_REQUEST[session_id()])) {
    session_set_cookie_params('36000'); // Session Dauer: 10 hours
    session_start();
}
include_once 'x3dParser.php';
/* ==================================
 * X3DOM WebApp
 * ==================================
 * 
 * Copyright (c) 2013 X3DOMApp | Steven Birr | http://www.steven-birr.de
 * This application is dual licensed under the MIT and GPL licenses (see license.txt)
 * GPL 3.0: http://www.opensource.org/licenses/gpl-3.0.html
 * MIT: http://www.opensource.org/licenses/mit-license.php
 */
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
  "http://www.w3.org/TR/html4/loose.dtd">
<html>
   <head>
      <meta http-equiv='Content-Type' content='text/html;charset=utf-8'>
      <meta http-equiv="X-UA-Compatible" content="chrome=1">
      <link rel="stylesheet" type="text/css" href="style/style.css">
      <link rel="stylesheet" href="js/fancybox/jquery.fancybox-1.3.4.css" type="text/css" media="screen">
      <link rel="stylesheet" href="js/x3dom/1.5-dev/x3dom.css" type="text/css" media="screen">
      <link rel="stylesheet" href="style/ui-lightness/jquery-ui-1.10.3.custom.min.css" type="text/css">
      <script type="text/javascript" src="js/jquery-1.8.3.min.js"></script>
	  <script type="text/javascript" src="js/jquery-ui-1.10.3.custom.min.js"></script>
	  <script type="text/javascript" src="js/socket.io.js"></script>
	  <script type="text/javascript" src="js/simplewebrtc.bundle.js"></script>
	  <script type="text/javascript" src="js/webRTC.js"></script>
      <script type="text/javascript" src="js/x3dom/1.5-dev/x3dom.js"></script>
      <script type="text/javascript" src="js/fancybox/jquery.fancybox-1.3.4.pack.js"></script>
      <script type="text/javascript" src="js/jquery.repeatedclick.min.js"></script>
      <script type="text/javascript" src="js/jquery.mousewheel-3.0.6.min.js"></script>
      <script type="text/javascript" src="js/x3domApp.js"></script>
      <script type="text/javascript" src="js/x3domCollaborationApp.js"></script>
      <script type="text/javascript" src="js/myScript.js"></script>
	  <title>X3D/WebGL AnnotationApp</title>
   </head>
   <body>
   <noscript>
   <p id="jsError">
   This website uses JavaScript. Please activate JavaScript and try it again!<br>
   <span>
   Mozilla Firefox: Extras --> Einstellungen --> Inhalt --> JavaScript aktivieren<br>
   Microsoft Internet Explorer: Extras --> Internetoptionen --> Sicherheit --> Stufe anpassen --> Active Scripting aktivieren<br>
   </span>
   </p>
   </noscript>
   
   <canvas id="myCanvas"></canvas>
   <div id="webglAlert">
      <span class="error">Leider unterst&uuml;tzt Ihr Browser keine 3D-Visualisierungen auf Basis von WebGL!</span>
      <p id="IE">
      Sie nutzen den Internet Explorer und haben daher 2 M&ouml;glichkeiten:
      </p>
      <ol id="IEoptions">
         <li>Installieren Sie das Plugin <b><a href='http://www.google.com/chromeframe?hl=de&quickenable=true' target='blank'>ChromeFrame</a></b>.</li>
         <li>Oder nutzen Sie einen WebGL-f&auml;higen Browser, z.B. <b><a href='http://www.mozilla.org/de/firefox/fx/' target='_blank'>Mozilla Firefox</a></b> oder <b><a href='http://www.google.de/chrome/' target='_blank'>Google Chrome</a></b>!</li>
      </ol>
      <p id="notIE">
      Bitte nutzen Sie einen WebGL-f&auml;higen Browser, z.B. <b><a href='http://www.mozilla.org/de/firefox/fx/' target='_blank'>Mozilla Firefox</a></b> oder <b><a href='http://www.google.de/chrome/' target='_blank'>Google Chrome</a></b>!
      </p>
   </div>
   <div id="noCaseAlert">
       <p class="error">Fehler: Dieser Fall konnte nicht geladen werden!</p>
   </div>
   <?php           
        $paramCaseID = $_GET["caseID"];
        if (isset($paramCaseID)):
            $paramCaseID = htmlentities($paramCaseID);
            ?>
            <script type='text/javascript'>
                var filename = "<?php echo $paramCaseID;?>";
            </script>
            <?php
        endif;
    ?>
   
   <a id="headlineLink" href="index.php?caseID=<?php echo $paramCaseID;?>">WebGL AnnotationApp</a>
   <div id="intro">
       <p>
          <span class="number">(1)</span> Bitte markieren Sie unten in dem 3D-Modell die Stellen, an denen Gef&auml;&szlig;varianten auftreten. Klicken Sie daf&uuml;r entweder auf <strong>Kugel einf&uuml;gen</strong> oder auf <strong>Pfeil einf&uuml;gen</strong>. Anschlie&szlig;end k&ouml;nnen Sie das Objekt mit einem Klick an einem Gef&auml;&szlig; platzieren.
       </p>
       <p>
          <span class="number">(2)</span> Bitte schreiben Sie zu jeder Markierung einen kurzen <strong>Kommentar</strong>, um z.B. folgende Fragen zu beantworten: Um welche Gef&auml;&szlig;variante handelt es sich? Wo m&uuml;sste der Gef&auml;&szlig;ast eigentlich entspringen? Handelt es sich um eine seltene Variante? usw... <strong>Hinweis:</strong> &Ouml;ffnen Sie neben dem 3D-Modell den Tab "Leber", um Strukturen ein-/auszublenden oder den Tab "Kommentare", um markierte Stellen zu kommentieren.
       </p>
       <p>
          <span class="number">(3)</span> Klicken Sie bitte abschlie&szlig;end auf <strong>Markierungen speichern</strong>. Vielen Dank f&uuml;r Ihre Hilfe!
       </p>
        <div id="interactionHelp">
         <h3 class="controlsHeader">Kamerasteuerung</h3>
         <p style="float:left; margin-right: 30px">
            <img src="images/mouse-select-left-icon.png" alt="mouse-left" class="interactHelpIcon">
            <span class="interactionHelpText">Rotation</span>
         </p>
         <p style="float:left; margin-right: 40px">
            <img src="images/mouse-select-right-icon.png" alt="mouse-left" class="interactHelpIcon">
            <span class="interactionHelpText">Zoom</span>
         </p>
         <p style="float:left;">
            <img src="images/ctrl-key-icon.png" alt="crtl-key" class="interactHelpIcon keyIcon">
            <span id="plus">+</span>
            <img src="images/mouse-select-left-icon.png" alt="mouse-left" class="interactHelpIcon">
            <span class="interactionHelpText">Translation</span>
         </p>
         <div style="clear:left"></div>
         <h3 class="controlsHeader">Markierungsobjekt positionieren</h3>
         
            <p style="margin-right: 30px; margin-top: 20px; margin-bottom: 30px">
                <img src="images/mouse-select-left-icon.png" alt="mouse-left" class="interactHelpIcon">
                <span class="interactionHelpText">Markierung <strong>einf&uuml;gen</strong> (1x klicken)</span>
             </p>
            <p style="margin-right: 30px; margin-bottom: 30px">
                <img src="images/mouse-select-left-icon.png" alt="mouse-left" class="interactHelpIcon">
                <span class="interactionHelpText">Markierung in <strong>XY-Richtung verschieben</strong> (klicken und halten)</span>
             </p>
             <p style="margin-right: 40px; margin-bottom: 45px">
                <img src="images/mouse-select-right-icon.png" alt="mouse-left" class="interactHelpIcon">
                <span class="interactionHelpText">Markierung in <strong>Z-Richtung verschieben</strong> (klicken und halten)</span>
             </p>
            
        </div>
    <div>
        <h3 class="controlsHeader">Fallangaben | Fall-ID: <?php echo $paramCaseID;?></h3>
        <p id="textareaHint">Bitte &uuml;berpr&uuml;fen und ggf. Kommentare hinzuf&uuml;gen!</p>
        <textarea id="caseInfo" rows="10" cols="10" placeholder="Bitte hier einen Kommentar zu dem Fall eingeben..."></textarea>
    </div>
   </div>
   <div id="mainPanel">     
      <div id="mainScene">
         <x3d id='main' showStat='false' showLog='false' class="x3dBackground">
            <param name="disableDoubleClick" value="true" name="disableRightDrag" value="true">
            <scene id="main_scene">
            </scene>
         </x3d>
          
         <div id="widget3D">
            <div id="panControls" class="widgetControl">
               <div id="rotate-left" class="pointer horizontalPan rotate-left widgetControl"></div>
               <div id="rotate-right" class="pointer horizontalPan rotate-right widgetControl"></div>
               <div id="rotate-up" class="pointer verticalPan rotate-up widgetControl"></div>
               <div id="rotate-down" class="pointer verticalPan rotate-down widgetControl"></div>
               <div id="rotate-home" class="pointer tooltip2D rotate-home widgetControl"><span>View all</span></div>
            </div>
            <div id="zoomControls" class="widgetControl zoomControls">
               <div id="zoom-in" class="pointer zoom-in widgetControl"></div>
               <div id="zoom-out" class="pointer zoom-out widgetControl"></div>
            </div>
         <div id="helperScene">
             <x3d id='helper' showStat='false' showLog='false'>
               <param name="disableDoubleClick" value="true">
               <scene id="helper_scene">
               </scene>
             </x3d>
          </div>
         </div>
        <div id="annotationLinks">
            <!--
            <a href="#" class="annotationLink annotationLinkActivated" id="linkExplorationMode" onclick="getX3DOMApp().setMode('exploration'); return false;">Explorationsmodus</a>
            <a href="#" class="annotationLink annotationLinkDeActivated" id="linkSphere" onclick="getX3DOMApp().setAnnotationMode('Sphere'); return false;">Kugel einf&uuml;gen</a>
            <a href="#" class="annotationLink annotationLinkDeActivated" id="linkArrow" onclick="getX3DOMApp().setAnnotationMode('Arrow');return false;">Pfeil einf&uuml;gen</a>
            -->
            <a href="#" class="annotationLink annotationLinkActivated" id="linkExplorationMode" onclick="getX3DOMApp().setMode('exploration'); return false;">Exploration mode</a>
            <a href="#" class="annotationLink annotationLinkDeActivated" id="linkSphere" onclick="getX3DOMApp().setAnnotationMode('Sphere'); return false;">Add sphere</a>
            <a href="#" class="annotationLink annotationLinkDeActivated" id="linkArrow" onclick="getX3DOMApp().setAnnotationMode('Arrow');return false;">Add arrow</a>
         </div>
       </div>
  
       <div id='controlsWrapper'>

         <div id="structureControls">
             <ul id="structuresMenu">
                 <li><a id="naviLink1" class="current" href="#">Comments</a></li>
                 <li><a id="naviLink2" href="#">Liver</a></li>
             </ul>
             <div id="structuresContentWrapper">
                 <div id="annotations" class="content1"></div>
                 <div id="x3dObjects" class="content2"></div>
             </div>
         </div>
           <div id="interactionModes">
                <div id="interactionModesTooltipWrapper">
                    <input type="checkbox" checked="true" id="Check_Tooltip" ><label for="Check_Tooltip">Tooltip</label>
                    <strong id="viewpointLabel">Viewpoint:</strong>
                    <select id="Select_Viewpoint" size="1">
                        <option>Coronal</option>
                        <option>Sagittal</option>
                        <option>Axial</option>
                    </select>
                </div>
                <div id="interactionModesMouseOverWrapper">
                    <!--<input type="checkbox" checked="true" id="Check_MouseOver3D"><label for="Check_MouseOver3D">Mouseover</label><br>-->
                </div>
           </div>
         <div id="saveLoadControls">
             <!--<a href="#" class="button" id="saveButton" onclick="getX3DOMApp().saveAnnotations();return false;">Markierungen speichern</a>-->
             <a href="#" class="button" id="saveButton" onclick="getX3DOMApp().saveAnnotations();return false;">Save</a>
             <div id="saveResultInfo"></div>
         </div>
       </div>
      
       <a id="show3DLoadingText" href="#splash"></a>
       <div id="splashWrapper">
            <div id="splash">
              <!--<p id="loadingText">3D-Modell wird geladen.<br>Bitte haben Sie etwas Geduld...</p>-->
              <p id="loadingText">Loading 3D Model.<br>Please wait...</p>
              <progress value="0" id="progressBar"></progress>
              <span id="progressValue">0</span>&nbsp;%
            </div>
       </div>
           
       <div id="x3dAnnotationObjectPanelWrapper">
        <div id="x3dAnnotationObjectPanel" class="x3dAnnotationObjectPanel">
            <p class="objectID"></p>
            <!--<input id="x3dAnnotationObjectDeleteButton" class="x3dAnnotationObjectDeleteButton" type="button" value="L&ouml;schen">-->
            <input id="x3dAnnotationObjectDeleteButton" class="x3dAnnotationObjectDeleteButton" type="button" value="Delete">
            <textarea id="x3dAnnotationObjectTextfield" placeholder="Ihr Kommentar..." class="x3dAnnotationObjectTextfield" cols="15" rows="6"></textarea>
        </div>
       </div>
   </div>
   
	<div id="localVideoDialog" title="WebRTC-Local">
		<video id="localVideo"></video>
	</div>
	<div id="remotes" title="WebRTC-Remote"></div>
	
	<div id="chat" title="Chat">
		<input id="chatInput" type="text" size="1" maxlength="1000">
		<div id="chatMessages"></div>
	</div>
	
	
  </body>
</html>