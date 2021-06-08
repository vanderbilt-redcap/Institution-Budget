TINSummary.initialize = function() {
	if (typeof TINSummary.summary_review_field == 'string') {
		$('#' + TINSummary.summary_review_field + '-tr').before("<div class='col-12' id='summary_review_container'></div>")
		$('#' + TINSummary.summary_review_field + '-tr').hide();
	}
	
	// add review headers
	var site_name = TINSummary.summary_data.institution || "[SITE NAME]";
	$("#summary_review_container").append("\
		<h3>BUDGET FEASIBILITY SUMMARY PAGE</h3>\
		<h3>MY SITE: " + site_name + "</h3>");
	
	TINSummary.addFixedCostsTable();
	TINSummary.addProcedureCostsTable();
}

TINSummary.addFixedCostsTable = function() {
	var table_html = "";
	var data = TINSummary.summary_data;
	var arms = TINSummary.schedule.arms;
	
	table_html += "<h4 class='summary-table-header'>FIXED COSTS SUMMARY REVIEW</h4>";
	table_html += "\
	<table>\
		<thead>\
			<tr>\
				<th>FIXED COST</th>\
				<th>FIXED COST DETAIL</th>\
				<th>GO/NO-GO DECISION</th>\
				<th>SITE COMMENTS</th>\
			</tr>\
		</thead>\
		<tbody>";
	
	var i;
	for (i = 1; i <= arms.length; i++) {
		table_html += "\
			<tr>\
				<td>" + data["fixedcost" + i] + "</td>\
				<td>" + data["fixedcost" + i + "_detail"] + "</td>\
				<td>" + data["fixedcost" + i + "_decision"] + "</td>\
				<td>" + data["fixedcost" + i + "_comments"] + "</td>\
			</tr>";
	}
	
	table_html += "\
		</tbody>\
	</table>";
	
	$("#summary_review_container").append(table_html);
}

TINSummary.addProcedureCostsTable = function() {
	var table_html = "";
	var data = TINSummary.summary_data;
	var arms = TINSummary.schedule.arms;
	
	table_html += "<h4 class='summary-table-header'>FIXED COSTS SUMMARY REVIEW</h4>";
	table_html += "\
	<table>\
		<thead>\
			<tr>\
				<th>ARM #</th>\
				<th>COORDINATING CENTER REIMBURSEMENT $$</th>\
				<th>MY INSTITUTION'S PROCEDURE $$</th>\
				<th>DECISION:</th>\
				<th>SITE COMMENTS:</th>\
			</tr>\
		</thead>\
		<tbody>";
	
	var i;
	for (i = 1; i <= arms.length; i++) {
		// var arm_name = "Arm " + i + ": ";
		var arm_name = "Arm " + i + ": " + arms[i-1].name;
		var cc_cost = TINSummary.getCoordCenterCost(i);
		var site_cost = TINSummary.getSiteCost(i);
		table_html += "\
			<tr>\
				<td>" + arm_name + "</td>\
				<td>" + cc_cost + "</td>\
				<td>" + site_cost + "</td>\
				<td>" + data["arm" + i + "_decision"] + "</td>\
				<td>" + data["arm" + i + "_comments"] + "</td>\
			</tr>";
	}
	
	table_html += "\
		</tbody>\
	</table>";
	
	$("#summary_review_container").append(table_html);
}

TINSummary.getCoordCenterCost = function(arm_index) {
	var total = 0;
	var arms = TINSummary.schedule.arms;
	var arm = arms[arm_index - 1];
	
	var i;
	for (i = 1; i < arm.visits.length; i++) {
		total += arm.visits[i].total;
	}
	return total;
}

TINSummary.getSiteCost = function(arm_index) {
	var total = 0;
	var arms = TINSummary.schedule.arms;
	var arm = arms[arm_index - 1];
	
	var i, j, visit, site_visit_cost, procedure_cost;
	for (i = 1; i < arm.visits.length; i++) {
		visit = arm.visits[i];
		site_visit_cost = 0;
		
		// iterate over procedure counts, multiplying by site cost for visit total
		for (j = 0; j < visit.procedure_counts.length; j++) {
			procedure_cost = TINSummary.gng_data["cost" + (j+1) + "_sc"] || "0";
			total += visit.procedure_counts[j].count * procedure_cost;
		}
	}
	return total;
}

$('head').append('<link rel="stylesheet" type="text/css" href="' + TINSummary.css_url + '">');
$(document).ready(function() {
	TINSummary.initialize();
});