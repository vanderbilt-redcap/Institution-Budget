<?php
namespace Vanderbilt\InstituteBudget;
use ExternalModules\ExternalModules;

require __DIR__ . '/vendor/autoload.php';
class InstituteBudget extends \ExternalModules\AbstractExternalModule {
    
    
    private $moduleName = 'Budget Module';
    // determine name of study intake form instrument
    private $study_intake_form_name = 'study_coordinating_center_information';
    
    // set label pattern (to convert raw values to label values)
    private $label_pattern = "/(\d+),?\s?(.+?)(?=\x{005c}\x{006E}|$)/";
    
    
    //TODO Remove this constructor since external modules don't always play nice with them
	public function __construct() {
		parent::__construct();
		
	}
	
    public function initialize() {
        
        $pid = $this->getProjectId();
        if (empty($pid)) {
            $this->log('Error: Institute Budget Module can\'t be initialized without a project ID');
            exit(1);
        }
        
        $this->getBudgetForm();
        $this->getSummaryForm();
    }
    
    public function getMetadataCache() {
        if (empty($this->metadata)) {
            $pid            = $this->getProjectId();
            $this->metadata = $this->getMetadata($pid);
        }
        
        return $this->metadata;
    }
    
    public function getSettingFieldForm($fieldSetting) {
        $form = '';
        $field = $this->getProjectSetting($fieldSetting);
        $this->getMetadataCache();
        if (isset($this->metadata[$field])) {
            $form = $this->metadata[$field]['form_name'];
        }
        
        return $form;
    }
    
    public function getBudgetForm() {
        if (empty($this->budget_table_instrument)){
            $this->budget_table_instrument = $this->getSettingFieldForm('budget_table_field');
        }
        
        return $this->budget_table_instrument;
    }
    
    public function getSummaryForm() {
        if (empty($this->summary_review_instrument)){
            $this->summary_review_instrument = $this->getSettingFieldForm('summary_review_field');
        }
        
        return $this->summary_review_instrument;
    }
    
	public function getScheduleDataFields() {
		if (!$this->scheduleDataFields) {
			$fields = ['arms', 'proc'];
			for ($arm = 1; $arm <= 5; $arm++) {
				$fields[] = "arm_name_$arm";
				$fields[] = "visits_in_arm_$arm";
				for ($visit = 1; $visit <= 100; $visit++) {
					$suffix = $arm == 1 ? "" : "_$arm";
					$fields[] = "visit$visit$suffix";
				}
			}
            for ($personCost = 1; $personCost <= 4; $personCost++) {
                $fields[] = "cost_pc_$personCost";
            }
			for ($proc = 1; $proc <= 100; $proc++) {
				$fields[] = "procedure$proc";
				$fields[] = "cost$proc";
				$fields[] = "cpt$proc";
				$fields[] = "rtc_$proc";
				$fields[] = "rtc_comments_$proc";
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
			$this->sched_record_data = json_decode(\REDCap::getData('json', $rid, $fields), true)[0];
		} else {
			throw new \Exception("The ".$this->moduleName." couldn't determine the record ID to fetch record data with");
		}
		return $this->sched_record_data;
	}
	
	public function getArms() {
		$data = $this->getScheduleRecordData();
		$arms = [];
		if ($arm_count = $data['arms']) {
			for ($arm_i = 1; $arm_i <= $arm_count; $arm_i++) {
				$arm = [
					"name" => $data["arm_name_$arm_i"],
					"visits" => []
				];
				
				$visit_count = $data["visits_in_arm_$arm_i"];
				for ($visit_i = 1; $visit_i <= $visit_count; $visit_i++) {
					$suffix = $arm_i == 1 ? "" : "_$arm_i";
					$arm['visits'][] = [
						"name" => $data["visit" . $visit_i . $suffix]
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
		if ($proc_count = $data['proc']) {
			for ($proc_i = 1; $proc_i <= $proc_count; $proc_i++) {
				$proc_field_name = "procedure$proc_i";
				$proc_name = $data[$proc_field_name];
				$procedures[] = [
					"name" => $proc_name,
					"cost" => $data["cost$proc_i"],
					"cpt" => $data["cpt$proc_i"],
					"routine_care_procedure_form" => $data["rtc_$proc_i"],
					"comment" => $data["rtc_comments_$proc_i"]
				];
			}
		}
		
		return $procedures;
	}
    
    public function getEffortCosts() {
        $data = $this->getScheduleRecordData();
        $efforts = [];
        for ($effort = 1; $effort <= 4; $effort++) {
            $effort_field_name = "cost_pc_$effort";
            $effort_name = $this->getFieldLabel($effort_field_name);
            $efforts[] = [
                "name" => $effort_name,
                "cost" => $data[$effort_field_name]
            ];
        }
        
        return $efforts;
    }
	
	public function getBudgetTableData($record) {
		// get Schedule of Event (CC Budget table) data
		$budget_table_field = $this->getProjectSetting('budget_table_field');
		$params = [
            "project_id" => $this->getProjectId(),
			"records" => $record,
			"fields" => $budget_table_field,
			"return_format" => 'json'
		];
		$data = json_decode(\REDCap::getData($params), true);
		
		if (empty($data)) {
			return [];
		}
		
		return $data[0][$budget_table_field];
	}
    
    //TODO Remove or update once we figure out if this feature is staying
	//public function getGoNoGoTableData($record, $instance) {
	//	// get event ID
	//	$event_ids = \REDCap::getEventNames();
	//	$event_id = array_search('Event 1', $event_ids);
	//	if (empty($event_id)) {
	//		throw new \Exception("The ".$this->moduleName." couldn't retrieve Go/No-Go data (empty event_id -- is there an 'Event 1' event for this project?)");
	//	}
	//
	//	$fields = [];
	//	for ($i = 1; $i <= 100; $i++) {
	//		$fields[] = "procedure" . $i . "_sc";
	//		$fields[] = "cost" . $i . "_sc";
	//	}
	//	for ($i = 1; $i <= 5; $i++) {
	//		$fields[] = "arm" . $i . "_decision";
	//		$fields[] = "arm" . $i . "_comments";
	//	}
	//	if (!empty($record)) {
	//		$get_data_params = [
	//			"return_format" => 'array',
	//			"records" => $record,
	//			"fields" => $fields
	//		];
	//		$data = \REDCap::getData($get_data_params);
	//
	//		if (empty($data[$record]['repeat_instances'])) {
	//			throw new \Exception("The ".$this->moduleName." couldn't extract Go/No-Go table data from retrieved record data (repeat_instances empty)");
	//		}
	//
	//		$data = $data[$record]['repeat_instances'];
	//		if (empty($data[$event_id])) {
	//			throw new \Exception("The ".$this->moduleName." couldn't extract Go/No-Go table data from retrieved record data (repeat_instances[event_id] empty)");
	//		}
	//		$data = $data[$event_id][""];
	//		if (empty($data)) {
	//			throw new \Exception("The ".$this->moduleName." couldn't extract Go/No-Go table data from retrieved record data ([event_id][\"\"] missing)");
	//		}
	//
	//		$data = $data[$instance];
	//
	//		if (empty($data)) {
	//			throw new \Exception("The ".$this->moduleName." couldn't extract Go/No-Go table data from retrieved record data (no instance data found)");
	//		}
	//
	//		return $data;
	//	} else {
	//		throw new \Exception("The ".$this->moduleName." couldn't determine the record ID to fetch Go/No-Go table data with");
	//	}
	//}
	
	public function getSummaryReviewData($record, $instance) {
		if (empty($instance))
			$instance = 1;
		$data = [];
		$field_list = ['institution'];
		for ($i = 1; $i <= 5; $i++) {
			$field_list[] = "fixedcost$i";
			$field_list[] = "fixedcost$i" . "_detail";
			$field_list[] = "fixedcost$i" . "_decision";
			$field_list[] = "fixedcost$i" . "_comments";
			$field_list[] = "arm$i" . "_decision";
			$field_list[] = "arm$i" . "_comments";
		}
		
        $field_list = array_merge($field_list, [
            "costs_4",
            "personnelcost_pi_decision",
            "personnelcost_pi_comment",
            "costs_5",
            "personlcost_nonpi_decision",
            "personlcost_nonpi_comment",
            "costs_6",
            "personlcost_partic_decision",
            "personlcost_partic_comment"
        ]);
		$rc_data = \REDCap::getData('array', $record, $field_list);
		
		// collate field data, prioritizing target instance data set
		$event_id = array_key_first($rc_data[$record]);
		$base_data = $rc_data[$record][$event_id];
		$instance_data = $rc_data[$record]['repeat_instances'];
		$instance_data = reset($instance_data);
		$instance_data = reset($instance_data);
		$instance_data = $instance_data[$instance];
		foreach ($field_list as $i => $field_name) {
			if (!empty($base_data[$field_name])) {
				$data[$field_name] = $base_data[$field_name];
			}
			if (!empty($instance_data[$field_name])) {
				$data[$field_name] = $instance_data[$field_name];
			}
		}
		
		// convert raw->label for ..._decision fields
		foreach ($data as $name => $value) {
			if (strpos($name, '_decision') !== false) {
				$labels = $this->getChoiceLabels($name);
				$data[$name] = $labels[$value];
			}
		}
		
		return $data;
	}
	
	public function getReconciliationData() {
		// get event ID
		$event_ids = \REDCap::getEventNames();
		$event_id = array_search('Event 1', $event_ids);
		$fields = [
			"institution",
			"institution_ctsa_name",
			"institution_non_ctsa_name",
			"affiliate_ctsa_institution",
			"budget_request_date",
			"consideration",
			"final_gonogo",
			"final_gonogo_comments",
		];
		
		$params = [
			"project_id" => $this->getProjectId(),
			"return_format" => "array",
			"fields" => $fields,
			"events" => $event_id,
			"exportAsLabels" => true
		];
		$records = \REDCap::getData($params);
		if (!$records) {
			return "REDCap couldn't get institution data at this time.";
		}
		
		// tabulate
		$table_data = [];
		
		foreach ($records as $record) {
			$site_array = $record['repeat_instances'][$event_id][''];
			foreach($site_array as $site) {
				$row = [];
				
				// determine site name
				if ($site['institution'] == 500) {
					$row['name'] = $site['affiliate_ctsa_institution'] . " Affiliate: " . $site['institution_ctsa_name'];
				} elseif ($site['institution'] == 999) {
					$row['name'] = "Non-CTSA Site: " . $site['institution_non_ctsa_name'];
				} else {
					$row['name'] = "N/A";
				}
				
				$row['date_of_request'] = $site['budget_request_date'];
				
				if ($site['consideration'] == '0') {
					$row['date_of_response'] = 'Talk to Clint';
				} elseif ($site['consideration'] == '1') {
					$row['date_of_response'] = 'Talk to Clint or use Go/No-Go pending field';
				} else {
					$row['date_of_response'] = "N/A";
				}
				
				$row['decision'] = 'N/A';
				if ($site['final_gonogo'] == '1') {
					$row['decision'] = 'Go';
				} elseif ($site['final_gonogo'] == '2') {
					$row['decision'] = 'No-Go';
				} elseif ($site['final_gonogo'] == '3') {
					$row['decision'] = 'Need More Info';
				}
				$row['decision_comments'] = $site['final_gonogo_comments'];
				
				$table_data[] = $row;
			}
		}
		
		return $table_data;
	}
	
	public function getCCSummaryData() {
		$data = [];
		global $record;
		
		// get STUDY INTAKE FORM data
		$fields_needed = [
			"cc_contact_person_fn",
			"cc_contact_person_ln",
			"cc_email",
			"cc_phone_number",
			"short_name",
			"protocol_synopsis",
			"brief_stud_description",
			"prop_summary_describe2_5f5",
			"number_subjects",
			"study_population",
			"number_sites",
			"funding_source",
			"funding_mechanism",
			"funding_other",
			"institute_center",
			"grant_app_no",
			"funding_opp_announcement",
			"anticipated_budget",
			"funding_duration",
			"site_active_date",
			"support_date",
			"costs_4",
			"costs_5",
			"costs_6"
		];
		
		for ($i = 1; $i <= 5; $i++) {
			$fields_needed[] = "fixedcost$i";
			$fields_needed[] = "fixedcost$i" . "_detail";
		}
		
		$getDataParams = [
			"project_id" => $this->getProjectId(),
			"return_format" => "array",
			"records" => $record,
			"fields" => $fields_needed
		];
		$study_intake_data = \REDCap::getData($getDataParams);
		
		// convert some raw values to label values
		$fields_to_labelize = ['study_population', 'funding_mechanism', 'funding_source', 'institute_center'];
		foreach($fields_to_labelize as $field_name) {
			unset($labels, $matches, $raw_value);
            $metadata = $this->getMetadataCache();
            if (array_key_exists($field_name, $metadata)) {
                preg_match_all($this->label_pattern, $metadata[$field_name]["element_enum"], $matches);
                $labels    = array_map("trim", $matches[2]);
                $raw_value = intval($study_intake_data[$record][$this->getFirstEventId()][$field_name]) - 1;
                // actually replace raw value
                $study_intake_data[$record][$this->getFirstEventId()][$field_name] = $labels[$raw_value];
            }
		}
		
		$data = reset($study_intake_data[$record]);
		
		return $data;
	}
	
	public function showStaticScheduleArms($budget_data, $arms_and_visits_survey_link) {
		foreach($budget_data['arms'] as $arm_i => $arm) {
		$link_arm_index = $arm_i + 1;
		?>
		<div class="budget_container">
		<a href="<?= $arms_and_visits_survey_link . "&arm=$link_arm_index" ?>"><h6><?= "Arm " . ($arm_i + 1) . ": " . ($arm['name'] ?? "") ?></h6></a>
		<table>
			<thead>
				<tr>
				<?php
				foreach ($arm['visits'] as $visit_i => $visit) {
					if (empty($visit)) {
						echo "<th></th>";
					} else {
						echo "<th>Visit " . ($visit_i) . ": " . $visit['name'] . "</th>";
					}
				}
				?>
				</tr>
			</thead>
			<tbody>
			<?php
			$visit1 = $arm['visits'][1];
			$row_count = count($budget_data['procedures']);
			for ($row_i = 1; $row_i <= $row_count; $row_i++) {
				$row_i_0 = $row_i - 1;
				?>
				<tr>
					<td><?= $budget_data['procedures'][$row_i_0]['name'] ?></td>
					<?php
					foreach ($arm['visits'] as $visit_i => $visit) {
						if (!empty($visit)) {
							if ($visit['procedure_counts'][$row_i_0]['count'] != 0) {
								$class = " class='nonzero'";
							} else {
								$class = "";
							}
							echo "<td$class>" . $visit['procedure_counts'][$row_i_0]['count'] . "</td>";
						}
					}
					?>
				</tr>
				<?php
			}
			
			// add Total $$ row
			echo "<tr><td class='no-border'>Total $$</td>";
			foreach ($arm['visits'] as $visit_i => $visit) {
				if (!empty($visit)) {
					echo "<td>" . $visit['total'] . "</td>";
				}
			}
			echo "</tr>";
			?>
			</tbody>
		</table>
		</div>
		<?php
		}
	}
	
	public function showSummarySiteTable($record) {
		$fields = [];
		for ($i = 1; $i <= 50; $i++) {
			$fields[] = "name$i";
			$fields[] = "institution$i";
			$fields[] = "email$i";
			$fields[] = "zip$i";
		}
		$pid = $this->getProjectId();
		$eid = $this->getFirstEventId();
		$params = [
			"project_id" => $pid,
			"return_format" => "array",
			"records" => $record,
			"fields" => $fields,
			"events" => $eid
		];
		
		$site_data = \REDCap::getData($params);
		$site_data = $site_data[$record][$eid];
		?>
		<div>
			<table class='sites_contact_info'>
				<thead>
					<tr>
						<th></th>
						<th>Name of Contact</th>
						<th>Institution Name</th>
						<th>Email Address</th>
						<th>Zip Code</th>
					</tr>
				</thead>
				<tbody>
				<?php
				for ($i = 1; $i <= 50; $i++) {
					?>
					<tr>
						<td><?= "Site $i" ?></td>
						<td><?= $site_data["name$i"] ?></td>
						<td><?= $site_data["institution$i"] ?></td>
						<td><?= $site_data["email$i"] ?></td>
						<td><?= $site_data["zip$i"] ?></td>
					</tr>
					<?php
				}
				?>
				</tbody>
			</table>
		</div>
		<?php
	}
	
	public function packageStudyIntakeFormAndConvertToPDF($intake_form_html) {
		// create the intake form html document (by adding html tag, metadata, css, etc.)
		$html = <<<HEREDOC
<!DOCTYPE HTML>
<html>
	<head>
		<meta name="googlebot" content="noindex, noarchive, nofollow, nosnippet">
		<meta name="robots" content="noindex, noarchive, nofollow">
		<meta name="slurp" content="noindex, noarchive, nofollow, noodp, noydir">
		<meta name="msnbot" content="noindex, noarchive, nofollow, noodp">
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<meta http-equiv="Cache-Control" content="no-cache">
		<meta http-equiv="Pragma" content="no-cache">
		<meta http-equiv="expires" content="0">
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Budget - Study Intake Form</title>
		<style>
HEREDOC;
		$html .= file_get_contents($this->getUrl("css/cc_summary.css"));
		$html .= <<<HEREDOC
		</style>
	</head>
	<body>
		$intake_form_html
	</body>
</html>
HEREDOC;
		// return $html; - instead of returning html, convert to PDF before sending back
		$options = new \Dompdf\Options();
		$options->setIsHtml5ParserEnabled(true);
		$dompdf = new \Dompdf\Dompdf($options);
		$dompdf->loadHtml($html);

		// set the paper size and orientation
		$dompdf->setPaper('A4', 'landscape');

		// Render the HTML as PDF
		$dompdf->render();
		
		return $dompdf;
	}
	
	public function getDashboardData() {
		// get event ID
		$event_ids = \REDCap::getEventNames();
		$event_id_0 = array_search('Coordinating Center GNG', $event_ids);
		$event_id_1 = array_search('Event 1', $event_ids);
		$generate_request_form_complete_field = $this->send_to_sites_instrument . "_complete";
		$fields = [
			"institution",
			"institution_ctsa_name",
			"institution_non_ctsa_name",
			"affiliate_ctsa_institution",
			"budget_request_date",
			"consideration",
			"final_gonogo",
			"final_gonogo_comments",
			"short_name",
			"send_to_sites",
			"request_date",
			"response_date",
			$generate_request_form_complete_field
		];
		
		for ($i = 1; $i <= 100; $i++) {
			$fields[] = "institution$i";
		}
		
		$params = [
			"project_id" => $this->getProjectId(),
			"return_format" => "array",
			"fields" => $fields,
			"exportAsLabels" => true
		];
		$records = \REDCap::getData($params);
		if (!$records) {
			return "REDCap couldn't get institution data at this time.";
		}
		
		// get tables
		$data = [];
		
		foreach ($records as $record_id => $record) {
			$site_array = $record['repeat_instances'][$event_id_1][''];
			$table_rows = [];
			foreach($site_array as $site_i => $site) {
				$row = [];
				
				// determine site name
				if ($site['institution'] == 500) {
					$row['name'] = $site['affiliate_ctsa_institution'] . " Affiliate: " . $site['institution_ctsa_name'];
				} elseif ($site['institution'] == 999) {
					$row['name'] = "Non-CTSA Site: " . $site['institution_non_ctsa_name'];
				} else {
					// $row['name'] = "N/A";
					$row['name'] = $record[$event_id_0]["institution$site_i"];
				}
				
				// $row['date_of_request'] = $site['budget_request_date'];
				$row['date_of_request'] = $record[$event_id_0]['request_date'];
				
				if ($site['consideration'] == '0') {
					$row['date_of_response'] = 'Talk to Clint';
				} elseif ($site['consideration'] == '1') {
					$row['date_of_response'] = 'Talk to Clint or use Go/No-Go pending field';
				} else {
					// $row['date_of_response'] = "N/A";
					$row['date_of_response'] = $site["response_date"];
				}
				
				
				$row['decision'] = 'N/A';
				if ($site['final_gonogo'] == '1') {
					$row['decision'] = 'Go';
				} elseif ($site['final_gonogo'] == '2') {
					$row['decision'] = 'No-Go';
				} elseif ($site['final_gonogo'] == '3') {
					$row['decision'] = 'Need More Info';
				}
				$row['decision_comments'] = $site['final_gonogo_comments'];
				
				$table_rows[] = $row;
			}
			
			$pending_text = "";
			if ($record[$event_id_0]['send_to_sites'] !== '1' || $record[$event_id_0][$generate_request_form_complete_field] !== '2') {
				$pending_text = " (PENDING)";
			}
			
			$data[$record_id] = [
				"name" => $record[$event_id_0]['short_name'],
				"pending" => $pending_text,
				"table" => $table_rows,
			];
		}
		
		return $data;
	}
    
    
    //TODO Remove or update once we figure out if this feature is staying
	public function renderDashboard() {
        $this->initialize();
        $user = $this->getUser()->getUsername();
        $userInfo = ExternalModules::getUserInfo($user);
        $user_name = $userInfo['user_firstname']. ' ' . $userInfo['user_lastname'];
		$data = $this->getDashboardData();
		$plus_icon_url = $this->getUrl("icons/plus-solid.svg");
		$minus_icon_url = $this->getUrl("icons/minus-solid.svg");
		$reconciliiation_page_url = $this->getUrl("reconciliation.php");
		
		// get public survey url
		// $new_record_url = APP_PATH_WEBROOT . 'DataEntry/record_home.php?pid=' . $this->getProjectId() . '&arm=1';
        
        $public_survey_url = $this->getPublicSurveyUrl();
		
		$dropdown_i = 1;
		?>
		<!DOCTYPE html>
		<style>body {display: none;}</style>
		<div id="solid_header">
			<h1>VUMC Budget Tool</h1>
		</div>
		<div id="user_controls">
			<span>Welcome <?= $user_name ?> - <a href="/redcap/index.php?logout=1">Logout</a></span>
			<button type="button" class="btn btn-primary" id="new_budget_feasibility_request" onclick="window.location.href=BudgetDashboard.public_survey_url">Generate New Budget Feasibility Request</button>
		</div>
		<div id="study_tables">
			<div class="blue_bar"></div>
<!--            <table id='budgetDashboard'>-->
<!--                <thead>-->
<!--                <tr>-->
<!--                    <th>Record ID</th>-->
<!--                    <th>Study Name</th>-->
<!--                    <th>Link</th>-->
<!--                </tr>-->
<!--                </thead>-->
<!--                <tbody>-->
		<?php
		// Actions column dropdown
//		$action_dropdown = "<div class='dropdown'>
//			<button class='btn btn-primary dropdown-toggle site-action-dd' type='button' id='_id' data-toggle='dropdown' aria-expanded='false'>
//				View
//			</button>
//			<ul class='dropdown-menu' aria-labelledby='_id'>
//				<li><a class='action-item dropdown-item' href='#'>Contact Site</a></li>
//				<li><a class='action-item dropdown-item' href='#'>Accept Decision</a></li>
//				<li><a class='action-item dropdown-item' href='#'>Provide Information</a></li>
//				<li><a class='action-item dropdown-item' href='#'>Create Note</a></li>
//				<li><a class='action-item dropdown-item' href='#'>Send Reminder</a></li>
//			</ul>
//		</div>";

		// create study rows and tables
		foreach ($data as $study_i => $study) {
//            $debug->compare([$study], []);
            $intake_url = \REDCap::getSurveyLink($study_i, $this->study_intake_form_name, $this->event_ids[0]);
//            $debug->compare([$link], []);
//			$detailed_recon_view_link = "<a class='detailed_recon_view' href='$reconciliiation_page_url'>See detailed reconciliation view</a>";
            $survey_link = "<a class='detailed_recon_view' href='$intake_url'>Continue working on budget feasibility request</a>";
			echo "<div class='study_row' data-study-i='$study_i'>
                      <span class='study_short_name'>Study Name: {$study['name']}{$study['pending']}</span>
                      $survey_link
                  </div>";
//            echo "
//                    <tr>
//                        <td>$study_i</td>
//                        <td>{$study['name']}{$study['pending']}</td>
//                        <td>$survey_link</td>
//                    </tr>";
		}
		?>
<!--                </tbody>-->
<!--            </table>-->
		</div>
		<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
		<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
		<script src="//cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js" crossorigin="anonymous"></script>
		<script type="text/javascript">
			BudgetDashboard = {
				plus_icon_url: "<?= $plus_icon_url ?>",
				minus_icon_url: "<?= $minus_icon_url ?>",
				public_survey_url: "<?= $public_survey_url ?>"
			};
			// BudgetDashboard.collapseStudyRows = function() {
				// $("div.study_row").each(function(i, study_row) {
				// 	$(study_row).find('img.study_toggle').attr('src', BudgetDashboard.plus_icon_url);
					// $(study_row).find('a.detailed_recon_view').hide();
				// });
				// $("div.study_table_container").hide();
			// };
			$(document).ready(function() {
				$('head').append("<link rel='stylesheet' href='<?php echo $this->getUrl('css/dashboard.css'); ?>'>")
				// add bootstrap css
				$('head').append("<link rel='stylesheet' href='https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css' integrity='sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T' crossorigin='anonymous'>")
				$('head').append("<link rel='stylesheet' href='//cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css' crossorigin='anonymous'>")

                // $('#budgetDashboard').DataTable({
                //     order: [
                //         [0, 'asc']
                //     ],
                //     columnDefs: [
                //         {
                //             target: 0,
                //             visible: false
                //         }
                //     ]
                // });
				// make each recon table a DataTables table
				// BudgetDashboard.recon_tables = [];
				// var options = {
				// 	order: [
				// 		[0, 'desc']
				// 	],
				// 	columns: [
				// 		{orderable: true, searchable: true},
				// 		{orderable: true, searchable: true},
				// 		{orderable: true, searchable: true},
				// 		{orderable: true, searchable: true},
				// 		{orderable: false, searchable: false},
				// 		{orderable: false, searchable: false}
				// 	]
				// };
				// $('.reconciliation').each(function(i, recon_table) {
				// 	BudgetDashboard.recon_tables.push($(recon_table).DataTable(options));
				// });
				
				// BudgetDashboard.collapseStudyRows();
			});
			
			// $('body').on('click', 'img.study_toggle', function(event) {
			// 	var toggle = $(event.target);
			// 	var study_row = toggle.closest('div.study_row');
			// 	if (toggle.attr('src') == BudgetDashboard.plus_icon_url) {
			// 		toggle.attr('src', BudgetDashboard.minus_icon_url);
			// 		study_row.find('a.detailed_recon_view').show();
			// 		var study_index = study_row.attr('data-study-i');
			// 		$("div.study_table_container[data-study-i='" + Number(study_index) + "']").show();
			// 	} else {
			// 		toggle.attr('src', BudgetDashboard.plus_icon_url);
			// 		study_row.find('a.detailed_recon_view').hide();
			// 		var study_index = study_row.attr('data-study-i');
			// 		$("div.study_table_container[data-study-i='" + Number(study_index) + "']").hide();
			// 	}
			// });
		</script>
		<?php
	}
	
	public function getCCSummaryHTML($cc_data) {
		global $record;
		global $event_id;
		$cc_data['record_id'] = $record;
		$cc_data['event_id'] = $event_id;
		
		// if (empty($cc_data)) {
			// throw new \Exception("Tried to output CC Summary Review page, but argument \$cc_data is empty.");
		// }
		global $record;
		$budget_data = $this->getBudgetTableData($record);
		if (empty($budget_data)) {
			// throw new \Exception("Tried to output CC Summary Review page, but argument \$cc_data is empty.");
			$budget_data = [];
		} else {
			$budget_data = json_decode($budget_data, true);
		}
		
		// the study intake form that gets attached to email should not have hyperlinks in first column
		$study_intake_form_no_links = $this->makeStudyIntakeFormForAttachment($cc_data);
		$this->saveIntakeForm($record, $study_intake_form_no_links);
		
		// this version of the study intake table should have hyperlinks in the first column
		$study_intake_form = $this->makeStudyIntakeForm($cc_data);
		$fixed_costs_survey_link = \REDCap::getSurveyLink($record, "fixed_costs_information", $event_id);
		$arms_and_visits_survey_link = \REDCap::getSurveyLink($record, "schedule_of_event", $event_id);
		$identify_sites_survey_link = \REDCap::getSurveyLink($record, "identify_sites", $event_id);
		
		?>
		<button type="button" class="btn btn-primary" style="margin: 8px;" onclick="window.print()">Print</button>
		<div id="cc_summary">
		<h3>BUDGET FEASIBILITY SUMMARY PAGE FOR COORDINATING CENTER</h3>
		
		<?php echo $study_intake_form; ?>
		
		<!--FIXED COSTS SUMMARY REVIEW-->
		<div class='pba'>
		<h5 class="table_title"><u>FIXED COSTS SUMMARY REVIEW</u></h5>
		<table class="cc_rev_table blue_table_headers">
			<thead>
				<tr>
					<th>FIXED COST</th>
					<th>FIXED COST DETAIL</th>
				</tr>
			</thead>
			<tbody>
			<?php
			for ($i = 1; $i <= 5; $i++) {
                if (trim($cc_data["fixedcost{$i}___1"]) !== '') {
                    echo "<tr><td><a href='$fixed_costs_survey_link' style='font-size: 1rem;'>" . $cc_data["fixedcost$i"] . "</a></td><td>" . $cc_data["fixedcost$i" . "_detail"] . "</td></tr>";
                }
			}
			// add Personnel Costs, non-Personnel Costs, Participant Reimbursement rows
			echo "<tr><td><a href='$fixed_costs_survey_link' style='font-size: 1rem;'>Personnel Costs</a></td><td>" . $cc_data["costs_4"] . "</td></tr>";
			echo "<tr><td><a href='$fixed_costs_survey_link' style='font-size: 1rem;'>non-Personnel Costs</a></td><td>" . $cc_data["costs_5"] . "</td></tr>";
			echo "<tr><td><a href='$fixed_costs_survey_link' style='font-size: 1rem;'>Participant Reimbursement</a></td><td>" . $cc_data["costs_6"] . "</td></tr>";
			?>
			</tbody>
		</table>
		</div>
		
		<!--PROCEDURE COSTS SUMMARY REVIEW-->
		<div class='pbb pba'>
		<h5 class="table_title"><u>PROCEDURE COSTS SUMMARY REVIEW</u></h5>
		<table class="cc_rev_table green_table_headers">
			<thead>
				<tr>
					<th>Procedure Name</th>
					<th>Associated CPT Code</th>
					<th>Reimbursement Amount</th>
				</tr>
			</thead>
			<tbody>
			<?php
			foreach($budget_data['procedures'] as $i => $info) {
				if ($info['routine_care'] === true) {
					$info['cost'] = "Routine Care";
				}
				echo "<tr><td>" . $info['name'] . "</td><td>" . $info['cpt'] . "</td><td>" . $info['cost'] . "</td></tr>";
			}
			?>
			</tbody>
		</table>
		</div>
		
		<!--SCHEDULE OF EVENTS REVIEW-->
		<div class='pbb pba'>
		<h5 class="table_title"><u>SCHEDULE OF EVENTS REVIEW</u></h5>
		<?php $this->showStaticScheduleArms($budget_data, $arms_and_visits_survey_link); ?>
		</div>
		
		<!--IDENTIFIED SITES REVIEW-->
		<div class='pbb pba extra-top-space'>
		<h5 class="table_title"><u><a href="<?=$identify_sites_survey_link?>">IDENTIFIED SITES REVIEW</a></u></h5>
		<?php $this->showSummarySiteTable($record); ?>
		</div>
		
		</div>
		<script type="text/javascript">
			$().ready(function() {
				$('head').append('<link rel="stylesheet" href="<?= $this->getUrl("css/cc_summary.css"); ?>">');
			});
		</script>
		<?php
	}
	
	public function replaceScheduleFields($record) {
		$_GET['rid'] = $record;
  
		// retrieve name of configured budget table field
		$schedule_field = $this->getProjectSetting('budget_table_field');
  
		// start buffering to catch getBudgetTable output (html)
		ob_start();
        // TODO refactor when converting to twig
        //$procedures, $arms, and $efforts are defined in this include.
		include('php/getBudgetTable.php');
		// escape quotation marks
		$budget_table = addslashes(ob_get_contents());
		ob_end_clean();
		// remove newlines and tabs
		$budget_table = str_replace(array("\n", "\r", "\t"), '', $budget_table);
		// we didn't use json_encode above because getBudgetTable.php outputs HTML, not JSON
		
		// get existing schedule_of_events_json (contains procedure counts)
		$data_params = [
			"project_id" => $this->getProjectId(),
			"return_format" => "array",
			"records" => "$record",
			"fields" => $schedule_field
		];
		$soe_data = \REDCap::getData($data_params)[$record];
        if (!empty($soe_data)) {
            $soe_data = reset($soe_data);
            if (!empty($soe_data[$schedule_field])) {
                $soe_data = $soe_data[$schedule_field];
            } else {
                unset($soe_data);
            }
        }
        if (empty($soe_data)) {
            $soe_data = '{}';
        }
		$cpt_endpoint_url = $this->getProjectSetting('cpt_endpoint_url');
		
		?>
		<script type="text/javascript">
			Budget = {
				budget_css_url: '<?= $this->getUrl('css/budget.css'); ?>',
				cpt_endpoint_url: '<?= $cpt_endpoint_url; ?>',
				procedures_json: '<?= json_encode($procedures, JSON_HEX_APOS|JSON_HEX_QUOT) ?>',
				efforts_json: '<?= json_encode($efforts, JSON_HEX_APOS|JSON_HEX_QUOT) ?>'
			}
			
			BudgetSurvey = {
				schedule_field: "<?= $schedule_field; ?>",
				budget_table: "<?=$budget_table;?>",
				soe_data: <?=$soe_data;?>,
				updateScheduleField: function(scheduleString) {
					var field_name = BudgetSurvey.schedule_field;
					$("textarea[name='" + field_name + "']").val(scheduleString);
				}
			}
			
			$(document).ready(function() {
				if (Budget.procedures_json.length > 0) {
					Budget.procedures = JSON.parse(Budget.procedures_json);
				}
                if (Budget.efforts_json.length > 0) {
                    Budget.efforts = JSON.parse(Budget.efforts_json);
                }
				// if (BudgetSurvey.soe_json.length > 0) {
				// 	BudgetSurvey.soe_data = JSON.parse(BudgetSurvey.soe_json);
				// }
				var fieldname = BudgetSurvey.schedule_field;
				$('#' + fieldname + '-tr').before("<div id='budgetTable'>" + BudgetSurvey.budget_table + "</div>")
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
		$gonogo_table_data = json_encode($this->getGoNoGoTableData($record, $instance));
		$gonogo_table_field = $this->getProjectSetting('gonogo_table_field');
		$save_arm_fields_url = $this->getUrl('php/saveArmFields.php', true);
		?>
		<script type="text/javascript">
			TINGoNoGo = {
				record_id: '<?= $record; ?>',
				instance: '<?= $instance; ?>',
				gng_field: '<?= $gonogo_table_field; ?>',
				schedule: <?= $budget_table; ?>,
				gng_data: <?= $gonogo_table_data; ?>,
				css_url: "<?= $this->getUrl('css/gonogo.css'); ?>",
				save_arm_fields_url: '<?= $save_arm_fields_url; ?>'
			}
		</script>
		<script type='text/javascript' src='<?= $this->getUrl('js/gonogo.js'); ?>'></script>
		<?php
	}
	
	public function replaceSummaryReviewField($record, $instance) {
		// get budget table data
		$budget_table = $this->getBudgetTableData($record);
        //If there's no data then create an empty JS object so it doesn't error out and display nothing.
        if (empty($budget_table)){
            $budget_table = json_encode([]);
        }
		// get Go/No-Go table data and field name
		$gonogo_table_data = json_encode($this->getGoNoGoTableData($record, $instance));
		
		$summary_review_field = $this->getProjectSetting('summary_review_field');
		
		$summary_review_data = $this->getSummaryReviewData($record, $instance);
		$summary_review_data = json_encode($summary_review_data, JSON_HEX_APOS);
		
//		$gonogo_table_field = json_encode($this->getProjectSetting('gonogo_table_field'));
//		$save_arm_fields_url = $this->getUrl('php/saveArmFields.php');
		?>
		<script type="text/javascript">
			BudgetSummary = {
				record_id: '<?= $record; ?>',
				instance: '<?= $instance; ?>',
				summary_review_field: '<?= $summary_review_field; ?>',
				summary_data:<?= $summary_review_data; ?>,
				schedule: <?= $budget_table; ?>,
				gng_data: <?= $gonogo_table_data; ?>,
				css_url: "<?= $this->getUrl('css/summary.css'); ?>"
			}
		</script>
		<script type='text/javascript' src='<?= $this->getUrl('js/summary.js'); ?>'></script>
		<?php
	}
	
	public function replaceCCSummaryReviewField($record, $instance, $event_id) {
		$cc_html_url = $this->getUrl("cc_summary.php");
		$cc_replace_field = "summary_review_upload";
		?>
		<script type="text/javascript">
			BudgetSummary = {
				record_id: '<?= $record; ?>',
				event_id: '<?= $event_id; ?>',
				instance: '<?= $instance; ?>',
				cc_summary_review_field: '<?= $cc_replace_field; ?>',
				cc_html_url: '<?= $cc_html_url; ?>'
			}
			$(document).ready(function() {
				if (typeof BudgetSummary.cc_summary_review_field == 'string') {
					$('#' + BudgetSummary.cc_summary_review_field + '-tr').hide();
					$('#surveyinstructions').after("<div id='cc_summary_review'></div>");
					// $("#cc_summary_review_td").append("<div id='cc_summary_review'></div>");
					var ajax_url = BudgetSummary.cc_html_url + "&record_id=" + encodeURI(BudgetSummary.record_id) + "&event_id=" + encodeURI(BudgetSummary.event_id);
					$.ajax(ajax_url).done(function(data) {
						var div = $("div#cc_summary_review");
						div.html(data);
					});
				}
			});
		</script>
		<?php
	}
	
	private function changeSurveySubmitButton($record_id, $event_id, $current_survey_name) {
        $form_sequence = $this->getFormsForEventId($event_id);
		$current_survey_index = array_search($current_survey_name, $form_sequence);
		$next_survey_name = $form_sequence[$current_survey_index + 1];
		
		if ($current_survey_name == end($form_sequence)) {
			?>
			<style>
				button[name="submit-btn-saverecord"].tin-generate-requests {
					max-width: 250px !important;
				}
			</style>
			<script type="text/javascript">
				$(document).ready(function() {
					// remove existing onclick attribute
					var submit_button = $("button[name='submit-btn-saverecord']");
					submit_button.attr('onclick', 'return false;');
					submit_button.button();
					
					// forward user to dashboard page upon survey completion
					submit_button.text("Generate & Send Budget Request");
					submit_button.addClass("tin-generate-requests");
					
					// register click event
					$('body').on("click", "button[name='submit-btn-saverecord']", function(event) {
						// edit form action so redcap_survey_complete can know to do it's thing (redirect the user to summary review page)
						var form_action = $('#form').attr('action');
						
						// add end survey param to prevent survey queue and autocomplete from preventing user from getting redirected
						form_action = $('#form').attr('action');
						var end_survey_param = "&__endsurvey=1";
						if (!form_action.includes(end_survey_param)) {
							$('#form').attr('action', form_action + end_survey_param);
						}
						
						// update form action
						form_action = $('#form').attr('action');
						
						// submit form
						$(this).button('disable');
						dataEntrySubmit(this);
						return false;
					});
				});
			</script>
			<?php
			return;
		}
		?>
		<script type="text/javascript">
			$(document).ready(function() {
				var submit_button = $("button[name='submit-btn-saverecord']");
				submit_button.html("Next");
				submit_button.attr('onclick', '');
				
				// register new click event for old submit button (now with "Next" label)
				$('body').on("click", "button[name='submit-btn-saverecord']", function(event) {
					// edit form action so redcap_survey_complete can know to do it's thing (redirect the user to summary review page)
					var form_action = $('#form').attr('action');
					var redirect_parameter = "&__gotosurvey=<?=$next_survey_name?>";
					if (!form_action.includes(redirect_parameter)) {
						$('#form').attr('action', form_action + redirect_parameter);
					}
					
					// submit form
					$(this).button('disable');
					dataEntrySubmit(this);
					return false;
				});
			});
		</script>
		<?php
	}
	
	private function addDownloadProcedureResourceButton($record, $event_id, $repeat_instance) {
		$dl_proc_wb_url = $this->getUrl("php/downloadProceduresWorkbook.php", true) . "&record=$record&event_id=$event_id&instance=$repeat_instance";
		?>
		<script type="text/javascript">
			$(document).ready(function() {
				var link = "<a href='<?= $dl_proc_wb_url ?>'>Download Study Procedure List <i class='fas fa-download'></i></a>";
				$("#future_procedure_file-tr span").replaceWith(link)
			});
		</script>
		<?php
	}
	
	private function getRecordFormStatus($record_id, $instrument, $event_id) {
		$form_name = $instrument . "_complete";
		$params = [
			"project_id" => $this->getProjectId(),
			"return_format" => 'json',
			"records" => $record_id,
			"fields" => $form_name,
			"events" => $event_id
		];
		$data = json_decode(\REDCap::getData($params), true);
		return $data[0][$form_name];
	}
	
	private function addSummaryReviewLinkToSurvey($rid, $inst, $eid) {
		$buttonHtml = <<<HEREDOC
	<tr>\
		<td colspan=\"2\" style=\"text-align:center;padding:1px 0px 6px 0px;\">\
			<button tabindex=\"1\" name=\"submit-btn-gotosummary\" class=\"jqbutton nowrap ui-button ui-corner-all ui-widget saveandgotosummary\">Save &amp; Go to Review Summary Page</button>\
		</td>\
	</tr>
HEREDOC;
		?>
		<script type="text/javascript">
			$(document).ready(function() {
				// get button html from server
				var buttonHtml = "<?php echo($buttonHtml); ?>";
				
				// add button to survey and initialize with .button()
				$("tr.surveysubmit tbody").append(buttonHtml);
				var button = $("button.saveandgotosummary");
				button.button();
				
				// register click event
				$('body').on("click", "button.saveandgotosummary", function(event) {
					// edit form action so redcap_survey_complete can know to do it's thing (redirect the user to summary review page)
					var form_action = $('#form').attr('action');
					var redirect_parameter = "&__gotosummaryreview=1";
					if (!form_action.includes(redirect_parameter)) {
						$('#form').attr('action', form_action + redirect_parameter);
					}
					
					// submit form
					$(this).button('disable');
					dataEntrySubmit(this);
					return false;
				});
			});
		</script>
		<?php
	}
	
	private function convertSaveAndReturnLaterButton() {
		?>
		<script type="text/javascript">
			$(document).ready(function() {
				// remove existing onclick attribute
				var saveAndReturnButton = $("button[name='submit-btn-savereturnlater']");
				saveAndReturnButton.attr('onclick', 'return false;');
				saveAndReturnButton.button();
				
				// register click event
				$('body').on("click", "button[name='submit-btn-savereturnlater']", function(event) {
					// edit form action so redcap_survey_complete can know to do it's thing (redirect the user to summary review page)
					var form_action = $('#form').attr('action');
					
					// add end survey param to prevent survey queue and autocomplete from preventing user from getting redirected
					form_action = $('#form').attr('action');
					var end_survey_param = "&__endsurvey=1";
					if (!form_action.includes(end_survey_param)) {
						$('#form').attr('action', form_action + end_survey_param);
					}
					
					// update form action
					form_action = $('#form').attr('action');
					
					// submit form
					$(this).button('disable');
					dataEntrySubmit(this);
					return false;
				});
			});
		</script>
		<?php
	}
	
	public function overwriteProceduresOnSOESaved($record) {
		if (empty($record)) {
			\REDCap::logEvent($this->moduleName, "Failed to overwrite Procedures instrument data upon saving Schedule of Event due to empty \$record value.");
			return false;
		}
		
		// get precursor data
		$soe_data = $this->getBudgetTableData($record);
		$soe_data = json_decode($soe_data, true);
		$procedures = $soe_data['procedures'];
		
		// make data object
		$data_to_save = [];
		
		// start settings data to be saved
		$rid_field = $this->getRecordIdField();
		$data_to_save[$rid_field] = $record;
		$data_to_save['proc'] = count($procedures);
		
		foreach ($procedures as $index => $procedure) {
			unset($cost, $i1);
			
			// 0 to 1-based indexing
			$i1 = $index+1;
			
			// formatting -- cost1, cost2, etc require number_2d validation (REDCap enforced)
			$cost = number_format((float) $procedure['cost'], 2);
			
			// remove non-numeric, non-period characters (commas were causing number_2d validation failure)
			$cost = preg_replace("/[^0-9.]/", "", $cost);
			
			$data_to_save["procedure$i1"] = $procedure['name'];
			$data_to_save["cost$i1"] = $cost;
			$data_to_save["cpt$i1"] = $procedure['cpt'];
			$data_to_save["rtc_comments_$i1"] = $procedure['comment'];
			if ($procedure['routine_care'] != "1") {
				$data_to_save["rtc_$i1"] = '0';
			} else {
				$data_to_save["rtc_$i1"] = '1';
			}
		}
		
		$save_params = [
			"project_id" => $this->getProjectId(),
			"dataFormat" => "json",
			"overwriteBehavior" => "normal",
			"data" => json_encode([$data_to_save])
		];
		$result = \REDCap::saveData($save_params);
		if (gettype($result) == 'string') {
			\REDCap::logEvent($this->moduleName, "Failed to overwrite Procedures instrument data upon saving Schedule of Event.\r\nREDCap::saveData error: $result");
		} elseif (!empty($result['errors'])) {
			\REDCap::logEvent($this->moduleName, "Failed to overwrite Procedures instrument data upon saving Schedule of Event.\r\nREDCap::saveData errors: " . implode("\n", $result['errors']));
		}
	}
	
	public function downloadProceduresWorkbook($record_id, $event_id, $instance) {
		$budget_field = $this->getProjectSetting('budget_table_field');
		if (empty($budget_field)) {
			return;
		}
		
		$study_short_name_field = "short_name";
		try {
			$params = [
				"project_id" => $this->getProjectId(),
				"return_format" => "array",
				"records" => $record_id,
				"fields" => [$budget_field, $study_short_name_field]
			];
			$data = \REDCap::getData($params);
			$budget_data = json_decode($data[$record_id][$this->getFirstEventId()][$budget_field], true);
			$procedures = $budget_data['procedures'];
		} catch (\Exception $e) {
			return;
		}
		
		if (empty($procedures)) {
			return;
		}
		
		// create workbook from template in module directory
		$module_path = $this->getModulePath();
		require "$module_path" . "vendor/autoload.php";
		$reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
		$workbook = $reader->load($module_path . "templates/procedures.xlsx");
		$sheet = $workbook->getActiveSheet();
		
		// update study name in wb first cell
		$study_name = $data[$record_id][$this->getFirstEventId()][$study_short_name_field] ?? "<study name>";
		$sheet->setCellValue("A1", "All Procedures for $study_name");
		// update workbook cells
		for ($i = 0; $i < 100; $i++) {
			$name = $procedures[$i-1]['name'];
			$cpt = $procedures[$i-1]['cpt'];
			
			$sheet->setCellValue("B" . ($i + 3), $name);
			$sheet->setCellValue("C" . ($i + 3), $cpt);
		}
		
		// download workbook to user
		header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		header('Content-Disposition: attachment;filename="Procedures.xlsx"');
		header('Cache-Control: max-age=0');
		$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($workbook, 'Xlsx');
		$writer->save('php://output');
	}
	
	public function getSiteInstances($record_id) {
		// build list of form _complete field names for forms in event 2
		$fields = [];
		
		// add record ID field (to get extra identifying fields like redcap_repeat_instance from getData
		$fields[] = $this->getRecordIdField();
		// get this field too
		$fields[] = 'institution';
		
		// build parameters array and get data
		$parameters = [
			"project_id" => $this->getProjectId(),
			"return_format" => 'json',
			"records" => $record_id,
			"fields" => $fields
		];
		$data = json_decode(\REDCap::getData($parameters), true);
		
		// remove non event 2 instance objects
		foreach($data as $index => $obj) {
			if (empty($obj['redcap_repeat_instance']))
				unset($data[$index]);
		}
		
		// re-index
		$data = array_values($data);
		
		return $data;
	}
	
	public function getInstitutionNames($record_id) {
		$names = [];
		
		// build parameters array and get data
		$fields = [];
		for ($i = 1; $i <= 50; $i++) {
			$fields[] = "institution$i";
		}
		$parameters = [
			"project_id" => $this->getProjectId(),
			"return_format" => 'json',
			"records" => $record_id,
			"fields" => $fields
		];
		$data = json_decode(\REDCap::getData($parameters), true)[0];
		
		foreach ($fields as $i => $name) {
			$names[$i+1] = $data[$name];
		}
		return $names;
	}
	
	public function createSiteInstances($record_id) {
		// this function is called upon completing the survey containing [send_to_sites] (if [send_to_sites] === '1' for the associated record)
		$parameters = [
			"project_id" => $this->getProjectId(),
			"return_format" => 'array',
			"records" => $record_id,
			"fields" => 'eoi'
		];
		$data = \REDCap::getData($parameters);
		$eoi_count = intval(reset($data[$record_id])['eoi']);
		$log_message = "Attempting to create site instances upon submission of survey containing [sites_to_send] field:\n";
	
		if ($eoi_count > 0) {
			// get current instance data and site names
			$instances = $this->getSiteInstances($record_id);
			$site_names = $this->getInstitutionNames($record_id);
	
			// if there are instances missing, add them
			for ($site_index = 1; $site_index <= $eoi_count; $site_index++) {
				$found = false;
				foreach($instances as $instance) {
					if ($instance['redcap_repeat_instance'] == $site_index) {
						$found = true;
						break;
					}
				}
	
				if (!$found) {
					$missing_instance = [];
					$primary_key_name = $this->getRecordIdField();
					$missing_instance[$primary_key_name] = "$record_id";
					$missing_instance['redcap_repeat_instance'] = $site_index;
					$missing_instance['redcap_event_name'] = "event_1_arm_1";
					$missing_instance['institution'] = $site_names[$site_index];
					$instances[] = $missing_instance;
				}
			}
	
			// set form complete status 0s for instances whose form complete field is empty
			// if instance institution name is empty, try to fill that, too
			foreach ($instances as $instance) {
				if (empty($instance['institution']))
					$instance['institution'] = $site_names[$instance['redcap_repeat_instance']];
			}
	
			// save all instances
			$payload = json_encode($instances);
			$parameters = [
				"project_id" => $this->getProjectId(),
				"dataFormat" => 'json',
				"data" => $payload
			];
			$result = \REDCap::saveData($parameters);
	
			// determine log message
			if (!empty($result['errors'])) {
				$log_message .= "FAILURE\nThe [eoi] field for record '$record_id' is > 0 but there was an error saving the data:\n";
				$log_message .= "\\REDCap::saveData return array ['errors']:\n" . print_r($result['errors'], true) . "\n";
				// $log_message .= "\\REDCap::saveData data argument given:\n" . print_r($payload, true);
			} else {
				// refresh instances array from db so we can verify instance count
				$instances = $this->getSiteInstances($record_id);
	
				// count instances of second event
				$sum = 0;
				foreach ($instances as $instance) {
					if ($instance['redcap_event_name'] == 'event_1_arm_1')
						$sum++;
				}
				if ($sum >= $eoi_count) {
					$log_message .= "SUCCESS\nRecord '$record_id' has at least $eoi_count instances of event 'Event 1'";
				} else {
					$log_message .= "FAILURE\n\\REDCap::saveData returned no errors, but the module failed to verify the creation of $eoi_count new 'Event 1' instances. Count: $sum.";
				}
			}
		} else {
			$log_message .= "FAILURE\nThe [eoi] field for record '$record_id' is not > 0.";
		}
	
		\REDCap::logEvent($this->moduleName, $log_message);
	}
	
	public function determineRecordIdFromMessage($email_message) {
		// $pattern = "/You have been identified as a possible site for (.*?)\./";
		$pattern = "/with their proposal titled: (.*?)\./";
		preg_match($pattern, $email_message, $match);
		$short_name = $match[1];
		if (empty($short_name)) {
			// todo: how to handle failure?
			return;
		}
		$rid_field = $this->getRecordIdField();
		$eid1 = $this->getFirstEventId();
		$parameters = [
			"project_id" => $this->getProjectId(),
			"return_format" => 'json',
			"events" => $eid1,
			"filterLogic" => "[short_name]='$short_name'",
			"fields" => $rid_field
		];
		try {
			$data = json_decode(\REDCap::getData($parameters), true);
			$rid = $data[0][$rid_field];
			if (empty($rid)) {
				throw new \Exception("Couldn't determine record ID from the given email message");
			}
		} catch (\Exception $e) {
			return null;
		}
		return $rid;
	}
	
	public function saveIntakeForm($record, $intake_form) {
		if (empty($record)) {
			// todo, how to handle failure?
			return;
		}
		$this->removeLogs("record = ? AND message = ?", [
			$record,
			'study_intake_form_message'
		]);
		$this->log("study_intake_form_message", [
			"record" => $record,
			"study_intake_form" => $intake_form
		]);
	}
	
	public function getStudyIntakeForm($record) {
		$sql = "SELECT study_intake_form WHERE record = ? AND message = ?";
		$result = $this->queryLogs($sql, [
			$record,
			"study_intake_form_message"
		]);
		return $result->fetch_assoc()['study_intake_form'];
	}
	
	public function makeStudyIntakeForm($cc_data) {
		$td1 = $cc_data['cc_contact_person_fn'] . ' ' . $cc_data['cc_contact_person_ln'] . '; ' . $cc_data['cc_email'] . '; ' . $cc_data['cc_phone_number'];
		$funding_mechanism = $cc_data['funding_mechanism'] ?? $cc_data['funding_other'];
		
		$survey_link = \REDCap::getSurveyLink($cc_data['record_id'], $this->study_intake_form_name, $cc_data['event_id']);
		
		if (!empty($cc_data['protocol_synopsis'])) {
			$project_id = $this->getProjectId();
			$page = $this->study_intake_form_name;
			$edoc_id = $cc_data['protocol_synopsis'];
			$edoc_id_hash = \Files::docIdHash($edoc_id);
			$protocol_link = APP_PATH_WEBROOT . "DataEntry/file_download.php?pid=$project_id&field_name=protocol_synopsis&record={$cc_data['record_id']}&event_id={$this->getFirstEventId()}&doc_id_hash=$edoc_id_hash&instance=1&id=$edoc_id";
			$protocol_link = "<a href='$protocol_link'>Protocol Synopsis File</a>";
		} else {
			$protocol_link = "<small style='font-weight: bold; color: #777;'>(No protocol synopsis file attached)</small>";
		}
		
		$styles = [];
		$styles['title'] = "style=\"font-weight: 200; font-size: 1.5rem; align-self: start; margin-left: 12%; margin-top: 24px;\"";
		$styles['table'] = "style=\"border: 1px solid black; font-size: 1rem; padding: 8px; text-align: center;\"";
		$styles['th'] = "style=\"border: 1px solid black; font-size: 1rem; color: white; padding: 6px 18px 24px 18px; text-align: center;\"";
		$styles['td'] = "style=\"border: 1px solid black; font-size: 1rem; padding: 8px; text-align: center;\"";
		
		return <<<HEREDOC
		<!--STUDY INTAKE FORM-->
		<div>
		<h5 class="table_title" {$styles['title']}><u>STUDY INTAKE FORM</u></h5>
		<table class="cc_rev_table blue_table_headers" {$styles['table']}>
			<thead>
				<tr>
					<th {$styles['th']}>COORDINATING CENTER/STUDY INFORMATION</th>
					<th {$styles['th']}>INFORMATION PROVIDED</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Coordinating Center Contact Information</a></td>
					<td {$styles['td']}>$td1</td>
				</tr>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Short Study Name</a></td>
					<td {$styles['td']}>{$cc_data['short_name']}</td>
				</tr>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Protocol Synopsis</a></td>
					<td {$styles['td']}>$protocol_link</td>
				</tr>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Brief Study Description</a></td>
					<td {$styles['td']}>{$cc_data['brief_stud_description']}</td>
				</tr>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Description of Study Intervention</a></td>
					<td {$styles['td']}>{$cc_data['prop_summary_describe2_5f5']}</td>
				</tr>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Enrollment Goals</a></td>
					<td {$styles['td']}>
						Estimated number of subjects: {$cc_data['number_subjects']}<br>
						Study Population: {$cc_data['study_population']}<br>
						Estimated number of sites: {$cc_data['number_sites']}
					</td>
				</tr>
				<tr>
					<td {$styles['td']}><a href="$survey_link" style="font-size: 1rem;">Funding/Support for the Proposal</a></td>
					<td {$styles['td']}>Current funding source: {$cc_data['funding_source']}<br>
						Funding mechanism: $funding_mechanism<br>
						Identified I/C: {$cc_data['institute_center']}<br>
						Grant/application number: {$cc_data['grant_app_no']}<br>
						FOA (if applicable): {$cc_data['funding_opp_announcement']}<br>
						Anticipated total budget (direct and indirect): {$cc_data['anticipated_budget']}<br>
						Total duration of funding period: {$cc_data['funding_duration']}
					</td>
				</tr>
			</tbody>
		</table>
		</div>
HEREDOC;
	}
	
	public function makeStudyIntakeFormForAttachment($cc_data) {
		// this function should be exactly as above, except the first column should contain no hyperlinks
		
		$td1 = $cc_data['cc_contact_person_fn'] . ' ' . $cc_data['cc_contact_person_ln'] . '; ' . $cc_data['cc_email'] . '; ' . $cc_data['cc_phone_number'];
		$funding_mechanism = $cc_data['funding_mechanism'] ?? $cc_data['funding_other'];
		
		$survey_link = \REDCap::getSurveyLink($cc_data['record_id'], $this->study_intake_form_name, $cc_data['event_id']);
		
		if (!empty($cc_data['protocol_synopsis'])) {
			$project_id = $this->getProjectId();
			$page = $this->study_intake_form_name;
			$edoc_id = $cc_data['protocol_synopsis'];
			$edoc_id_hash = \Files::docIdHash($edoc_id);
			$protocol_link = APP_PATH_WEBROOT . "DataEntry/file_download.php?pid=$project_id&field_name=protocol_synopsis&record={$cc_data['record_id']}&event_id={$this->getFirstEventId()}&doc_id_hash=$edoc_id_hash&instance=1&id=$edoc_id";
			$protocol_link = "<a href='$protocol_link'>Protocol Synopsis File</a>";
		} else {
			$protocol_link = "<small style='font-weight: bold; color: #777;'>(No protocol synopsis file attached)</small>";
		}
		
		$styles = [];
		$styles['title'] = "style=\"font-weight: 200; font-size: 1.5rem; align-self: start; margin-left: 12%; margin-top: 24px;\"";
		$styles['table'] = "style=\"border: 1px solid black; font-size: 1rem; padding: 8px; text-align: center;\"";
		$styles['th'] = "style=\"border: 1px solid black; font-size: 1rem; color: white; padding: 6px 18px 24px 18px; text-align: center;\"";
		$styles['td'] = "style=\"border: 1px solid black; font-size: 1rem; padding: 8px; text-align: center;\"";
		
		return <<<HEREDOC
		<!--STUDY INTAKE FORM-->
		<div>
		<h5 class="table_title" {$styles['title']}><u>STUDY INTAKE FORM</u></h5>
		<table class="cc_rev_table blue_table_headers" {$styles['table']}>
			<thead>
				<tr>
					<th {$styles['th']}>COORDINATING CENTER/STUDY INFORMATION</th>
					<th {$styles['th']}>INFORMATION PROVIDED</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Coordinating Center Contact Information</td>
					<td {$styles['td']}>$td1</td>
				</tr>
				<tr>
					<td>Short Study Name</td>
					<td {$styles['td']}>{$cc_data['short_name']}</td>
				</tr>
				<tr>
					<td>Protocol Synopsis</td>
					<td {$styles['td']}>$protocol_link</td>
				</tr>
				<tr>
					<td>Brief Study Description</td>
					<td {$styles['td']}>{$cc_data['brief_stud_description']}</td>
				</tr>
				<tr>
					<td>Description of Study Intervention</td>
					<td {$styles['td']}>{$cc_data['prop_summary_describe2_5f5']}</td>
				</tr>
				<tr>
					<td>Enrollment Goals</td>
					<td {$styles['td']}>
						Estimated number of subjects: {$cc_data['number_subjects']}<br>
						Study Population: {$cc_data['study_population']}<br>
						Estimated number of sites: {$cc_data['number_sites']}
					</td>
				</tr>
				<tr>
					<td>Funding/Support for the Proposal</td>
					<td {$styles['td']}>Current funding source: {$cc_data['funding_source']}<br>
						Funding mechanism: $funding_mechanism<br>
						Identified I/C: {$cc_data['institute_center']}<br>
						Grant/application number: {$cc_data['grant_app_no']}<br>
						FOA (if applicable): {$cc_data['funding_opp_announcement']}<br>
						Anticipated total budget (direct and indirect): {$cc_data['anticipated_budget']}<br>
						Total duration of funding period: {$cc_data['funding_duration']}
					</td>
				</tr>
			</tbody>
		</table>
		</div>
HEREDOC;
	}
	
	public function redcap_every_page_top($project_id) {
        $this->initialize();
        $event_id = $_GET['event_id'];
        $instrument = $_GET['page'];
        $request_uri = $_SERVER['REQUEST_URI'];
        if ($instrument == 'study_coordinating_center_information' && $_GET['__endpublicsurvey']) {
            $record   = $_GET['id'];
            $event_id = $_GET['event_id'];
            if (strpos($request_uri, '__gotosurvey=') !== false) {
                preg_match("/__gotosurvey=(.*?)(?:&|$)/", $request_uri, $matches);
                $next_survey_name = $matches[1];
                $surveyLink       = \REDCap::getSurveyLink($record, $next_survey_name, $event_id);
                // this works but survey queue and survey auto-continue features will rewrite location headers if configured to do so via the form's 'Survey Settings' page
                header("Location: $surveyLink");
            }
        }
    }
	
	public function redcap_survey_page($project_id, $record, $instrument, $event_id, $group_id, $survey_hash, $response_id, $repeat_instance) {
        $this->initialize();
		// replace schedule of event field in survey page with generated table
		if ($instrument == $this->getBudgetForm()) {
			$this->replaceScheduleFields($record);
		}
		
        //TODO Remove or update once we figure out if this feature is staying
		// replace Go/No-Go field in survey page with generated table
		//if ($instrument == $this->gonogo_table_instrument) {
		//	$this->replaceGoNoGoFields($record, $repeat_instance);
		//}
		
		// replace Summary Review field in survey page with interface
		//if ($instrument == $this->getSummaryForm()) {
		//	$this->replaceSummaryReviewField($record, $repeat_instance);
		//}
        
        //TODO Remove or update once we figure out if this feature is staying
		//if ($instrument == 'enter_cost_to_run_procedure') {
		//	$this->addDownloadProcedureResourceButton($record, $event_id, $repeat_instance);
		//}
		
		if ($event_id == $this->getFirstEventId()) {
            if ($instrument != $this->getSummaryForm()) {
                $this->addSummaryReviewLinkToSurvey($record, $instrument, $event_id);
            } else {
                $this->replaceCCSummaryReviewField($record, $repeat_instance, $event_id);
            }
			//$this->convertSaveAndReturnLaterButton();
			$this->changeSurveySubmitButton($record, $event_id, $instrument);
		}
		
		$site_event_forms_to_convert_submit_button = [
            "budget_review_and_feasibility",
            "review_fixed_costs",
			"enter_cost_to_run_procedure",
			"gonogo_table"
		];
		if (in_array($instrument, $site_event_forms_to_convert_submit_button) !== false) {
			$this->changeSurveySubmitButton($record, $event_id, $instrument);
		}
	}
    
    public function redcap_survey_complete($project_id, $record, $instrument, $event_id, $group_id, $survey_hash, $response_id, $repeat_instance) {
        $this->initialize();
        if ($instrument == $this->send_to_sites_instrument) {
            $parameters = [
                "project_id"    => $project_id,
                "return_format" => 'json',
                "records"       => $record,
                "fields"        => 'send_to_sites'
            ];
        
            $data = json_decode(\REDCap::getData($parameters), true);
            if ($data[0]['send_to_sites'] === '1') {
                $this->createSiteInstances($record);
            }
        }
    
        $request_uri = $_SERVER['REQUEST_URI'];
        if (strpos($request_uri, '__gotosurvey=') !== false) {
            preg_match("/__gotosurvey=(.*?)(?:&|$)/", $request_uri, $matches);
            $next_survey_name = $matches[1];
            $surveyLink       = \REDCap::getSurveyLink($record, $next_survey_name, $event_id);
            // this works but survey queue and survey auto-continue features will rewrite location headers if configured to do so via the form's 'Survey Settings' page
            header("Location: $surveyLink");
        }
    
        if (strpos($request_uri, '__gotosummaryreview=1') !== false) {
            $surveyLink = \REDCap::getSurveyLink($record, 'summary_review_page', $event_id);
            header("Location: $surveyLink");
        }
    
        if ($instrument === "schedule_of_event") {
            // overwrite Procedures instrument with procedures information from Schedule of Event table
            if (!empty($record)) {
                $this->overwriteProceduresOnSOESaved($record);
            }
        }
    }
	
	public function redcap_email($to, $from, $subject, $message, $cc, $bcc, $fromName, $attachments) {
		$magic_text = 'LDVj89w3j4v9SJG43w4gsdkgjg4J';
		
		// return (null) early if we don't find the magic text in the email message
		if (strpos($message, $magic_text) === false) {
			return;
		}
		// if email already has study intake form attachment, throw exception because that should never happen
		if (isset($attachments["Study_Intake_Form.html"])) {
			$err_msg = "redcap_email is called with a message that includes the alert marker text ($magic_text) AND an attached 'Study_Intake_Form.html'. It's likely this email was improperly generated/handled.";
			$this->log_email_event($to, $from, $subject, $err_msg);
			throw new \Exception("redcap_email is called with a message that includes the alert marker text ($magic_text) AND an attached 'Study_Intake_Form.html'. It's likely this email was improperly generated/handled.");
		}
		
		// determine the record this email is associated with (always log failure to determine record ID)
		$rid = $this->determineRecordIdFromMessage($message);
		if (empty($rid)) {
			$log_msg = "The ".$this->moduleName." will not send this email -- can't determine record ID to fetch Study Intake Form!";
			$this->log_email_event($to, $from, $subject, $log_msg);
			return false;
		}
		
		
		// add Study Intake Form to new email and send (via ::email)
		$new_attachments = $attachments;
		$intake_form = $this->getStudyIntakeForm($rid);
		
		// add stylesheet, metadata, html element and head/body wrappers and then convert to PDF
		$dompdf = $this->packageStudyIntakeFormAndConvertToPDF($intake_form);
		$pdf_output_string = $dompdf->output();
		
		$temp_file_name = tempnam(APP_PATH_TEMP, 'INSTITUTEBUDGET_ATTACHMENT');
		$temp_file = fopen($temp_file_name, "w");
		fwrite($temp_file, $pdf_output_string);
		fclose($temp_file);
		$new_attachments["Proposal Information.pdf"] = $temp_file_name;
		
		// remove $magic_text from message to prevent infinite loop
		$message = str_replace($magic_text, "", $message);
		$email_sent = \REDCap::email($to, $from, $subject, $message, $cc, $bcc, $fromName, $new_attachments);
		
		// determine whether we should log successful attachment/resends or not
		$log_successful_sends = $this->getProjectSetting('enable_email_logging');
		if ($email_sent && $log_successful_sends) {
			$log_msg = "The ".$this->moduleName." is capturing this email, attaching a Study Intake Form, and re-sending the email.";
			$this->log_email_event($to, $from, $subject, $log_msg);
		} else {
			$log_msg = "The ".$this->moduleName." attached a Study Intake Form but failed to send this email (\REDCap::email failure)";
			$this->log_email_event($to, $from, $subject, $log_msg);
		}
		
		// prevent intercepted email from sending (it doesn't have the Study Intake Form attached)
		return false;
	}
    
    public function redcap_module_link_check_display($project_id, $link) {
        if(!empty($project_id)) {
            return $link;
        }
    }
	
	private function log_email_event($to, $from, $subject, $log_message) {
		\REDCap::logEvent($this->moduleName, "Found 'Identify Site' email from Budget project Alert:
		to: " . db_escape($to) . "
		from: " . db_escape($from) . "
		subject: " . db_escape($subject) . "
		action: $log_message");
	}
	
}