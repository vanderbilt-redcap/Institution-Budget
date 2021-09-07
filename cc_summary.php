<?php
// carl_log("cc_summary.php", true);
$cc_summary = $module->getCCSummaryData();
// carl_log("\$cc_summary: " . print_r($cc_summary, true));

echo $module->getCCSummaryHTML($cc_summary);

