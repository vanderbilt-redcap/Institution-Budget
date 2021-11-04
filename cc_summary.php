<?php
$record = $_GET['record_id'];
$event_id = $_GET['event_id'];
$cc_summary = $module->getCCSummaryData();
echo $module->getCCSummaryHTML($cc_summary);

