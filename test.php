<?php
require_once APP_PATH_DOCROOT . 'ProjectGeneral/header.php';
// localhost/redcap/redcap_v11.3.3/ExternalModules/?prefix=tin_budget&page=test&pid=18

// $pid = $module->getProjectId();

function saveDataArray() {
	// try to create a single new event instance on record 1
	$record = new \stdClass();
	// $record->redcap_repeat_instance = 2;
	// $record->redcap_repeat_event = 46;
	$record->record_id = '1';
	$record->eoi_instance = 'Sicssors';

	$data = json_encode(["1" => $record]);
	$parameters = [
		"data_format" => 'array',
		"data" => $data
	];
	$result = \REDCap::saveData($parameters);
	echo "<pre>" . print_r($result, true) . "</pre>";
}
function printDataArray() {
	$parameters = [
		"return_format" => 'array',
		"records" => '1',
		"fields" => ['eoi', 'eoi_instance']
	];
	$data = \REDCap::getData($parameters);
	echo "<pre>" . print_r($data, true) . "</pre>";
}

function saveDataJson() {
	// try to create a single new event instance on record 1
	$instances = [];
	for ($i = 1; $i <= 8; $i++) {
		$instance = new \stdClass();
		$instance->proposal_id = '1';
		$instance->redcap_event_name = 'event_1_arm_1';
		$instance->redcap_repeat_instance = $i;
		$instance->eoi_instance = '';
		$instances[] = $instance;
	}
	$unencoded = $instances;
	echo "<pre>\$data (human-friendly/unencoded): " . print_r($unencoded, true) . "</pre>";
	
	$encoded = json_encode($unencoded);
	echo "<pre>\$data argument passed to saveData (json_encoded): $encoded</pre>";
	
	global $module;
	$parameters = [
		"project_id" => $module->getProjectId(),
		"dataFormat" => 'json',
		"data" => $encoded
	];
	$result = \REDCap::saveData($parameters);
	
	echo "<pre>\$result from \\REDCap::saveData: '" . print_r($result, true) . "'</pre>";
}
function printDataJson() {
	global $module;
	$parameters = [
		"project_id" => $module->getProjectId(),
		"return_format" => 'json',
		"records" => '1',
		"fields" => ['proposal_id', 'eoi', 'eoi_instance']
	];
	$data = json_decode(\REDCap::getData($parameters));
	echo "<pre>returned from getData: " . print_r($data, true) . "</pre>";
}

// saveDataArray();
// printDataArray();
saveDataJson();
printDataJson();

require_once APP_PATH_DOCROOT . 'ProjectGeneral/footer.php';