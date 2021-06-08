<?php
namespace Vanderbilt\TINBudget;

class TINBudget extends \ExternalModules\AbstractExternalModule {
	
	public function __construct() {
		parent::__construct();
		
		$pid = $this->getProjectId();
		if (empty($pid)) {
			return;
		}
		$budget_field = $this->getProjectSetting('budget_table_field');
		$gng_field = $this->getProjectSetting('gonogo_table_field');
		$summary_field = $this->getProjectSetting('summary_review_field');
		
		global $Proj;
		if (gettype($Proj) == 'object') {
			// collect instruments that hold schedule, gng, summary fields
			foreach ($Proj->metadata as $field) {
				if ($field['field_name'] === $budget_field) {
					$this->budget_table_instrument = $field['form_name'];
				}
				if ($field['field_name'] === $gng_field) {
					$this->gonogo_table_instrument = $field['form_name'];
				}
				if ($field['field_name'] === $summary_field) {
					$this->summary_review_instrument = $field['form_name'];
				}
			}
		}
	}
	
	public function getScheduleDataFields() {
		if (!$this->scheduleDataFields) {
			$fields = ['arms', 'proc'];
			for ($arm = 1; $arm <= 5; $arm++) {
				$fields[] = "arm_name_$arm";
				$fields[] = "visits_in_arm_$arm";
				for ($visit = 1; $visit <= 10; $visit++) {
					$suffix = $arm == 1 ? "" : "_$arm";
					$fields[] = "visit$visit$suffix";
				}
			}
			for ($proc = 1; $proc <= 25; $proc++) {
				$fields[] = "procedure$proc";
				$fields[] = "cost$proc";
				$fields[] = "cpt$proc";
			}
			$this->scheduleDataFields = $fields;
		}
		return $this->scheduleDataFields;
	}
	
	public function getScheduleRecordData() {
		if ($this->sched_record_data) {
			return $this->sched_record_data;
		} elseif ($rid = is_numeric($_GET['rid']) ? $_GET['rid'] : null) {
			// fetch, cache, return record data
			$fields = $this->getScheduleDataFields();
			$this->sched_record_data = json_decode(\REDCap::getData('json', $rid, $fields))[0];
		} else {
			throw new \Exception("The TIN Budget module couldn't determine the record ID to fetch record data with");
		}
		return $this->sched_record_data;
	}
	
	public function getArms() {
		$data = $this->getScheduleRecordData();
		$arms = [];
		if ($arm_count = $data->arms) {
			for ($arm_i = 1; $arm_i <= $arm_count; $arm_i++) {
				$arm = (object) [
					"name" => $data->{"arm_name_$arm_i"},
					"visits" => []
				];
				
				$visit_count = $data->{"visits_in_arm_$arm_i"};
				for ($visit_i = 1; $visit_i <= $visit_count; $visit_i++) {
					$suffix = $arm_i == 1 ? "" : "_$arm_i";
					$arm->visits[] = (object) [
						"name" => $data->{"visit" . $visit_i . $suffix}
					];
				}
				
				$arms[] = $arm;
			}
		}
		return $arms;
	}
	
	public function getProcedures() {
		$data = $this->getScheduleRecordData();
		$procedures = [];
		if ($proc_count = $data->proc) {
			for ($proc_i = 1; $proc_i <= $proc_count; $proc_i++) {
				$proc_field_name = "procedure$proc_i";
				$proc_name = $data->$proc_field_name;
				$procedures[] = (object) [
					"name" => $proc_name,
					"cost" => $data->{"cost$proc_i"},
					"cpt" => $data->{"cpt$proc_i"}
				];
			}
		}
		
		return $procedures;
	}
	
	public function getBudgetTableData($record) {
		// get Schedule of Event (CC Budget table) data
		$budget_table_field = $this->getProjectSetting('budget_table_field');
		$params = [
			"records" => $record,
			"fields" => $budget_table_field,
			"return_format" => 'json'
		];
		$data = json_decode(\REDCap::getData($params));
		if (empty($data)) {
			throw new \Exception("The TIN Budget module was unable to retrieve $budget_table_field (configured budget_table_field) data.");
		}
		$budget_table = $data[0]->$budget_table_field;
		return $budget_table;
	}
	
	public function getGoNoGoTableData($record) {
		// get event ID
		$event_ids = \REDCap::getEventNames();
		$event_id = array_search('Event 1', $event_ids);
		if (empty($event_id)) {
			throw new \Exception("The TIN Budget module couldn't retrieve Go/No-Go data (empty event_id -- is there an 'Event 1' event for this project?)");
		}
		
		$fields = [];
		for ($i = 1; $i <= 25; $i++) {
			$fields[] = "procedure" . $i . "_sc";
			$fields[] = "cost" . $i . "_sc";
		}
		for ($i = 1; $i <= 5; $i++) {
			$fields[] = "arm" . $i . "_decision";
			$fields[] = "arm" . $i . "_comments";
		}
		if (!empty($record)) {
			$get_data_params = [
				"return_format" => 'array',
				"records" => $record,
				"fields" => $fields
			];
			$data = \REDCap::getData($get_data_params);
			if (empty($data[$record]['repeat_instances'])) {
				throw new \Exception("The TIN Budget module couldn't extract Go/No-Go table data from retrieved record data (repeat_instances empty)");
			}
			
			$data = $data[$record]['repeat_instances'];
			if (empty($data[$event_id])) {
				throw new \Exception("The TIN Budget module couldn't extract Go/No-Go table data from retrieved record data (repeat_instances[event_id] empty)");
			}
			$data = $data[$event_id][""];
			if (empty($data)) {
				throw new \Exception("The TIN Budget module couldn't extract Go/No-Go table data from retrieved record data ([event_id][\"\"] missing)");
			}
			
			$current_event_instance = max(array_keys($data));
			$data = $data[$current_event_instance];
			
			if (empty($data)) {
				throw new \Exception("The TIN Budget module couldn't extract Go/No-Go table data from retrieved record data (no instance data found)");
			}
			
			return $data;
		} else {
			throw new \Exception("The TIN Budget module couldn't determine the record ID to fetch Go/No-Go table data with");
		}
	}
	
	public function getSummaryReviewData($record, $instance = 1) {
		// TODO -- make sure correct instance data is referenced
		$data = new \stdClass();
		$field_list = [];
		for ($i = 1; $i <= 5; $i++) {
			$field_list[] = "fixedcost$i";
			$field_list[] = "fixedcost$i" . "_detail";
			$field_list[] = "fixedcost$i" . "_decision";
			$field_list[] = "fixedcost$i" . "_comments";
			$field_list[] = "arm$i" . "_decision";
			$field_list[] = "arm$i" . "_comments";
		}
		
		$rc_data = \REDCap::getData('array', $record, $field_list);
		// carl_log("rc_data for summary review page: " . print_r($rc_data, true));
		
		// collate field data, prioritizing target instance data set
		$event_id = array_key_first($rc_data[$record]);
		$base_data = $rc_data[$record][$event_id];
		$instance_data = $rc_data[$record]['repeat_instances'];
		$instance_data = reset($instance_data);
		$instance_data = reset($instance_data);
		$instance_data = $instance_data[$instance];
		// carl_log("base_data for summary review page: " . print_r($base_data, true));
		// carl_log("instance_data for summary review page: " . print_r($instance_data, true));
		foreach ($field_list as $i => $field_name) {
			if (!empty($base_data[$field_name])) {
				$data->$field_name = $base_data[$field_name];
			}
			if (!empty($instance_data[$field_name])) {
				$data->$field_name = $instance_data[$field_name];
			}
		}
		// carl_log("result data for summary review page: " . print_r($data, true));
		
		return $data;
	}
	
	public function replaceScheduleFields($record) {
		$_GET['rid'] = $record;
		
		// retrieve name of configured budget table field
		$schedule_field = json_encode($this->getProjectSetting('budget_table_field'));
		
		// start buffering to catch getBudgetTable output (html)
		ob_start();
		include('php/getBudgetTable.php');
		// escape quotation marks
		$budget_table = addslashes(ob_get_contents());
		ob_end_clean();
		// escape newlines to make this a multi-line string in js
		$budget_table = str_replace(array("\r\n", "\n", "\r"), '\\n', $budget_table);
		
		// we didn't use json_encode above because getBudgetTable.php outputs HTML, not JSON
		$cpt_endpoint_url = $this->getProjectSetting('cpt_endpoint_url');
		?>
		<script type="text/javascript">
			TINBudget = {
				budget_css_url: '<?= $this->getUrl('css/budget.css'); ?>',
				cpt_endpoint_url: '<?= $cpt_endpoint_url; ?>'
			}
			TINBudget.procedures = JSON.parse('<?= json_encode($procedures) ?>')
			
			TINBudgetSurvey = {
				schedule_field: JSON.parse('<?= $schedule_field; ?>'),
				budget_table: "<?=$budget_table;?>",
				updateScheduleField: function(scheduleString) {
					var field_name = TINBudgetSurvey.schedule_field;
					$("textarea[name='" + field_name + "']").val(scheduleString);
				}
			}
			
			$(document).ready(function() {
				var fieldname = TINBudgetSurvey.schedule_field;
				$('#' + fieldname + '-tr').before("<div id='budgetTable'>" + TINBudgetSurvey.budget_table + "</div>")
				$('#' + fieldname + '-tr').hide();
			});
		</script>
		<script type='text/javascript' src='<?= $this->getUrl('js/budget.js'); ?>'></script>
		<?php
	}
	
	public function replaceGoNoGoFields($record, $instance) {
		// get budget table data
		$budget_table = $this->getBudgetTableData($record);
		
		// get Go/No-Go table data and field name
		$gonogo_table_data = json_encode($this->getGoNoGoTableData($record));
		$gonogo_table_field = $this->getProjectSetting('gonogo_table_field');
		$save_arm_fields_url = $this->getUrl('php/saveArmFields.php');
		?>
		<script type="text/javascript">
			TINGoNoGo = {
				record_id: '<?= $record; ?>',
				instance: '<?= $instance; ?>',
				gng_field: '<?= $gonogo_table_field; ?>',
				schedule: JSON.parse('<?= $budget_table; ?>'),
				gng_data: JSON.parse('<?= $gonogo_table_data; ?>'),
				css_url: "<?= $this->getUrl('css/gonogo.css'); ?>",
				save_arm_fields_url: '<?= $save_arm_fields_url; ?>'
			}
		</script>
		<script type='text/javascript' src='<?= $this->getUrl('js/gonogo.js'); ?>'></script>
		<?php
	}
	
	public function replaceSummaryReviewField($record, $instance) {
		carl_log("replaceSummaryReviewField " . date("Y-m-d H:i:s"), true);
		
		// get budget table data
		$budget_table = $this->getBudgetTableData($record);
		
		// get Go/No-Go table data and field name
		$gonogo_table_data = json_encode($this->getGoNoGoTableData($record));
		
		$summary_review_field = $this->getProjectSetting('summary_review_field');
		$summary_review_data = $this->getSummaryReviewData($record);
		$gonogo_table_field = json_encode($this->getProjectSetting('gonogo_table_field'));
		$save_arm_fields_url = $this->getUrl('php/saveArmFields.php');
		?>
		<script type="text/javascript">
			TINSummary = {
				record_id: '<?= $record; ?>',
				instance: '<?= $instance; ?>',
				summary_review_field: '<?= $summary_review_field; ?>',
				schedule: JSON.parse('<?= $budget_table; ?>'),
				gng_data: JSON.parse('<?= $gonogo_table_data; ?>'),
				css_url: "<?= $this->getUrl('css/summary.css'); ?>"
			}
		</script>
		<script type='text/javascript' src='<?= $this->getUrl('js/summary.js'); ?>'></script>
		<?php
	}
	
	public function redcap_survey_page($project_id, $record, $instrument, $event_id, $group_id, $survey_hash, $response_id, $repeat_instance) {
		// replace schedule of event field in survey page with generated table
		if ($instrument == $this->budget_table_instrument) {
			$this->replaceScheduleFields($record);
		}
		
		// replace Go/No-Go field in survey page with generated table
		if ($instrument == $this->gonogo_table_instrument) {
			$this->replaceGoNoGoFields($record, $instance);
		} 
		
		// replace Summary Review field in survey page with interface
		if ($instrument == $this->summary_review_instrument) {
			$this->replaceSummaryReviewField($record, $instance);
		}
	}

}