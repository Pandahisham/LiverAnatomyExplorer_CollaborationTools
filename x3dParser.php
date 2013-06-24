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
 * Datei: x3dParser.php
 * 
 * Es wird eine X3D-Datei einmal (!) geparst und auf Anfrage vom WebWorker der entsprechende Transform-Knoten
 * zurückgegeben. Alle Transform-Knoten werden beim ersten Mal in der Session gespeichert, damit die X3D-Datei
 * nicht jedes mal neu geparst werden muss. Die X3D-Daten werden im JSON-Format an den WebWorker zurückgegeben.
 * 
 * @TODO: Auf XMLReader umprogrammieren (SimpleXML kann nur schlecht große XML-Dateien handlen)
 */
    
    if (empty($_REQUEST[session_id()])) {
        session_set_cookie_params('36000'); // Session Dauer: 10 Stunden
        session_start();
    }
    
    $xml = new X3DParser(htmlentities($_GET["cmd"]), htmlentities($_GET["x3dFile"])); // Erzeuge eine neue Parser-Instanz
   
    class X3DParser
    {
        private $x3d;                   // Die X3D-Struktur in SimpleXML-Notation
        private $cmd;                   // Das Kommando, dass ausgeführt werden soll (vom WebWorker)
        private $x3dFile;               // Die zu parsende X3D-Datei
        private $groupNodes;            // Group-Knoten
        private $x3dStructs = array();  // Zwischenspeicher für die Transform-Knoten
        private $groupIDs = array();    // Zwischenspeicher für die Group-IDs
        private $numGroupNodes = 0;     // Gesamtanzahl der Group-Knoten
        private $numTransformNodes = 0; // Gesamtanzahl der Transform-Knoten
      
        /* ---------------------------------------------------------------------------------------------------------------
         * Konstruktor: Initialisierung des X3DParsers
        */
        public function __construct($cmd, $x3dFile)
        {
            $this->cmd = $cmd;
            $this->x3dFile = $x3dFile;
            $this->init();
        }
      
        /* ---------------------------------------------------------------------------------------------------------------
         * Initialisierung: Weiterverarbeitung des Commands
        */
        private function init()
        {
            if (isset($this->cmd))
            {
                // Welcher Command soll ausgeführt werden?
                switch ($this->cmd)
                {
                    case "getX3DTransformNode":
                        echo $this->getX3DTransformNode(htmlentities($_GET["nodeNr"])); // Gib einen Transform-Knoten zurück
                    break;

                    case "getGlobalSceneData":
                        $this->parseX3D(); // Parse die X3D-Szene
                        echo $this->getGlobalSceneData(); // Gib allgemeine, wichtige Daten zurück (z.B. wieviel Knoten gibt es insgesamt?)
                    break;
                }
            }
        }
      
        /* ---------------------------------------------------------------------------------------------------------------
         * Vorbereitung der X3D-Struktur
         *  - Falls kein Gruppenknoten in der X3D-Datei zu finden ist, wird hier eine Default-Group angelegt
         *  - Alle Transform-Knoten werden in diesen Group-Knoten eingehängt
        */
        private function prepareX3D()
        {
            // Wenn keine Group-Knoten gefunden wurden...
            if (empty($this->x3d->Scene->Group))
            {
                $this->groupNodes = new MySimpleXMLElement("<Groups></Groups>");

                $newGroup = new MySimpleXMLElement("<Group></Group>");
                $newGroup->addAttribute("id", "Misc");
                $newGroup->addAttribute("render", "true");
                
                // Gehe jeden Transform-Knoten durch und hänge ihn an den Group-Knoten
                foreach ($this->x3d->Scene->Transform as $node)
                {
                    $newGroup->appendXML($node);
                }
                $this->groupNodes->appendXML($newGroup);
            }
            // Wenn es Gruppen-Knoten gibt, nutze diese normal weiter
            else
            {
                $this->groupNodes = $this->x3d->Scene->Group;
            }
        }
    
        /* ---------------------------------------------------------------------------------------------------------------
         * Parsen des X3D-Files per SimpleXML
        */
        private function parseX3D()
        {
            unset($_SESSION["x3dStructs"]); // Lösche die Session-Variable
            
            $this->x3d = simplexml_load_file($this->x3dFile); // Laden des X3D-Files
            $this->prepareX3D($this->x3d); // Vorbereitungen treffen (z.B. Default-Group-Knoten erzeugen)

            $structID = "";

            foreach ($this->groupNodes as $groupNode)
            {
                $this->numGroupNodes++;
                $groupID = str_replace(" ", "_", (string)$groupNode["id"]); // // Entferne evtl. Leerzeichen aus der ID
                $renderGroupFlag = (string)$groupNode["render"]; // Soll die Gruppe gerendert werden?
                
                // Wenn keine Group-ID gefunden wurde, vergebe eine Default-ID
                if (empty($groupID))
                    $groupID = "Group_" . $this->numGroupNodes;

                // Wenn das "render"-Flag nicht gefunden wurde, setze es per default auf true
                if (empty($renderGroupFlag))
                    $renderGroupFlag = "true";
                
                // Speichere alle unique Gruppen-IDs für später
                if (!in_array($groupID, $this->groupIDs))
                {
                    $data = array("id" => $groupID, "render" => $renderGroupFlag);
                    array_push($this->groupIDs, $data);
                }
                
                $groupNode["id"] = $groupID; // Aktualisiere die Transform-ID im SimpleXML
                $groupNode["render"] = $renderGroupFlag; // Aktualisiere das render-Flag im SimpleXML

                foreach ($groupNode->Transform as $transformNode)
                {
                    $this->numTransformNodes++;
                    $structID = str_replace(" ", "_", (string)$transformNode["id"]); // Entferne evtl. Leerzeichen aus der ID
                    // Wenn der Transform-Knoten keine ID hat, definiere eine ID
                    if (empty($structID))
                        $structID = "Object_" . $this->numTransformNodes;

                    $transformNode["id"] = $structID; // Aktualisiere die Transform-ID im SimpleXML
                    // Soll die aktuelle Struktur gerendert werden? Ist abhängig von dem Group-Render-Attribut
                    $renderFlag = $this->getInitRenderState($renderGroupFlag, (string)$transformNode["render"]);
                    $transformNode["render"] = $renderFlag; // Aktualisiere das render-Flag im SimpleXML

                    /* Hole die Transparenz- und Farbwerte und speichere sie zusammen mit den anderen
                     * Werten in einer temporären Struktur --> Diese Daten werden später vom WebWorker geholt und in
                     * in der X3DOMApp weiterverarbeitet
                     */
                    $transp = $transformNode->Shape->Appearance->Material["transparency"];
                    $color = $transformNode->Shape->Appearance->Material["diffuseColor"];
                    $x3dObj = new TempX3DObj((string)$structID,(string)$renderFlag,(string)$renderGroupFlag,(string)$transp,(string)$color,(string)$groupID,$transformNode->asXML());
                    $this->x3dStructs[$this->numTransformNodes-1] = $x3dObj;
                }
            }
            $_SESSION["x3dStructs"] = $this->x3dStructs; // Dauerhaftes Speichern des x3dStructs-Arrays in der Session
        }

        /* ---------------------------------------------------------------------------------------------------------------
         * Den initialen render-Status zurückgeben
         * Ein Child-Knoten einer Gruppe nimmt immer den Renderstatus seines Group-Knotens an
         * - außer wenn für das Child etwas anderes angegeben wurde
         * @param renderGroup: Soll die Gruppe gerendert werden?
         * @param renderChild: Soll die Struktur gerendert werden?
         */
        private function getInitRenderState($renderGroup, $renderChild)
        {
            $render = $renderGroup; // Child Renderstatus = Group-Renderstatus
            // Überschreibe den Child-Renderstatus, wenn er explizit angegeben wurde
            if (!empty($renderChild) && $renderChild != $renderGroup)
            {
                $render = $renderChild;
            }
            return $render;
        }

        /*
        private function xml2array ( $xmlObject, $out = array () )
        {
            foreach ( (array) $xmlObject as $index => $node )
                $out[$index] = ( is_object ( $node ) ||  is_array ( $node ) ) ? $this->xml2array ( $node ) : $node;
            return $out;
        }
         */
        
        /* ---------------------------------------------------------------------------------------------------------------
         * Gibt wichtige Szenen-Daten zurück an den WebWorker (z.B. Viewpoint-Knoten, Anzahl der Tranform-Knoten usw.)
        */
        private function getGlobalSceneData()
        {
            $sceneData = array();
            // Globale Szenen-Eigenschaften
            $sceneData["GlobalSceneInfo"][0]    = $this->x3d->Scene->Viewpoint->asXML();
            $sceneData["GlobalSceneInfo"][1]    = $this->x3d->Scene->NavigationInfo->asXML();
            $sceneData["GlobalSceneInfo"][2]    = $this->x3d->Scene->DirectionalLight->asXML();

            $sceneData["GroupData"]             = $this->groupIDs; // Alle IDs der Groups
            $sceneData["NumGroupNodes"]         = $this->numGroupNodes; // Anzahl der Group-Knoten
            $sceneData["NumTransformNodes"]     = $this->numTransformNodes; // Anzahl der Transform-Knoten
            return json_encode($sceneData);
        }
        
        /* ---------------------------------------------------------------------------------------------------------------
         * Gibt den Transform-Knoten als JSON aus dem Session-Array zurück
         * @param $nodeNum: Welcher Tranform-Knoten soll es sein (Index)?
        */
        private function getX3DTransformNode($nodeNum)
        {
            return json_encode($_SESSION["x3dStructs"][$nodeNum]);
        } 
   }
   
   /* ---------------------------------------------------------------------------------------------------------------
    * Temporäre Speicherklasse für einen X3D-Transform-Knoten
   */
   class TempX3DObj
   {
       public function __construct($id, $renderState, $renderGroup, $transp, $color, $groupID, $x3dNode)
       {
          $this->id = $id; // ID des Tranform-Knotens
          $this->renderState = $renderState; // Soll er gerendert werden?
          $this->renderGroup = $renderGroup; // Soll die Eltergruppe gerendert werden?
          $this->transp = $transp; // Transparenzwert
          $this->color = $color; // Farbwert
          $this->groupID = $groupID; // ID der Eltern-Gruppe
          $this->x3dNode = $x3dNode; // Tranform-Knoten-X3D-Daten in XML-Notation
       }
   }
  
   /* ---------------------------------------------------------------------------------------------------------------
    * Von SimpleXMLElement abgeleitete Klasse, bei der ganze XML-Knoten angehängt werden können
   */
   class MySimpleXMLElement extends SimpleXMLElement
   {
        /* ---------------------------------------------------------------------------------------------------------------
         * Fügt einen SimpleXMLElement Code in ein SimpleXMLElement (inkl. aller Kindknoten und Attribute)
         * @param SimpleXMLElement $append
         */
        public function appendXML($append)
        {
            if ($append) {
                if (strlen(trim((string) $append))==0) {
                    $xml = $this->addChild($append->getName());
                    foreach($append->children() as $child) {
                        $xml->appendXML($child);
                    }
                } else {
                    $xml = $this->addChild($append->getName(), (string) $append);
                }
                foreach($append->attributes() as $n => $v) {
                    $xml->addAttribute($n, $v);
                }
            }
        } 
   }
   
?>
