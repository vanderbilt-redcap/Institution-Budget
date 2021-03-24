<?php
// include header
require_once APP_PATH_DOCROOT . 'ProjectGeneral/header.php';

// get procedure costs
try {
	$procedure_costs = $module->getProcedureCosts();
} catch (\Exception $e) {
	
}

// // print metadata
// $project = new \Project($module->getProjectId());
// echo "<pre>";
// print_r($project);
// echo "</pre>";

// make temporary mock data
$arms = $module->getArms();
$visits = $module->getVisits();
$columns = count($visits);
?>

<!-- show page title -->
<h3>TIN Budget Tool: Coordinating Center - Enter Data</h3>

<?php
// show alert if procedures field not configured
if (!$procedure_costs) {
	?>
	<div class="alert alert-warning col-md-6 col-sm-9" style="border-color: #ffcca9 !important;">
		<p>The TIN Budget module was unable to determine which field contains procedure cost information.</p>
		<p>Select a procedure cost field in the External Modules page 'Configure' modal.</p>
	</div>
	<?php
} else {
	// add arm dropdown buttons
	echo "<div id='arm_dropdowns' class='mb-3'>";
	foreach ($arms as $i => $arm) {
		echo '<div class="dropdown arm">
	<button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton' . $i . '" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
		Arm ' . ($i + 1) . ': ' . $arm . '
	</button>
	<div class="dropdown-menu" aria-labelledby="dropdownMenuButton' . $i . '">
		<a class="dropdown-item" href="#">Copy Arm ' . ($i + 1) . ' data to Arm ' . ($i + 2) . '</a>
		<a class="dropdown-item" href="#">Copy Arm ' . ($i + 1) . ' data to all arms</a>
		<a class="dropdown-item" href="#">Clear all data on this arm</a>
	</div>
</div>';
	}
	echo "</div>";
	?>
	<table id='budget' data-arm='1'>
		<thead>
			<tr>
				<th></th>
				<?php
					// add visit rows
					foreach ($visits as $visit) {
						echo "<th class='pr-3 visit'>$visit</th>";
					}
				?>
			</tr>
		</thead>
		<tbody>
			<?php
				// add procedure rows
				foreach ($procedure_costs as $procedure => $cost) {
					echo "<tr>";
					echo "<td class='procedure'>$procedure</td>";
					for ($i = 1; $i <= $columns; $i++) {
						echo "<td><input data-procedure='$procedure' data-cost='$cost' data-visit='{$visits[$i - 1]}' type='checkbox' class='procedure_select'></td>";
					}
					echo "</tr>";
				}
				
				// add totals row
				echo "<tr>";
				echo "<td>Total $$</td>";
				for ($i = 1; $i <= $columns; $i++) {
					echo "<td class='visit_total' data-visit='{$visits[$i-1]}'></td>";
				}
				echo "</tr>";
			?>
		</tbody>
	</table>
	<?php
}
?>


<!-- -->
<script type='text/javascript'>
	TINBudget = {
		budget_css_url: '<?= $module->getUrl('css/budget.css'); ?>'
	}
</script>
<script type='text/javascript' src='<?= $module->getUrl('js/budget.js'); ?>'></script>
<?php
require_once APP_PATH_DOCROOT . 'ProjectGeneral/footer.php';