/* ==================================
 * X3DOM WebApp
 * ==================================
 * 
 * Copyright (c) 2013 X3DOMApp | Steven Birr | http://www.steven-birr.de
 * This application is dual licensed under the MIT and GPL licenses (see license.txt)
 * GPL 3.0: http://www.opensource.org/licenses/gpl-3.0.html
 * MIT: http://www.opensource.org/licenses/mit-license.php
 * 
 * Datei: myScript.js
 * 
 * Das Skript, dass gestartet wird, sobald die HTML-Seite geladen ist.
 * Hier wird die X3DOMApp initialisiert und diverse Member-Eigenschaften (z.B. Tooltip-Darstellung) gesetzt.
 * Über API-Aufrufe können Funktionen der X3DOMApp gestartet werden.
 */

var x3domCollaborationApp; // Globale Referenz auf Matthias' zusätzliche Kollaborations-Funktionen

$(document).ready(function()
{
    //var filename = "x3dExport"; // manuelle Angabe des X3D Files    
    x3domApp = new X3DOMApp();
    try
    {
        // Ist ein gültiger Dateiname angegeben?
        if (x3domApp.checkCase(filename))
        {
            x3domApp.annotationMode = true; // Annotationsmodus an/aus
            x3domApp.show3DMouseOver = true; // Soll ein 3D-Mouseover-Effekt angezeigt werden?
            x3domApp.show3DTooltips = true; // Sollen 3D-Tooltips angezeigt werden?
            x3domApp.highlightStructureIdOnMouseOver = true; // Hervorhebung der Checkbox
            x3domApp.setAppTitle("WebGL AnnotationApp | Case: " + x3domApp.caseID); // Setzen des Titels
        }
    }
    // Es wurde ein ungültiger Dateiname angegeben
    catch(err)
    {
        x3domApp.showLoadingErrorMessage();
    }

});

/* ---------------------------------------------------------------------------------------------------------------
 * Initialisiere die X3DOMApp erst, wenn die Seite komplett fertig geladen ist
 */ 
$(window).load(function()
{  
    x3domApp.initApp();
});


/* ---------------------------------------------------------------------------------------------------------------
 * Manuelles Setzen von ClickHandlern für Checkboxes und Pulldowns
 */ 
function setMouseOverClickHandler()
{
    $("#Check_Tooltip").click(function()
    {
        if ($(this).is(":checked")){x3domApp.show3DTooltips = true;}else x3domApp.show3DTooltips = false;
    });
    $("#Check_MouseOver3D").click(function()
    {
        if ($(this).is(":checked")){x3domApp.show3DMouseOver = true;}else x3domApp.show3DMouseOver = false;
    });
    
    $("#Select_Viewpoint").click(function()
    {
        x3domApp.setOrientationViewpoint($(this).val());
    });
}

/* ---------------------------------------------------------------------------------------------------------------
 * Setzen eines ClickHandlers für das Tab-Menü
 */
function setTabMenuClickHandler()
{
    $("#structuresMenu a").click(function(evt)
    {
        evt.preventDefault();
        var targetID = evt.target.id;
        var nr = targetID.charAt(targetID.length-1);

        for (var i=1; i<=2; i++)
        {
            if (i != nr)
            {
                $("#naviLink" + i).removeClass("current");
                $("#structuresContentWrapper .content" + i).hide();
            }         
            else
            {
                $("#naviLink" + i).addClass("current");
                $("#structuresContentWrapper .content" + i).show();
            }
        }
    });
}

/* ---------------------------------------------------------------------------------------------------------------
 * Dies ist ein individuell anpassbares User-Skript (wird aufgerufen, nachdem (!) das Laden der X3D-Datei abgeschlossen ist)
 * Hier können individuelle API-Aufrufe vorgenommen werden
 */
function runMyScript()
{  
    // ===== Tab Menu =====
    setTabMenuClickHandler();
    setMouseOverClickHandler();
        
    // ===== MouseOverEffect =====
    x3domApp.setAllDefault3DMouseOverHandler();
    
    // ===== Checkboxes =====
    x3domApp.setAllDefaultGroupCheckboxes(); // Group-Checkbox + Child-Checkboxes + Clickhandler
    
    // Setzen aller Default Checkboxes + Clickhandler (ohne Group-Checkboxes); Ausnahmen als Parameter
    //x3domApp.setAllDefaultCheckboxes(["Tumor"]);
    
    x3domCollaborationApp = new X3DOMCollaborationApp();
    
}

/* ---------------------------------------------------------------------------------------------------------------
 * Manueller ClickHandler
 * Beispiel:
 * 
   var checkbox1 = x3domApp.setCheckbox("Tumor", true, false); // Checkbox für X3D-Element mit ID "Tumor", Checkbox aktiviert und nicht disabled
   setMyClickHandler(checkbox1.checkbox); // Setzen eines ClickHandlers für diese Checkbox
   $("#id-of-my-div").append(checkbox1.checkboxAndLabel); // Die Checkbox zu einem DOM-Element hinzufügen und anzeigen
 */
/*
function setMyClickHandler(checkboxDOM)
{
    // Wenn die Checkbox nachträglich hinzugefügt wurde ("live"), den Clickhandler setzen
    $(checkboxDOM).live("click",function()
    { 
        var transp;
        var renderState;
        if ($(this).is(':checked'))
        {
            transp = 0.6;
            renderState = true;
        }
        else
        {
            transp = 1.0;
            renderState = false;
        }
        x3domApp.setX3DObjectRenderState("Tumor", renderState);
        x3domApp.setX3DObjectTransparency("Tumor", transp);
   });
}
*/