BudgetSummary.initialize = function() {
	if (typeof BudgetSummary.summary_review_field == 'string') {
		$('#' + BudgetSummary.summary_review_field + '-tr').hide();
		$('#' + BudgetSummary.summary_review_field + '-tr').before("\
		<tr id='summary_review_tr'><td colspan='3' id='summary_review_td'></td></tr>");
		$("#summary_review_td").append("<div id='summary_review'></div>");
	} else {
		return;
	}
	
	var parent = $("#summary_review");
	
	// add review headers
	var site_name = BudgetSummary.summary_data.institution || "[SITE NAME]";
	parent.append("\
		<h3>BUDGET FEASIBILITY SUMMARY PAGE</h3>\
		<h3>MY SITE: " + site_name + "</h3><br>");
	
	BudgetSummary.addFixedCostsTable(parent);
	BudgetSummary.addProcedureCostsTable(parent);
	
	BudgetSummary.replaceHereWithLinkToPrint();
	BudgetSummary.addDownloadSummaryReviewButton();
}

BudgetSummary.addFixedCostsTable = function(parent) {
	if (!(parent instanceof jQuery))
		return;
	var table_html = "";
	var data = BudgetSummary.summary_data;
	
	table_html += "<h4 class='summary-table-header'>FIXED COSTS SUMMARY REVIEW</h4>";
	table_html += "\
	<table class='fixed-costs'>\
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
	for (i = 1; i <= 8; i++) {
		var result = '';
		var fixed_cost = '';
		var fixed_cost_detail = '';
		var go_no_go_decision = '';
		var site_comments = '';
		if (i <= 5) {
			// convert decision to GO or NO-GO or NEED INFO
			result = BudgetSummary.convertCostDecision(data["fixedcost" + i + "_decision"]);
			fixed_cost = data["fixedcost" + i] ?? '';
			fixed_cost_detail = data["fixedcost" + i + "_detail"] ?? '';
			go_no_go_decision = result.decision ?? '';
			site_comments = data["fixedcost" + i + "_comments"] ?? '';
		} else if(i == 6) {
			result = BudgetSummary.convertCostDecision(data["personnelcost_pi_decision"]);
			fixed_cost = 'Personnel PI Cost';
			fixed_cost_detail = data["costs_4"] ?? '';
			go_no_go_decision = result.decision ?? '';
			site_comments = data["personnelcost_pi_comment"] ?? '';
		} else if(i == 7) {
			result = BudgetSummary.convertCostDecision(data["personlcost_nonpi_decision"]);
			fixed_cost = 'Personnel Non-PI Cost';
			fixed_cost_detail = data["costs_5"] ?? '';
			go_no_go_decision = result.decision ?? '';
			site_comments = data["personlcost_nonpi_comment"] ?? '';
		} else if(i == 8) {
			result = BudgetSummary.convertCostDecision(data["personlcost_partic_decision"]);
			fixed_cost = 'Personnel Participant Cost'
			fixed_cost_detail = data["costs_6"] ?? '';
			go_no_go_decision = result.decision ?? '';
			site_comments = data["personlcost_partic_comment"] ?? '';
		}

		if (fixed_cost || fixed_cost_detail || go_no_go_decision || site_comments) {
			table_html += "\
				<tr" + result.row_class + ">\
					<td>" + fixed_cost + "</td>\
					<td>" + fixed_cost_detail + "</td>\
					<td>" + go_no_go_decision + "</td>\
					<td>" + site_comments + "</td>\
				</tr>";
		}
	}
	
	table_html += "\
		</tbody>\
	</table>";
	
	parent.append(table_html);
}

BudgetSummary.addProcedureCostsTable = function(parent) {
	if (!(parent instanceof jQuery))
		return;
	var table_html = "";
	var data = BudgetSummary.summary_data;
	var arms = BudgetSummary.schedule.arms;

	table_html += "<h4 class='summary-table-header'>PROCEDURE COSTS SUMMARY REVIEW</h4>";
	table_html += "\
	<table class='procedure-costs'>\
		<thead>\
			<tr>\
				<th>ARM #</th>\
				<th>COORDINATING CENTER<br>REIMBURSEMENT $$</th>\
				<th>MY INSTITUTION'S<br>PROCEDURE $$</th>\
				<th>DECISION:</th>\
				<th>SITE COMMENTS:</th>\
			</tr>\
		</thead>\
		<tbody>";
	
	var i;
	var cc_total = 0;
	var site_total = 0;
	for (i = 1; i <= arms.length; i++) {
		var arm_name = "Arm " + i + ": " + arms[i-1].name;
		var cc_cost = BudgetSummary.getCoordCenterCost(i);
		var site_cost = BudgetSummary.getSiteCost(i);
		
		// add costs to cc/site totals
		cc_total += cc_cost;
		site_total += site_cost;
		
		// convert decision to GO or NO-GO or NEED INFO
		var result = BudgetSummary.convertArmDecision(data["arm" + i + "_decision"]);
		table_html += "\
			<tr" + result.row_class + ">\
				<td>" + arm_name + "</td>\
				<td>$" + cc_cost + "</td>\
				<td>$" + site_cost + "</td>\
				<td>" + result.decision + "</td>\
				<td>" + (data["arm" + i + "_comments"] ? data["arm" + i + "_comments"] : '')  + "</td>\
			</tr>";
	}
	
	// append sum row
	table_html += "\
			<tr>\
				<td>SUM AMOUNT</td>\
				<td>$" + cc_total + "</td>\
				<td>$" + site_total + "</td>\
				<td>--</td>\
				<td>--</td>\
			</tr>";
	
	table_html += "\
		</tbody>\
	</table>";
	
	parent.append(table_html);
}

BudgetSummary.getCoordCenterCost = function(arm_index) {
	var total = 0;
	var arms = BudgetSummary.schedule.arms;
	var arm = arms[arm_index - 1];
	
	var i;
	for (i = 1; i < arm.visits.length; i++) {
		total += arm.visits[i].total;
	}
	return total;
}

BudgetSummary.getSiteCost = function(arm_index) {
	var total = 0;
	var arms = BudgetSummary.schedule.arms;
	var arm = arms[arm_index - 1];
	
	var i, j, visit, site_visit_cost, procedure_cost;
	for (i = 1; i < arm.visits.length; i++) {
		visit = arm.visits[i];
		site_visit_cost = 0;
		
		// iterate over procedure counts, multiplying by site cost for visit total
		for (j = 0; j < visit.procedure_counts.length; j++) {
			procedure_cost = BudgetSummary.gng_data["cost" + (j+1) + "_sc"] || "0";
			total += visit.procedure_counts[j].count * procedure_cost;
		}
	}
	return total;
}

BudgetSummary.convertCostDecision = function(decision) {
	var decision = decision;
	var row_class = '';
	if (decision) {
		if (decision == 'accept') {
			decision = 'GO';
		} else if (decision.toLowerCase() == "unable to accept") {
			decision = 'Unable to Accept';
			row_class = " class='no-go'";
		} else if (decision == 'request additional information') {
			decision = 'NEED INFO';
		}
	} else {
		decision = '';
	}
	
	return {
		decision: decision,
		row_class: row_class
	};
}

BudgetSummary.convertArmDecision = function(decision) {
	var decision = decision;
	var row_class = '';
	if (decision) {
		if (decision == 'accept') {
			decision = 'GO';
		} else if (decision.toLowerCase() == "unable to accept") {
			decision = 'NO-GO';
			row_class = " class='no-go'";
		} else if (decision == 'request additional information') {
			decision = 'NEED INFO';
		}
	} else {
		decision = '';
	}
	
	return {
		decision: decision,
		row_class: row_class
	};
}

BudgetSummary.replaceHereWithLinkToPrint = function() {
	var text = $("#surveyinstructions").find(":contains('here')").first();
	var link = "<h5 class='open_print'>here</h5>";
	text.html(text.html().replace("here", link));
	$("body").on("click", ".open_print", function() {
		window.print();
	});
}

BudgetSummary.addDownloadSummaryReviewButton = function() {
	var new_button_row = "<tr><td colspan='2' style='text-align:center;padding:15px 0;'><button type='button' class='jqbutton nowrap ui-button ui-corner-all ui-widget' style='color:#000000; margin-top: -10px;' onclick='window.print();return false;'>Download Summary Review</button></td></tr>";
	$(".formtbody tr.surveysubmit table tbody").append(new_button_row);
}

$('head').append('<link rel="stylesheet" type="text/css" href="' + BudgetSummary.css_url + '">');
$(document).ready(function() {
	BudgetSummary.initialize();
});