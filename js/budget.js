TINBudget.refreshSchedule = function() {
	// highlight active arm
	$('.arm button').removeClass('active-arm')
	$('.arm[data-arm="' + TINBudget.active_arm_index + '"] button').addClass('active-arm')
	
	// re-order arm dropdowns and arm tables
	$('.arm').each(function(i, e) {
		$(e).attr('data-arm', i+1);
	});
	$('.arm_table').each(function(i, e) {
		$(e).attr('data-arm', i+1);
	});
	
	// TODO enable/disable arm dropdown options as necessary
	
}

// arm dropdown button functions
TINBudget.showArm = function(arm_index) {
	$('.arm_table').hide();
	$('.arm_table[data-arm="' + arm_index + '"]').css('display', 'table');
	
	// set active_arm_index and highlight active arm dd button
	TINBudget.active_arm_index = arm_index;
	TINBudget.refreshSchedule();
}
TINBudget.copyArm = function(arm_index) {
	// show a modal asking which arm(s) to copy to
	// (and replace all visits or copy to matching vists and procedures
}
TINBudget.createArm = function() {
	if ($('.arm_table').length > 9) {
		alert("Can't create a new arm when more than 9 arms already exist");
		return;
	}
	var new_arm_i = $('.arm_table').length + 1;
	var new_arm_table = "<table class='arm_table' data-arm='" + new_arm_i + "'>\
		<thead>\
			<th></th>\
			<th class='pr-3 visit'>Visit 1</th>\
		</thead>\
		<tbody>\
		<tr>\
			<td class='procedure'>Procedure 1</td>\
			<td class='proc_cell'>\
				<button class='btn btn-outline-primary proc_decrement'>-</button>\
				<span data-cost='120' class='proc_count mx-2'>0</span>\
				<button class='btn btn-outline-primary proc_increment'>+</button>\
			</td>\
		</tr>\
		<tr>\
			<td>Total $$</td>\
			<td class='visit_total'>0</td>\
		</tr>\
		</tbody>\
	</table>";
	var new_arm_dropdown = "<div class='dropdown arm' data-arm='" + new_arm_i + "'>\
		<button class='btn btn-secondary dropdown-toggle' type='button' id='dropdownMenuButton" + new_arm_i + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
			Arm " + new_arm_i + ": New Arm\
		</button>\
		<div class='dropdown-menu' aria-labelledby='dropdownMenuButton" + new_arm_i + "'>\
			<a class='dropdown-item show_arm' href='#'>Show this arm's table</a>\
			<a class='dropdown-item copy_arm' href='#'>Copy all data to another arm</a>\
			<a class='dropdown-item create_arm' href='#'>Create another arm</a>\
			<a class='dropdown-item rename_arm' href='#'>Rename this arm</a>\
			<a class='dropdown-item clear_arm' href='#'>Clear all data on this arm</a>\
			<a class='dropdown-item delete_arm' href='#'>Delete this arm</a>\
		</div>\
	</div>";
	
	// create elements and insert into DOM
	$("#arm_dropdowns").append(new_arm_dropdown);
	$("#arm_tables").append(new_arm_table);
	TINBudget.showArm(new_arm_i);
}
TINBudget.renameArm = function(arm_index) {
	// modal asking for new name
	$("#tinbudget_modal").modal('show');
}
TINBudget.clearArm = function(arm_index) {
	var table = $('.arm_table[data-arm="' + arm_index + '"]')
	table.find('span.proc_count, td.visit_total').each(function(i, element) {
		$(element).text(0)
	});
}
TINBudget.deleteArm = function(arm_index) {
	$('[data-arm="' + arm_index + '"]').remove()
}

// visit level functions
TINBudget.updateVisitCost = function(arm, visit) {
	// sum costs
	var sum = 0
	$(".arm_table[data-arm='" + arm + "'] .proc_cell[data-visit='" + visit +"'] .proc_count").each(function(i, e) {
		var cost = Number($(e).attr('data-cost'));
		var count = Number($(e).text());
		if (cost && count) {
			sum = sum + cost * count;
		}
	});
	$(".arm_table[data-arm='" + arm + "'] .visit_total[data-visit='" + visit + "']").text(sum);
}

// initialization/registration
$('head').append('<link rel="stylesheet" type="text/css" href="' + TINBudget.budget_css_url + '">');
$('body').append($('#tinbudget_modal').remove());
$(document).ready(function() {
	// update cost sum when user inc/decrements procedure count
	$('body').on('click', '.proc_cell button', function(event) {
		var btn = $(event.target);
		var to_add = btn.hasClass('proc_decrement') ? -1 : 1;
		var proc_cell = btn.closest('.proc_cell');
		var count_span = proc_cell.find('span')
		
		// update span counter
		var current_count = Number(count_span.text());
		var new_count = Math.max(current_count + to_add, 0);
		count_span.text(new_count);
		
		// update sum
		var arm_index = btn.closest('.arm_table').attr('data-arm');
		var visit_index = proc_cell.attr('data-visit');
		TINBudget.updateVisitCost(arm_index, visit_index);
	});
	
	// register arm dropdown button click events
	$('body').on('click', 'a.show_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.showArm(arm_index);
	});
	$('body').on('click', 'a.copy_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.copyArm(arm_index);
	});
	$('body').on('click', 'a.create_arm', function(event) {
		TINBudget.createArm();
	});
	$('body').on('click', '.arm .rename_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.renameArm(arm_index);
		TINBudget.target_arm = arm_index;
	});
	$('body').on('click', 'a.clear_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.clearArm(arm_index);
	});
	$('body').on('click', 'a.delete_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.deleteArm(arm_index);
	});
	$('body').on('click', '.modal .rename_arm', function(event) {
		// get new name, clear input element
		var new_arm_name = $("#tinbudget_rename_arm input").val();
		$("#tinbudget_rename_arm input").val("");
		
		// update target arm and clear target_arm
		$('.arm[data-arm="' + TINBudget.target_arm + '"] button').text("Arm " + TINBudget.target_arm + ": " + new_arm_name);
		TINBudget.target_arm = null;
	});
	
	TINBudget.showArm(1)
	TINBudget.refreshSchedule()
});