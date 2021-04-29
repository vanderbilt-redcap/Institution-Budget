
$(document).ready(function() {
	console.log('survey page ready');
	$('#sched_test_field_1-tr').replaceWith("<div id='budgetTable'>" + TINBudgetSurvey.budget_table + "</div>");
});
