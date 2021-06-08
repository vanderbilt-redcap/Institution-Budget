
TINGoNoGo.initialize = function() {
	if (typeof TINGoNoGo.gng_field == 'string') {
		$('#' + TINGoNoGo.gng_field + '-tr').before("<div id='gonogo'><h3>Interested Site Review: GO/NO-GO Decision</h3></div>")
		$('#' + TINGoNoGo.gng_field + '-tr').hide();
	}
	
	var schedule = TINGoNoGo.schedule;
	
	if (typeof schedule != 'object') {
		$("div#gonogo").append("<div class='alert alert-secondary w-50' role='alert'>\
			The TIN Budget module couldn't find schedule data to create the Go/No-Go table.\
		</div>");
	} else {
		// make arm buttons
		if (schedule.arms.length == 0) {
			$("div#gonogo").append("<div class='alert alert-secondary w-50' role='alert'>\
				The TIN Budget module found schedule data but no arms were listed.\
			</div>");
			return;
		} else {
			$("div#gonogo").append("<div id='gng_arms'></div>");
			schedule.arms.forEach((arm, arm_i) => $('#gng_arms').append("<button data-arm='" + arm_i + "' type='button' class='gng_arm btn btn-primary'>Arm " + (arm_i + 1) + ": " + String(arm.name) + "</button>"));
		}
		
		// append div to contain table and sidebar
		$("div#gonogo").append("<div id='tables_and_sidebars'></div>");
		$("div#gonogo div#tables_and_sidebars").append("<div id='gng_arm_tables'></div>");
		
		// create table with procedures as rows (and then add a final sum/totals row), and with visits as columns
		schedule.arms.forEach(function(arm, arm_i) {
			$('#gng_arm_tables').append(TINGoNoGo.makeArmTable(arm, arm_i));
		});
		
		$("div#gonogo div#tables_and_sidebars").append("<div id='gng_sidebars'></div>");
		
		// append a sidebar per arm
		schedule.arms.forEach((arm, arm_i) => $('#gng_sidebars').append(TINGoNoGo.makeArmSidebar(arm_i)));
	}
	
	TINGoNoGo.showArmTable(0);
}

TINGoNoGo.makeArmTable = function(arm, arm_i) {
	// create table element and thead
	var gng_table = "<table class='gng_arm_table' data-arm='" + arm_i + "'>\
		<thead>\
			<th></th>";
	
	// assume sidebar will be green, first visit total over CC turns it red
	var sidebar_color = "green";
	
	TINGoNoGo.schedule.arms[arm_i].visits.forEach(function(visit, visit_i) {
		if (visit != null) {
			gng_table += "\
			<th>" + visit.name + "</th>";
		}
	});
	
	gng_table += "\
		</thead>\
		<tbody>";
	
	// fill tbody with procedure rows
	TINGoNoGo.col_totals = [];
	var col_totals = TINGoNoGo.col_totals;
	var procedures = TINGoNoGo.schedule.procedures;
	TINGoNoGo.schedule.arms[arm_i].procedureRows.forEach(function(procedure, procedure_row) {
		
		var proc_index = procedure.index - 1;
		var center_cost = procedures[proc_index].cost;
		var site_cost = TINGoNoGo.gng_data['cost' + String(proc_index + 1) + '_sc'];
		
		gng_table += "\
			<tr>\
				<td>" + procedure.name + "</td>";
		
		TINGoNoGo.schedule.arms[arm_i].visits.forEach(function(visit, visit_i) {
			if (visit != null) {
				var proc_count = visit.procedure_counts[procedure_row].count;
				var cell_value = Number(site_cost) * Number(proc_count);
				if (TINGoNoGo.col_totals[visit_i]) {
					TINGoNoGo.col_totals[visit_i] += cell_value;
				} else {
					TINGoNoGo.col_totals[visit_i] = cell_value;
				}
				
				// choose cell color/class
				var cell_class = cell_value == 0 ? "class='zero_cost' " : "";
				
				gng_table += "\
				<td " + cell_class + "data-center-cost='" + center_cost + "' data-site-cost='" + site_cost + "'>$" + cell_value + "</td>";
			}
		});
		
		gng_table += "\
			</tr>";
	});
	
	// add totals row
	gng_table += "\
			<tfoot>\
				<tr style='height: 12px;'></tr>\
				<tr>\
					<th>Total $$</th>";
	
	col_totals.forEach(function(total, visit_i) {
		
		cc_visit_cost = TINGoNoGo.getCCVisitTotal(arm_i, visit_i);
		
		var cell_class = " class='green' ";
		
		if (cc_visit_cost > total) {
			cell_class = " class='red' ";
			sidebar_color = "red";
		}
		
		gng_table += "\
					<th" + cell_class + ">$" + total + "</th>";
	});
	
	gng_table += "\
				</tr>"
	
	gng_table += "\
			</tfoot>\
		</tbody>\
	</table>";
	
	arm.sidebar_color = sidebar_color;
	
	return gng_table;
}

TINGoNoGo.makeArmSidebar = function(arm_i) {
	var sidebar = "";
	
	var color = TINGoNoGo.schedule.arms[arm_i].sidebar_color;
	var div_class = " class='gng_sidebar " + color + "'";
	var text = color == "green" ? 'DO' : 'DO NOT';
	
	sidebar += "\
		<div" + div_class + " data-arm='" + arm_i + "'>\
			<span>Procedure Costs at your site <u>" + text + "</u> fall within coordinating center reimbursement amounts.</span><br>\
			<input class='arm_cbox' type='checkbox'><label>Accept</label><br>\
			<input class='arm_cbox' type='checkbox'><label>Unable to Accept</label><br>\
			<input class='arm_cbox' type='checkbox'><label>Request Additional information</label><br>\
			<span>Enter Comments:</span><br>\
			<textarea rows='3'></textarea>\
		</div>";
	
	return sidebar;
}

TINGoNoGo.showArmTable = function(arm_i) {
	// set class for arm button styling
	$('.gng_arm').removeClass('active');
	$('.gng_arm[data-arm="' + arm_i + '"]').addClass('active');
	
	// hide all arm tables except the one we're showing
	$(".gng_arm_table").hide();
	$('.gng_arm_table[data-arm="' + arm_i + '"]').show();
	
	// same with sidebar
	$(".gng_sidebar").hide();
	$('.gng_sidebar[data-arm="' + arm_i + '"]').show();
}

TINGoNoGo.getCCVisitTotal = function(arm_i, visit_i) {
	var sum = 0;
	TINGoNoGo.schedule.arms[arm_i].visits[visit_i].procedure_counts.forEach(function(procedure) {
		sum += procedure.count * Number(procedure.cost);
	});
	return sum;
}

TINGoNoGo.getArmFieldsData = function() {
	// save decision and comment data to record
	var arms = {};
	
	var arm_count = TINGoNoGo.schedule.arms.length;
	var i;
	for (i = 0; i < arm_count; i++) {
		// make arm obj
		var arm = {};
		
		// get checkbox and comment box values
		var div = $('.gng_sidebar[data-arm="' + i + '"]');
		arm.accept = div.find('.arm_cbox:eq(0)').prop('checked');
		arm.unable = div.find('.arm_cbox:eq(1)').prop('checked');
		arm.info = div.find('.arm_cbox:eq(2)').prop('checked');
		arm.comments = div.find('textarea').val();
		
		arms[i] = arm;
	};
	arms.record_id = TINGoNoGo.record_id;
	arms.instance = TINGoNoGo.instance;
	
	return arms;
}

$('head').append('<link rel="stylesheet" type="text/css" href="' + TINGoNoGo.css_url + '">');
$(document).ready(function() {
	TINGoNoGo.initialize();
	
	$('body').on('click', 'button.gng_arm', function(event) {
		var button = $(event.target);
		var arm_i = button.attr('data-arm');
		TINGoNoGo.showArmTable(arm_i);
	});
	
	$('body').on('click', 'input.arm_cbox', function(event) {
		// determine arm for clicked checkbox
		var clicked_cbox = event.target;
		var arm_i = $(clicked_cbox).closest('.gng_sidebar').attr('data-arm');
		
		// clear other checkboxes (so it acts like a radio)
		$('.gng_sidebar[data-arm="' + arm_i + '"] input.arm_cbox').each(function(i, cbox) {
			if (cbox != event.target) {
				$(cbox).prop('checked', false);
			}
		});
	});
	
	$('button[name="submit-btn-saverecord"]').click(function() {
		var arm_field_data = TINGoNoGo.getArmFieldsData();
		if (typeof arm_field_data == 'object') {
			$.ajax(TINGoNoGo.save_arm_fields_url, {
				data: arm_field_data,
				method: "POST",
				dataType: "json"
			});
		}
		
		$(this).button("disable");
		dataEntrySubmit(this);
		return false;
	});
});
