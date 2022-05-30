
TINGoNoGo.initialize = function() {
	if (typeof TINGoNoGo.gng_field == 'string') {
		$('#' + TINGoNoGo.gng_field + '-tr').before("<div id='gonogocontainer'><div id='gonogo'><h3>Interested Site Review: GO/NO-GO Decision</h3></div></div>")
		$('#' + TINGoNoGo.gng_field + '-tr').hide();
	}
	
	var schedule = TINGoNoGo.schedule;
	
	TINGoNoGo.makeHoverInfo();
	
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
	
	// this modal is used to show submission errors to user when required arm decisions haven't been completed
	$('body').append('\
	<div class="modal" tabindex="-1" role="dialog">\
		<div class="modal-dialog" role="document">\
			<div class="modal-content">\
				<div class="modal-header">\
					<h5 class="modal-title">Cannot Submit Survey</h5>\
					<button type="button" class="close" data-dismiss="modal" aria-label="Close">\
						<span aria-hidden="true">&times;</span>\
					</button>\
				</div>\
				<div class="modal-body">\
				</div>\
				<div class="modal-footer">\
					<button type="button" class="btn btn-primary" data-dismiss="modal">OK</button>\
				</div>\
			</div>\
		</div>\
	</div>'
	);
}

TINGoNoGo.makeArmTable = function(arm, arm_i) {
	// create table element and thead
	var gng_table = "<table class='gng_arm_table' data-arm='" + arm_i + "'>\
		<thead>\
			<th></th>";
	
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
	TINGoNoGo.schedule.procedures.forEach(function(procedure, proc_index) {
		var center_cost = procedures[proc_index].cost;
		var site_cost = TINGoNoGo.gng_data['cost' + String(proc_index + 1) + '_sc'];
		
		gng_table += "\
			<tr>\
				<td>" + procedure.name + "</td>";
		
		TINGoNoGo.schedule.arms[arm_i].visits.forEach(function(visit, visit_i) {
			if (visit != null) {
				if (!visit.procedure_counts[proc_index]) {
					return;
				}
				var proc_count = visit.procedure_counts[proc_index].count;
				var cell_value = Number(site_cost) * Number(proc_count);
				// update totals
				if (TINGoNoGo.col_totals[visit_i]) {
					TINGoNoGo.col_totals[visit_i] += cell_value;
				} else {
					TINGoNoGo.col_totals[visit_i] = cell_value;
				}
				
				// choose cell color/class
				var cell_class = (cell_value > (center_cost * Number(proc_count))) ? "class='high_cost' " : "class='low_cost' ";
				
				// add commas to cell_value if applicable
				cell_value = cell_value.toLocaleString('en', {useGroupings: true});
				
				gng_table += "\
				<td " + cell_class + "data-center-cost='" + center_cost + "' data-site-cost='" + site_cost + "' data-proc-count='" + Number(proc_count) + "'>$" + cell_value + "</td>";
			}
		});
		
		gng_table += "\
			</tr>";
	});
	
	gng_table += "\
			<tfoot>\
				<tr style='height: 12px; border-bottom: 2px solid #0062cc;'></tr>";
	
	// add My Cost row
	gng_table += "\
				<tr>\
					<th>My Cost</th>";
	col_totals.forEach(function(total, visit_i) {
		cc_visit_cost = TINGoNoGo.getCCVisitTotal(arm_i, visit_i);
		
		var cell_class = " class='green' ";
		if (cc_visit_cost < total) {
			cell_class = " class='red' ";
		}
		
		// add commas to total if applicable
		total = total.toLocaleString('en', {useGroupings: true});
		gng_table += "\
					<th" + cell_class + ">$" + total + "</th>";
	});
	gng_table += "\
				</tr>"
				
	// add CC Reimbursement row
	gng_table += "\
				<tr>\
					<th>CC Reimbursement</th>";
	col_totals.forEach(function(total, visit_i) {
		cc_visit_cost = TINGoNoGo.getCCVisitTotal(arm_i, visit_i);
		
		var cell_class = " class='green' ";
		if (cc_visit_cost < total) {
			cell_class = " class='red' ";
		}
		
		// add commas to cc_visit_cost if applicable
		cc_visit_cost = cc_visit_cost.toLocaleString('en', {useGroupings: true});
		gng_table += "\
					<th" + cell_class + ">$" + cc_visit_cost + "</th>";
	});
	gng_table += "\
				</tr>"
	
	// add delta (&#x394;) row
	var arm_total_cost = 0;
	var arm_total_reimb = 0;
	gng_table += "\
				<tr>\
					<th>&#x394;</th>";
	col_totals.forEach(function(total, visit_i) {
		cc_visit_cost = TINGoNoGo.getCCVisitTotal(arm_i, visit_i);
		
		var cell_class = " class='green' ";
		if (cc_visit_cost < total) {
			cell_class = " class='red' ";
		}
		
		// arm sidebar color value increment
		arm_total_cost += cc_visit_cost;
		arm_total_reimb += total;
		
		var delta_amount = cc_visit_cost - total;
		if (delta_amount < 0) {
			// add commas to delta_amount if applicable
			delta_amount = "-$" + (-delta_amount).toLocaleString('en', {useGroupings: true});
		} else {
			// add commas to delta_amount if applicable
			delta_amount = "$" + (delta_amount).toLocaleString('en', {useGroupings: true});
		}
		gng_table += "\
					<th" + cell_class + ">" + delta_amount + "</th>";
	});
	
	gng_table += "\
				</tr>"
				
	// add small text delta describer row
	gng_table += "\
				<tr>\
					<th><small>[difference between 'CC Reimbursement' and 'My Cost']</small></th>";
	col_totals.forEach(function(total, visit_i) {
		gng_table += "\
					<th></th>";
	});
	gng_table += "\
				</tr>"
	
	
	// finish table
	gng_table += "\
			</tfoot>\
		</tbody>\
	</table>";
	
	if (arm_total_reimb <= arm_total_cost) {
		arm.sidebar_color = "green";
	} else {
		arm.sidebar_color = "red";
	}
	
	
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

TINGoNoGo.makeHoverInfo = function() {
	// make the gng cell hover over div
	TINGoNoGo.hover_info = $("<div id='gng-hover-info'>\
	<p><span><b>My Cost:</b></span><span></span></p>\
	<p><span><b>CC Reimbursement Amount:</b></span><span></span></p>\
	<p><span><b>&#x394;:</b></span><span></span></p>\
	</div>");
	
	// temporarily append after instructions
	$("#surveyinstructions").after(TINGoNoGo.hover_info)
	$("#gng-hover-info").hide();
	
	// register events to update hover info when mouseover a gng cell
	$("body").on("mouseenter", ".low_cost, .high_cost", function(event) {
		var cell = $(event.target);
		var proc_count = cell.attr('data-proc-count');
		var site_cost = cell.attr('data-site-cost');
		var center_cost = cell.attr('data-center-cost');
		var site_total = proc_count * site_cost;
		var center_total = proc_count * center_cost;
		var delta = center_total - site_total;
		if (delta < 0) {
			delta = "-$" + (-delta).toLocaleString('en', {useGrouping: true});
		} else {
			delta = "$" + (delta).toLocaleString('en', {useGrouping: true});
		}
		
		$("#gng-hover-info p:eq(0) span:eq(1)").html("$" + site_total.toLocaleString('en', {useGrouping: true}));
		$("#gng-hover-info p:eq(1) span:eq(1)").html("$" + center_total.toLocaleString('en', {useGrouping: true}));
		$("#gng-hover-info p:eq(2) span:eq(1)").html(delta);
		$("#gng-hover-info").removeClass('green');
		$("#gng-hover-info").removeClass('red');
		if (cell.hasClass('high_cost')) {
			$("#gng-hover-info").addClass('red');
		} else {
			$("#gng-hover-info").addClass('green');
		}
		
		// reposition info div
		var info_div = $("#gng-hover-info");
		info_div.css('top', event.originalEvent.clientY + 10);
		info_div.css('left', event.originalEvent.clientX + 10);
		info_div.show();
	});
	$("body").on("mousemove", ".low_cost, .high_cost", function(event) {
		var info_div = $("#gng-hover-info");
		if (info_div.is(":visible")) {
			info_div.css('top', event.originalEvent.clientY + 10);
			info_div.css('left', event.originalEvent.clientX + 10);
		}
	});
	$("body").on("mouseleave", ".low_cost, .high_cost", function(event) {
		$("#gng-hover-info").hide();
	});
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
		var procedure_count = Number(procedure.count);
		var procedure_cost = Number(procedure.cost);
		if (!isNaN(procedure_cost) && !isNaN(procedure_cost))
			sum += procedure_count * procedure_cost
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

TINGoNoGo.replacementSubmit = function(click_event) {
	// check arm decision/comments to see if ready to submit
	var bad_arms = [];
	TINGoNoGo.schedule.arms.forEach(function(arm, arm_i) {
		var sidebar = $(".gng_sidebar[data-arm='" + arm_i + "']");
		var accept_box = sidebar.find('.arm_cbox:eq(0)').prop('checked');
		var decline_box = sidebar.find('.arm_cbox:eq(1)').prop('checked');
		var request_box = sidebar.find('.arm_cbox:eq(2)').prop('checked');
		var comments_box = sidebar.find('textarea').val();
		if (!accept_box && !decline_box && !(request_box && comments_box !== '')) {
			ready_to_submit = false;
			bad_arms.push("<b>Arm " + (arm_i + 1) + ": " + arm.name + "</b>")
		}
	});
	
	var submit_btn = $('button[name="submit-btn-saverecord"]');
	if (bad_arms.length !== 0) {
		// prevent survey submission
		submit_btn.blur();
		click_event.preventDefault();
		
		// update and show modal with error message
		var submission_error = "<p>In order to advance to the next page, you must make a decision for each arm. If you're requesting additional information, please explain in the \"Enter Comments\" text area.</p>\
		\
		<p>Please navigate to the arm(s) listed below and provide a response. You have not entered a decision for</p>" + bad_arms.join('<br>');
		$('.modal-body').html(submission_error);
		$('.modal').modal('show')
	} else {
		// save arm decision/comment data
		var arm_field_data = TINGoNoGo.getArmFieldsData();
		if (typeof arm_field_data == 'object') {
			$.ajax(TINGoNoGo.save_arm_fields_url, {
				data: arm_field_data,
				method: "POST",
				dataType: "json"
			});
		}
		
		// submit survey
		submit_btn.button("disable");
		dataEntrySubmit(submit_btn);
	}
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
	
	// replace submit-btn-saverecord onclick event
	$('button[name="submit-btn-saverecord"]').each(function(i, submit_btn) {
		$(submit_btn).attr('onclick', '');
		$(submit_btn).unbind('click');
		$(submit_btn).click(function (event) {
			TINGoNoGo.replacementSubmit(event);
			return false;
		});
	});
});
