TINBudget.updateVisitCost = function(arm, visit) {
	// sum costs
	var sum = 0
	$(".arm_table[data-arm='" + arm + "'] .procedure_select[data-visit='" + visit +"']").each(function(i, e) {
		var cost = Number($(e).attr('data-cost'));
		var checked = $(e).prop('checked');
		if (cost && checked) {
			sum = sum + cost;
		}
	});
	$(".arm_table[data-arm='" + arm + "'] .visit_total[data-visit='" + visit + "']").text(sum);
}

$('head').append('<link rel="stylesheet" type="text/css" href="' + TINBudget.budget_css_url + '">');
$(document).ready(function() {
	// update cost sum when checkbox is toggled
	$('body').on('change', '.procedure_select', function(event) {
		var arm_index = $(event.target).closest('.arm_table').attr('data-arm');
		console.log('arm_index', arm_index);
		var visit_name = $(event.target).attr('data-visit');
		TINBudget.updateVisitCost(arm_index, visit_name);
	});
	
	// toggle .procedure_select checkbox if user clicks parent td cell
	$('body').on('click', 'td:not(.procedure)', function(event) {
		// console.log('event for td click:', event);
		if ($(event.target).is('td')) {
			var cbox = $(event.target).find('input');
			$(cbox).click();
		}
	});
	
	$('.arm_table[data-arm="1"]').css('display', 'table');
});