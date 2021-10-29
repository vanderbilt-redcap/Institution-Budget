<?php

// get procedure costs
ob_start();
echo "<div id='budget_table'>";
try {
	if (get_class($this) == 'Vanderbilt\TINBudget\TINBudget') {
		// survey page shim, may eventually want to convert $module to $this everywhere in this file (although that will break including this php script into stand-alone module pages)
		$module = $this;
	}
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
			<button type="button" class="btn btn-outline-secondary dropdown-toggle" id="dropdownArm<?= $i+1 ?>" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
				<?= "Arm " . ($i+1) . ": {$arm->name}" ?>
			</button>
			<div class="dropdown-menu" aria-labelledby="dropdownArm<?= $i+1 ?>">
				<a class="dropdown-item show_arm" href="#">Show this arm's table</a>
				<a class="dropdown-item copy_arm" href="#">Copy all data to another arm</a>
				<a class="dropdown-item create_arm" href="#">Create another arm</a>
				<a class="dropdown-item rename_arm" href="#">Rename this arm</a>
				<a class="dropdown-item clear_arm" href="#">Clear all data on this arm</a>
				<a class="dropdown-item delete_arm" href="#">Delete this arm</a>
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
							?>
							<th>
							<div class="dropdown visit" data-visit="<?= $visit_i+1 ?>">
								<button type="button" class="btn btn-outline-secondary dropdown-toggle" id="dropdownVisit<?= $visit_i+1 ?>" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
									<?= "Visit " . ($visit_i+1) . ": $visit_name" ?>
								</button>
								<div class="dropdown-menu" aria-labelledby="dropdownVisit<?= $visit_i+1 ?>">
									<a class="dropdown-item create_visit" href="#">Create another visit</a>
									<a class="dropdown-item rename_visit" href="#">Rename this visit</a>
									<a class="dropdown-item copy_visit" href="#">Copy procedure counts to another visit</a>
									<a class="dropdown-item clear_visit" href="#">Clear procedure counts for this visit</a>
									<a class="dropdown-item delete_visit" href="#">Delete this visit</a>
								</div>
							</div>
							</th>
							<?php
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
						
						// add procedure cell
						?>
						<td class="procedure"><?= "$proc_name" ?></td>
						<?php
						
						// add procedure count cells
						for ($i = 1; $i <= $columns; $i++) {
							echo "<td class='proc_cell' data-visit='$i'>
							<button type='button' class='btn btn-outline-primary proc_decrement'>-</button>
							<span data-cost='$proc_cost' class='proc_count mx-2'>0</span>
							<button type='button' class='btn btn-outline-primary proc_increment'>+</button>
							</td>";
						}
						echo "</tr>";
					}
					
					// add totals row
					echo "<tr>";
					echo "<td>Total $$</td>";
					for ($i = 1; $i <= $columns; $i++) {
						echo "<td class='visit_total' data-visit='$i'>0</td>";
					}
					echo "</tr>";
				?>
			</tbody>
		</table>
	<?php
	}
	?>
	</div>
	<div style="margin-left: 32px; margin-top: 8px;">
		<button id="tin_budget_undo" type="button" class="btn btn-outline-primary button_bank" disabled>Undo</button>
		<button id="tin_budget_redo" type="button" class="btn btn-outline-primary button_bank" disabled>Redo</button>
		<button id="tin_budget_edit_procedures" type="button" class="btn btn-outline-primary button_bank">Edit Procedures</button>
	</div>
	<?php
}
?>

<div id="tinbudget_modal" class="modal" tabindex="-1" role="dialog">
	<div class="modal-dialog" role="document">
		<!-- rename arm -->
		<div id="tinbudget_rename_arm" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Rename Arm</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p>Enter a new name for this arm:</p>
				<input class="w-100" type="text">
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary rename_arm" data-dismiss="modal">Rename Arm</button>
				<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
			</div>
		</div>
		
		<!-- copy arm -->
		<div id="tinbudget_copy_arm" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Copy Arm</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p>Select which arm(s) you'd like to overwrite (all visits and procedure counts):</p>
				<div id="select_arms">
					
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary overwrite_arms" data-dismiss="modal">Overwrite Arm(s)</button>
				<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
			</div>
		</div>
		
		<!-- rename visit -->
		<div id="tinbudget_rename_visit" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Rename Visit</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p>Enter a new name for this visit:</p>
				<input class="w-100" type="text">
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary rename_visit" data-dismiss="modal">Rename Visit</button>
				<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
			</div>
		</div>
		
		<!-- copy visit -->
		<div id="tinbudget_copy_visit" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Copy Visit</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p>Select the visit(s) to copy procedure counts to:</p>
				<div class="alert alert-warning" role="alert">Note: This will overwrite existing counts for selected visits!</div>
				<div id="select_visits">
					
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary copy_visit_counts" data-dismiss="modal">Overwrite Counts</button>
				<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
			</div>
		</div>
		
		<!-- edit procedures -->
		<div id="tinbudget_edit_procedures" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Edit Procedures</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p>Update the costs associated with each procedure in the table below:</p>
				<table id="edit_procedures">
					<thead>
						<tr>
							<th>Delete</th>
							<th>Procedure Name</th>
							<th>Cost ($)</th>
							<th>CPT Code</th>
						</tr>
					</thead>
					<tbody>
					</tbody>
				</table>
				<div class="mt-3" id="edit_procedure_buttons">
					<button type='button' class="btn btn-outline-primary" id="add_proc_table_row">Add Row</button>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary save_proc_changes" data-dismiss="modal">Save Changes</button>
				<button type="button" class="btn btn-secondary cancel_proc_changes" data-dismiss="modal">Cancel</button>
			</div>
		</div>
		
		<!-- confirm delete -->
		<div id="tinbudget_confirm_delete" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Confirm Delete</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p></p>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary confirm_delete" data-dismiss="modal">Yes, Delete</button>
				<button type="button" class="btn btn-secondary cancel_delete" data-dismiss="modal">No, Keep</button>
			</div>
		</div>
	</div>
</div>
</div>
