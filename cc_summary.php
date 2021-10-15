<?php
$record = $_GET['record_id'];
$cc_summary = $module->getCCSummaryData();
echo $module->getCCSummaryHTML($cc_summary);

