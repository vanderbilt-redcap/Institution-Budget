<?php
$arms = $_POST;

$record_id_field = $module->getRecordIdField();
$fields = [$record_id_field];
for ($i = 1; $i <= 5; $i++) {
	$fields[] = "arm$i" . "_decision";
	$fields[] = "arm$i" . "_comments";
}
$record_id = intval($arms['record_id']);

if (empty($record_id)) {
	exit();
}

$data = json_decode(\REDCap::getData('json', $record_id, $fields), true);

if (empty($data)) {
	exit();
}

// determine last instance
$last_instance = max(array_keys($data));

// set record_id in data object we're about to save
$data[0][$record_id_field] = $record_id;

for ($i = 1; $i <= 5; $i++) {
	$this_arm = $arms[$i - 1];
	if (!$this_arm) {
		break;
	}
	
	$decision = null;
	if ($this_arm['accept'] === 'true') {
		$decision = '1';
	} elseif ($this_arm['unable'] === 'true') {
		$decision = '2';
	} elseif ($this_arm['info'] === 'true') {
		$decision = '3';
	}
	$data[$last_instance]['arm' . $i . '_decision'] = $decision;
	$data[$last_instance]['arm' . $i . '_comments'] = db_escape($this_arm['comments']);
}

$ret = \REDCap::saveData('json', json_encode($data));