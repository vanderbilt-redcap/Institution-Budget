<?php
// get procedure costs
try {
	$arms = $module->getArms();
	$procedures = $module->getProcedures();
	$rid = preg_replace("/\D/", '', $_GET['rid']);
} catch (\Exception $e) {
	?>
	<div class="alert alert-warning col-md-6 col-sm-9" style="border-color: #ffcca9 !important;">
		<p>The TIN Budget module was unable to determine which record ID to use when fetching schedule data. Please set a 'rid' query argument for this URL.</p>
	</div>
	<?php
}

if (!empty($rid) and (empty($arms) or empty($procedures))) {
	?>
	<div class="alert alert-warning col-md-6 col-sm-9" style="border-color: #ffcca9 !important;">
		<p>The TIN Budget module was able to retrieve record data, but either the arms or the procedures are undefined. Please complete the "Budget" and "Procedures" forms for record <b><?= $rid ?></b>.</p>
	</div>
	<?php
} else {
	// show schedule of events for these arms/procedures
	
	// add arm dropdown buttons
	?><div id='arm_dropdowns' class='mb-3'><?php
	foreach ($arms as $i => $arm) { ?>
		<div class="dropdown arm" data-arm="<?= $i+1 ?>">
			<button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton<?= $i+1 ?>" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
				<?= "Arm " . ($i+1) . ": {$arm->name}" ?>
			</button>
			<div class="dropdown-menu" aria-labelledby="dropdownMenuButton' . $i . '">
				<a class="dropdown-item show_arm_table" href="#">Show table for Arm <?= $i+1 ?></a>
				<?php if (($i + 1) != count($arms)) { ?>
					<a class="dropdown-item copy_to_next_arm" href="#">Copy Arm <?= $i+1 ?> data to Arm <?= $i+2 ?></a>
				<?php } ?>
				<a class="dropdown-item copy_to_all_arms" href="#">Copy Arm <?= $i+1 ?> data to all arms</a>
				<a class="dropdown-item clear_arm_table" href="#">Clear all data on this arm</a>
			</div>
		</div><?php
	}
	?></div><?php
	// add arm tables
	?><div id="arm_tables"><?php
	foreach ($arms as $i => $arm) {
		?><table class="arm_table" data-arm="<?= $i + 1 ?>">
			<thead>
				<tr>
					<th></th>
					<?php
						// add visit rows
						foreach ($arm->visits as $visit_i => $visit) {
							$visit_name = $visit->name;
							echo "<th class='pr-3 visit'>$visit_name</th>";
						}
					?>
				</tr>
			</thead>
			<tbody>
				<?php
					// add procedure rows
					$columns = count($arm->visits);
					foreach ($procedures as $proc_i => $procedure) {
						$proc_name = $procedure->name;
						$proc_cost = $procedure->cost;
						echo "<tr>";
						echo "<td class='procedure'>$proc_name</td>";
						for ($i = 1; $i <= $columns; $i++) {
							// echo "<td><input data-procedure-index='$proc_i' data-cost='$proc_cost' data-visit='" . ($i + 1) . "' type='checkbox' class='procedure_select'></td>";
							echo "<td class='proc_cell' data-visit='" . ($i + 1) . "'>
							<button class='btn btn-outline-primary proc_decrement'>-</button>
							<span data-cost='$proc_cost' class='proc_count mx-2'>0</span>
							<button class='btn btn-outline-primary proc_increment'>+</button>
							</td>";
						}
						echo "</tr>";
					}
					
					// add totals row
					echo "<tr>";
					echo "<td>Total $$</td>";
					for ($i = 1; $i <= $columns; $i++) {
						echo "<td class='visit_total' data-visit='" . ($i + 1) . "'>0</td>";
					}
					echo "</tr>";
				?>
			</tbody>
		</table><?php
	}
	?></div><?php
}
?>


<!-- -->
<script type='text/javascript'>
	TINBudget = {
		budget_css_url: '<?= $module->getUrl('css/budget.css'); ?>'
	}
</script>
<script type='text/javascript' src='<?= $module->getUrl('js/budget.js'); ?>'></script>