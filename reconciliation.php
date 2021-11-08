<?php

$table_data = $module->getReconciliationData();
if (gettype($table_data) == 'string') {
	echo "<div class='alert alert-warning w-50' style='border: 1px solid orange !important;'>$recon_data</div>";
	exit();
}

?>

<h3>Coordinating Center Reconciliation Table</h3>
<table id='reconciliation' class='w-75'>
	<thead>
		<tr>
			<th>Institution</th>
			<th>Date of Request</th>
			<th>Date of Response</th>
			<th>Decision</th>
			<th>Decision Comments</th>
			<th>Action</th>
		</tr>
	</thead>
	<tbody>

<?php

// tabulate site data
$action_dropdown = "<div class='dropdown'>
	<button class='btn btn-primary dropdown-toggle site-action-dd' type='button' id='_id' data-toggle='dropdown' aria-expanded='false'>
		View
	</button>
	<ul class='dropdown-menu' aria-labelledby='_id'>
		<li><a class='action-item dropdown-item' href='#'>Contact Site</a></li>
		<li><a class='action-item dropdown-item' href='#'>Accept Decision</a></li>
		<li><a class='action-item dropdown-item' href='#'>Provide Information</a></li>
		<li><a class='action-item dropdown-item' href='#'>Create Note</a></li>
		<li><a class='action-item dropdown-item' href='#'>Send Reminder</a></li>
	</ul>
</div>";

foreach ($table_data as $site_index => $row) {
// foreach ($mock_data as $site_index => $row) {
	// determine row color
	$row_class = "";
	if (strtoupper($row['decision']) == "NO-GO") {
		$row_class = " class='red'";
	} elseif (strtoupper($row['decision']) == "MORE INFO NEEDED") {
		$row_class = " class='yellow'";
	}
	
	// make action button
	$action_button = str_replace("_id", "site_action_dd_$site_index", $action_dropdown);
	
	echo "
		<tr$row_class>
			<td>{$row["name"]}</td>
			<td>{$row["date_of_request"]}</td>
			<td>{$row["date_of_response"]}</td>
			<td>{$row["decision"]}</td>
			<td>{$row["decision_comments"]}</td>
			<td class='action_button'>$action_button</td>
		</tr>";
}

?>
	</tbody>
</table>
<script type='text/javascript'>
	TIN_Budget = {
		css_url: "<?php echo($module->getUrl('css/reconciliation.css')); ?>"
	};
</script>
<script type='text/javascript' src='<?= $module->getUrl('js/reconciliation.js'); ?>'></script>