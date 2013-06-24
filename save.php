<?php
/* ==================================
 * X3DOM WebApp
 * ==================================
 * 
 * Copyright (c) 2013 X3DOMApp | Steven Birr | http://www.steven-birr.de
 * This application is dual licensed under the MIT and GPL licenses (see license.txt)
 * GPL 3.0: http://www.opensource.org/licenses/gpl-3.0.html
 * MIT: http://www.opensource.org/licenses/mit-license.php
 * 
 * Datei: save.php
 * 
 * Speichert entgegengenommene Annotationen im JSON-Format als .json-Datei im Verzeichnis /annotations/
 */
    
header('content-type: application/json; charset=ISO-8859-1'); // We use the JSON format, Umlauts accepted!
$json = $_POST["annotationObjects"];
// Escape alle Backslashes (ISG server!)
$json = preg_replace('/\\\"/',"\"", $_POST["annotationObjects"]);
$json = preg_replace("/\\\'/","'", $json);
// Escape Doppel-Backslashes (Line Breaks auf ISG server!)
$json = str_replace('\\\\n', '\\n', $json);

$caseID = htmlentities($_POST["caseID"]);

$fp = fopen('annotations/' . $caseID . '.json', 'w');
fwrite($fp, $json);
fclose($fp);
?>
