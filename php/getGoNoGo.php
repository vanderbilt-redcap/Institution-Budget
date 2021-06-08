<?php
/*
	output go/no-go table
	
	expects $schedule_of_event_json to contain schedule json
*/

global $record;
$schedule_of_event_json = json_encode($module->getBudgetTableData($record));
$gonogo_table_data = json_encode($module->getGoNoGoTableData($record));

?>

<div id="gonogo">
	
</div>
<script type="text/javascript">
	TINGoNoGo = {
		css_url: "<?= $module->getUrl('css/gonogo.css'); ?>",
		schedule: JSON.parse('<?= $schedule_of_event_json; ?>'),
		gng_data: JSON.parse('<?= $gonogo_table_data; ?>')
	}
</script>
<script type="text/javascript" src="<?= $module->getUrl('js/gonogo.js'); ?>"></script>