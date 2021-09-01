<?php
$record = intval($_GET['record']);
$event_id = intval($_GET['event_id']);
$instance = intval($_GET['instance']);
$module->downloadProceduresWorkbook($record, $event_id, $instance);
?>