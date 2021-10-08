<?php
require_once APP_PATH_DOCROOT . 'ProjectGeneral/header.php';

echo("<pre>");
print_r($module->createSiteInstances('1'));
echo("</pre>");

require_once APP_PATH_DOCROOT . 'ProjectGeneral/footer.php';