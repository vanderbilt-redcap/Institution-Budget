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

TINBudget.showArmTable = function(arm_index) {
	$('.arm_table').hide();
	$('.arm_table[data-arm="' + arm_index + '"]').css('display', 'table');
}

TINBudget.clearArmTable = function(arm_index) {
	var table = $('.arm_table[data-arm="' + arm_index + '"]')
	table.find('span.proc_count, td.visit_total').each(function(i, element) {
		$(element).text(0)
	});
}

TINBudget.copyArmData = function(arm_index, arm_indices) {
	
}

$('head').append('<link rel="stylesheet" type="text/css" href="' + TINBudget.budget_css_url + '">');
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
	
	$('body').on('click', 'a.show_arm_table', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.showArmTable(arm_index);
	});
	
	$('body').on('click', 'a.clear_arm_table', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.clearArmTable(arm_index);
	});
	
	TINBudget.showArmTable(1)
});