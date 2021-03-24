TINBudget.updateVisitCost = function(visit) {
	// sum costs
	var sum = 0
	$(".procedure_select[data-visit='" + visit +"']").each(function(i, e) {
		var cost = Number($(e).attr('data-cost'));
		var checked = $(e).prop('checked');
		if (cost && checked) {
			sum = sum + cost;
		}
	});
	$(".visit_total[data-visit='" + visit + "']").text(sum);
}

$('head').append('<link rel="stylesheet" type="text/css" href="' + TINBudget.budget_css_url + '">');
$(document).ready(function() {
	// update cost sum when checkbox is toggled
	$('body').on('change', '.procedure_select', function(event) {
		var visit_name = $(event.target).attr('data-visit');
		TINBudget.updateVisitCost(visit_name);
	});
	
	// toggle .procedure_select checkbox if user clicks parent td cell
	$('body').on('click', 'td:not(.procedure)', function(event) {
		// console.log('event for td click:', event);
		if ($(event.target).is('td')) {
			var cbox = $(event.target).find('input');
			$(cbox).click();
		}
	});
});