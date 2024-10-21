
InstituteBudget.MAX_STATES = 100;
// InstituteBudget.autocompSettings = {
// 	source: function(request, response) {
// 		$.ajax(InstituteBudget.cpt_endpoint_url, {
// 			data: {"query": request.term},
// 			method: "POST",
// 			dataType: "json"
// 		}).done(function(data) {
// 			response(data);
// 		});
// 	},
// 	minLength: 0
// }

InstituteBudget.refreshSchedule = function() {
	// highlight dropdown for active arm
	$('.arm button').removeClass('active-arm')
	$('.arm[data-arm="' + InstituteBudget.active_arm_index + '"] button').addClass('active-arm')
	
	// update data-arm and data-visit attributes for elements that have them
	$('[data-arm]').each(function(i, e) {
		var arm_i = Number($(e).index()) + 1;
		$(e).attr('data-arm', arm_i);
	});
	var active_arm_table = $(".arm_table[data-arm='" + InstituteBudget.active_arm_index + "']");
	active_arm_table.find('.visit').each(function(i, e) {
		var visit_i = i + 1;
		$(e).attr('data-visit', visit_i);
	});
	active_arm_table.find('.proc_cell, .visit_total').each(function(i, e) {
		var visit_i = Number($(e).index());
		$(e).attr('data-visit', visit_i);
	});
	
	// update arm and visit name labels
	$('.arm').each(function(i, arm) {
		var i = $(arm).attr('data-arm');
		var arm_dd = $(arm).find('button.dropdown-toggle');
		arm_dd.text(arm_dd.text().replace(/\d+/, i));
	});
	$('.visit').each(function(i, visit) {
		var i = $(visit).attr('data-visit');
		var visit_dd = $(visit).find('button.dropdown-toggle');
		visit_dd.text(visit_dd.text().replace(/\d+/, i));
	});
	
	// refresh procedures, costs, and sums
	InstituteBudget.refreshProceduresBank();
	InstituteBudget.refreshProcedureRows();
}
InstituteBudget.refreshProceduresBank = function() {
	// remove all rows from edit_procedures and edit_procedure_comments tables
	$("table#edit_procedures tbody").empty()
	$("table#edit_procedure_comments tbody").empty()
	
	// add rows to edit_procedures and edit_procedure_comments tables using InstituteBudget.procedures data
	InstituteBudget.procedures.forEach(function(procedure, i) {
		// add to edit_procedures
		$("table#edit_procedures tbody").append("<tr>\
			<td><button type='button' class='btn btn-outline-danger delete_this_row'><i class='fas fa-trash-alt'></i></button></td>\
			<td class='name'><input type='text'></td>\
			<td class='routine-care'><input type='checkbox'></td>\
			<td class='cost'><input type='number'></td>\
			<td class='cpt'><input class='cptSelect' type='text'></td>\
		</tr>");
		
		if (procedure.routine_care_procedure_form == 1 && !procedure.routine_care) {
			procedure.routine_care = true
		}
		
		if (procedure.routine_care)
			procedure.cost = 0;
		
		$("table#edit_procedures tbody tr:last-child td.name input").val(procedure.name);
		if (procedure.added_on_the_fly) {
			$("table#edit_procedures tbody tr:last-child td.name").addClass("added_on_the_fly");
		}
		$("table#edit_procedures tbody tr:last-child td.routine-care input").prop('checked', procedure.routine_care);
		$("table#edit_procedures tbody tr:last-child td.cost input").val(procedure.cost);
		$("table#edit_procedures tbody tr:last-child td.cost input").prop('disabled', procedure.routine_care);
		$("table#edit_procedures tbody tr:last-child td.cpt input").val(procedure.cpt);
		
		$("table#edit_procedures tbody tr:last-child td.cpt input").autocomplete(InstituteBudget.autocompSettings).focus(function(){
			$(this).data("uiAutocomplete").search($(this).val());
		});
		
		// add to edit_procedure_comments if this procedure is routine care
		if (procedure.routine_care && procedure.added_on_the_fly) {
			var this_comment = "";
			if (procedure.comment) {
				this_comment = procedure.comment;
			}
			$("table#edit_procedure_comments tbody").append("<tr>\
				<td class='name'>" + procedure.name + "</td>\
				<td class='comment'><textarea class='comment' rows='4' cols='45'>" + this_comment + "</textarea></td>\
			</tr>");
		}
	});
}
InstituteBudget.refreshProcedureRows = function(schedule) {	// also refreshes proc costs and visit costs
	// to be called when procedures have changed
	
	// determine which state/schedule to pull arm/visit/procedure count information from
	var state = schedule;
	if (!state && InstituteBudget.states && typeof InstituteBudget.stateIndex != 'undefined') {
		state = InstituteBudget.states[InstituteBudget.stateIndex];
	}
	
	// iterate over all arms, updating the rows of the arm tables to match new set of procedures
	var arm_count = $('.arm_table').length;
	var visit_count;
	for (var arm_i = 1; arm_i <= arm_count; arm_i++) {
		var arm_table = $('.arm_table[data-arm="' + arm_i + '"]');
		visit_count = Number(arm_table.find('.visit').length);
		arm_table.find('tbody').empty();
		for (var proc_index in InstituteBudget.procedures) {
			var procedure = InstituteBudget.procedures[proc_index];
			var proc_name = procedure.name;
			if (procedure.routine_care) {
				proc_name = proc_name + ' <span title="Standard of Care"> [SoC]</span>';
			}
			var new_row = "<tr><td class='procedure'>" + proc_name + "</td>";
			
			// add proc_count cells to new row, preserving old procedure counts if applicable
			for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
				var old_count = 0;
				
				if (state) {
					var arm = state.arms[Number(arm_i - 1)];
					if (arm) {
						for (var all_visit_procs_index in arm.visits[visit_i].procedure_counts) {
							var visit_proc = arm.visits[visit_i].procedure_counts[all_visit_procs_index];
							if (visit_proc.name == procedure.name) {
								old_count = visit_proc.count;
							}
						}
					}
				}
				new_row += "<td class='proc_cell' data-visit='" + visit_i + "'>\
					<button type='button' class='btn btn-outline-primary proc_decrement'>-</button>\
					<span data-cost='' class='proc_count mx-2'>" + Number(old_count) + "</span>\
					<button type='button' class='btn btn-outline-primary proc_increment'>+</button>\
				</td>"
			}
			new_row += "</tr>";
			arm_table.find('tbody').append(new_row);
		}
		// make and append last row (Totals $$)
		var new_row = "<tr><td class='no-border'>Total $$</td>";
		
		for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
			new_row += "<td class='visit_total' data-visit='" + visit_i + "'>0</td>";
		}
		new_row += "</tr>";
		arm_table.find('tbody').append(new_row);
	}
	
	InstituteBudget.refreshProcedureCosts();
	InstituteBudget.updateAllVisitCosts();
}
InstituteBudget.refreshProcedureCosts = function() {
	// update all .proc_cell data-cost attributes based on the row's procedure (name)
	$('.procedure').each(function(i, td) {
		var proc_name = $(td).html().trim();
		var proc_cost = 0;
		for (var procedure of InstituteBudget.procedures) {
			if (procedure.name == proc_name) {
				proc_cost = procedure.cost;
				break;
			}
		}
		
		$(td).closest('tr').find('.proc_count').each(function(i, span) {
			$(span).attr('data-cost', proc_cost);
		});
	});
}

// arm dropdown button functions
InstituteBudget.showArm = function(arm_index) {
	$('.arm_table').hide();
	$('.arm_table[data-arm="' + arm_index + '"]').css('display', 'table');
	
	// set active_arm_index and highlight active arm dd button
	InstituteBudget.active_arm_index = arm_index;
}
InstituteBudget.copyArm = function(arm_index) {
	// show a modal asking which arm(s) to copy to
	// (and replace all visits or copy to matching vists and procedures
	InstituteBudget.copy_source_arm_index = arm_index;
	
	// reset visit options based on which visit we're copying from
	$("#select_arms").empty();
	var arm_count = $('.arm_table').length;
	for (var arm_i = 1; arm_i <= arm_count; arm_i++) {
		var arm_name = $(".arm[data-arm=" + arm_i + "] button.dropdown-toggle").text();
		arm_name = arm_name.substring(arm_name.search(':')+1).trim();
		
		var arm_select_button = "<button type='button' data-arm-index='" + arm_i + "' class='btn btn-outline-primary arm_select'>" + arm_name + "</button>";
		if (arm_i == InstituteBudget.copy_source_arm_index) {
			arm_select_button = "<button type='button' data-arm-index='" + arm_i + "' class='btn btn-outline-secondary arm_select' disabled'>" + arm_name + "</button>"
		}
		$("#select_arms").append(arm_select_button);
	}
	
	// hide other modal content, show copy_visit section
	$('.modal-content').hide()
	$('#instituteBudget_copy_arm').show()
	$("#instituteBudget_modal").modal('show');
}
InstituteBudget.createArm = function() {
	if ($('.arm_table').length > 9) {
		alert("Can't create a new arm when more than 9 arms already exist");
		return;
	}
	
	var new_arm_i = $('.arm_table').length + 1;
	
	var visit_1_th = "<th>\
	<div class='dropdown visit' data-visit='1'>\
		<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownVisit1' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
			Visit 1: New Visit\
		</button>\
		<div class='dropdown-menu' aria-labelledby='dropdownVisit1'>\
			<a class='dropdown-item create_visit' href='#'>Create another visit</a>\
			<a class='dropdown-item rename_visit' href='#'>Rename this visit</a>\
			<a class='dropdown-item copy_visit' href='#'>Copy procedure counts to another visit</a>\
			<a class='dropdown-item clear_visit' href='#'>Clear procedure counts for this visit</a>\
			<a class='dropdown-item delete_visit' href='#'>Delete this visit</a>\
		</div>\
	</div>\
	</th>";
	
	var new_arm_table = "<table class='arm_table' data-arm='" + new_arm_i + "'>\
		<thead>\
			<th></th>\
			" + visit_1_th + "\
		</thead>\
		<tbody>\
		<tr>\
			<td class='procedure'>Procedure 1</td>\
			<td class='proc_cell'>\
				<button type='button' class='btn btn-outline-primary proc_decrement'>-</button>\
				<span data-cost='120' class='proc_count mx-2'>0</span>\
				<button type='button' class='btn btn-outline-primary proc_increment'>+</button>\
			</td>\
		</tr>\
		<tr>\
			<td>Total $$</td>\
			<td class='visit_total'>0</td>\
		</tr>\
		</tbody>\
	</table>";
	var new_arm_dropdown = "<div class='dropdown arm' data-arm='" + new_arm_i + "'>\
		<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownMenuButton" + new_arm_i + "' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
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
	
	return new_arm_i;
}
InstituteBudget.renameArm = function(arm_index) {
	// modal asking for new name
	$('.modal-content').hide()
	$('#instituteBudget_rename_arm').show()
	$("#instituteBudget_modal").modal('show');
}
InstituteBudget.clearArm = function(arm_index) {
	var table = $('.arm_table[data-arm="' + arm_index + '"]')
	table.find('span.proc_count, td.visit_total').each(function(i, element) {
		$(element).text(0)
	});
}
InstituteBudget.deleteArm = function(arm_index) {
	if ($('.arm').length > 1) {
		$('[data-arm="' + arm_index + '"]').remove()
	}
}

// visit dropdown buttons
InstituteBudget.createVisit = function() {
	var arm_table = $(".arm_table[data-arm='" + InstituteBudget.active_arm_index + "']");
	var visit_count = arm_table.find('.visit').length;
	if (visit_count > 9) {
		alert("Can't create a new visit when more than 9 visits already exist");
		return;
	}
	
	var visit_j = visit_count + 1;
	var visit_dd = "<th>\
	<div class='dropdown visit' data-visit='" + visit_j + "'>\
		<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownVisit" + visit_j + "' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
			Visit " + visit_j + ": New Visit\
		</button>\
		<div class='dropdown-menu' aria-labelledby='dropdownVisit" + visit_j + "'>\
			<a class='dropdown-item create_visit' href='#'>Create another visit</a>\
			<a class='dropdown-item rename_visit' href='#'>Rename this visit</a>\
			<a class='dropdown-item copy_visit' href='#'>Copy procedure counts to another visit</a>\
			<a class='dropdown-item clear_visit' href='#'>Clear procedure counts for this visit</a>\
			<a class='dropdown-item delete_visit' href='#'>Delete this visit</a>\
		</div>\
	</div>\
	</th>";
	
	var visit_proc_cell = "<td class='proc_cell' data-visit='" + visit_j + "'>\
		<button type='button' class='btn btn-outline-primary proc_decrement'>-</button>\
		<span data-cost='' class='proc_count mx-2'>0</span>\
		<button type='button' class='btn btn-outline-primary proc_increment'>+</button>\
	</td>";
	
	var visit_total_cell = "<td class='visit_total' data-visit='" + visit_j + "'>0</td>";
	
	// insert visit_dd to DOM via arm_table
	arm_table.find('thead tr').append(visit_dd);
	arm_table.find('tbody tr:not(:last-child)').append(visit_proc_cell);
	arm_table.find('tbody tr:last-child').append(visit_total_cell);
	
	// add procedure_counts for new visit to this arm in schedule (if they don't already exist)
	var state = InstituteBudget.states[InstituteBudget.stateIndex];
	if (state) {
		var arm = state.arms[InstituteBudget.active_arm_index - 1];
		if (arm) {
			
			// add 0 counts for all procedures
			var zero_proc_counts = [];
			InstituteBudget.procedures.forEach(function(procedure, proc_i) {
				zero_proc_counts.push({
					name: procedure.name,
					count: 0,
					cost: procedure.cost
				});
			});
			
			if (!arm.visits[visit_j] || !arm.visits[visit_j].procedure_counts) {
				arm.visits[visit_j] = {
					name: "New Visit",
					procedure_counts: zero_proc_counts,
					total: 0
				}
			}
		}
	}
}
InstituteBudget.renameVisit = function(visit_index) {
	$('.modal-content').hide()
	$('#instituteBudget_rename_visit').show()
	$("#instituteBudget_modal").modal('show');
}
InstituteBudget.copyVisit = function(visit_index) {
	InstituteBudget.copy_source_visit_index = visit_index;
	InstituteBudget.copy_destination_visits = {};
	
	// reset visit options based on which visit we're copying from
	$("#select_visits").empty();
	var visit_count = $('.arm_table[data-arm="' + InstituteBudget.active_arm_index + '"] .visit').length;
	for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
		var visit_name = $(".arm_table[data-arm=" + InstituteBudget.active_arm_index + "] .visit[data-visit='" + visit_i + "']").find('button').text();
		var visit_select_button = "<button type='button' class='btn btn-outline-primary visit_select' data-visit-index='" + visit_i + "'>" + visit_name + "</button>";
		if (visit_i == visit_index) {
			visit_select_button = "<button type='button' class='btn btn-outline-secondary visit_select' disabled data-visit-index='" + visit_i + "'>" + visit_name + "</button>"
		}
		visit_name = visit_name.substring(visit_name.search(':') + 1).trim();
		$("#select_visits").append(visit_select_button);
	}
	
	// hide other modal content, show copy_visit section
	$('.modal-content').hide()
	$('#instituteBudget_copy_visit').show()
	$("#instituteBudget_modal").modal('show');
}
InstituteBudget.clearVisit = function(visit_index) {
	var arm_table = $(".arm_table[data-arm='" + InstituteBudget.active_arm_index + "']");
	arm_table.find('.proc_cell:nth-child(' + (visit_index + 1) + ') span, .visit_total:nth-child(' + (visit_index + 1) + ')').text(0)
}
InstituteBudget.deleteVisit = function(visit_index) {
	var arm_index = InstituteBudget.active_arm_index;
	var arm_table = $(".arm_table[data-arm='" + arm_index + "']");
	
	InstituteBudget.arm_table = arm_table;
	if (arm_table.find('th').length > 2) {
		arm_table.find('th:nth-child(' + (visit_index + 1) + '), td:nth-child(' + (visit_index + 1) + ')').remove()
	}
	
	var state = InstituteBudget.states[InstituteBudget.stateIndex];
	if (state) {
		var arm = state.arms[InstituteBudget.active_arm_index - 1];
		if (arm) {
			arm.visits.splice(visit_index, 1);
		}
	}
}

// visit level helper functions
InstituteBudget.updateVisitCost = function(arm, visit) {
	// sum costs across all procedures
	var sum = 0
	$(".arm_table[data-arm='" + arm + "'] .proc_cell[data-visit='" + visit +"'] .proc_count").each(function(i, e) {
		var cost = Number($(e).attr('data-cost'));
		var count = Number($(e).text());
		if (cost && count) {
			sum = sum + cost * count;
		}
		
		// update highlight
		var cell = $(e).parent();
		cell.removeClass('nonzero')
		if (count > 0) {
			cell.addClass('nonzero')
		}
	});
	
	// update visit total in Total $$ row
	$(".arm_table[data-arm='" + arm + "'] .visit_total[data-visit='" + visit + "']").text(sum);
}
InstituteBudget.updateAllVisitCosts = function() {
	for (var arm_i = 1; arm_i <= $('.arm').length; arm_i++) {
		var visit_count = $('.arm_table[data-arm="' + arm_i + '"] .visit').length;
		for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
			InstituteBudget.updateVisitCost(arm_i, visit_i);
		}
	};
}

// modal functions
// InstituteBudget.editProcedures = function() {
// 	$('.modal-content').hide()
// 	$('#instituteBudget_edit_procedures').show()
// 	$("#instituteBudget_modal").modal('show');
// }
// InstituteBudget.procedureComments = function() {
// 	$('.modal-content').hide()
// 	$('#instituteBudget_procedure_comments').show()
// 	$("#instituteBudget_modal").modal('show');
// }

// event registration
InstituteBudget.registerEvents = function() {
	// register arm dropdown button click events
	$('body').on('click', 'a.show_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		InstituteBudget.showArm(arm_index);
		InstituteBudget.refreshSchedule();
		InstituteBudget.pushState();
	});
	$('body').on('click', 'a.copy_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		InstituteBudget.copyArm(arm_index);
	});
	$('body').on('click', 'a.create_arm', function(event) {
		var new_arm_index = InstituteBudget.createArm();
		var this_arm_table = $('.arm_table[data-arm="' + new_arm_index + '"]');
		
		InstituteBudget.refreshProceduresBank();
		InstituteBudget.refreshProcedureRows();
		InstituteBudget.showArm(new_arm_index);
		InstituteBudget.refreshSchedule();
		InstituteBudget.pushState();
	});
	$('body').on('click', '.arm .rename_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		InstituteBudget.target_arm = arm_index;
		InstituteBudget.renameArm(arm_index);
	});
	$('body').on('click', 'a.clear_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		InstituteBudget.clearArm(arm_index);
		InstituteBudget.pushState();
	});
	$('body').on('click', 'a.delete_arm', function(event) {
		// hide other modal content, show copy_visit section
		$('.modal-content').hide()
		$('#instituteBudget_confirm_delete').show()
		$('#instituteBudget_confirm_delete').find('p').text("Are you sure you want to delete this arm?")
		$("#instituteBudget_modal").modal('show');
		
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		InstituteBudget.confirmDelete = function() {
			InstituteBudget.deleteArm(arm_index);
			InstituteBudget.showArm(Math.max(1, arm_index - 1));
			InstituteBudget.refreshSchedule();
			InstituteBudget.pushState();
		}
	});
	$('body').on('click', '.modal .rename_arm', function(event) {
		// get new name, clear input element
		var new_arm_name = $("#instituteBudget_rename_arm input").val();
		$("#instituteBudget_rename_arm input").val("");
		
		// update target arm and clear target_arm
		$('.arm[data-arm="' + InstituteBudget.target_arm + '"] button').text("Arm " + InstituteBudget.target_arm + ": " + new_arm_name);
		InstituteBudget.target_arm = null;
		TINBudget.pushState();
	});
	$('body').on('click', '.modal .arm_select', function(event) {
		var btn = $(event.target);
		var arm_index = btn.attr('data-arm-index');
		if (btn.hasClass('btn-outline-primary')) {
			btn.removeClass('btn-outline-primary');
			btn.addClass('btn-primary');
		} else {
			btn.removeClass('btn-primary');
			btn.addClass('btn-outline-primary');
		}
	});
	$('body').on('click', '.modal .overwrite_arms', function(event) {
		var visible_table_index = $('.arm_table:visible').attr('data-arm');
		var src_arm_table_clone = $(".arm_table[data-arm='" + TINBudget.copy_source_arm_index + "']").clone();
		$("#select_arms button").each(function(i, btn) {
			if ($(btn).hasClass('btn-primary')) {
				var dest_arm_index = $(btn).attr('data-arm-index');
				src_arm_table_clone.attr('data-arm', dest_arm_index);
				$(".arm_table[data-arm='" + dest_arm_index + "']").replaceWith(src_arm_table_clone.prop('outerHTML'));
			}
		});
		TINBudget.copy_source_arm_index = null;
		TINBudget.pushState();
		TINBudget.showArm(visible_table_index);
	});
	
	// register visit dropdown buttons
	$('body').on('click', 'a.create_visit', function(event) {
		// we actually push state because we're about to make changes to the 'current' state by calling createVisit
		// so pushing early preserves state that we want to preserve
		TINBudget.pushState();
		TINBudget.createVisit();
		TINBudget.refreshProcedureRows();
	});
	$('body').on('click', 'a.copy_visit', function(event) {
		var visit_index = Number($(event.target).closest('.visit').attr('data-visit'));
		// open modal
		TINBudget.copyVisit(visit_index);
	});
	$('body').on('click', 'a.rename_visit', function(event) {
		var visit_index = Number($(event.target).closest('.visit').attr('data-visit'));
		TINBudget.target_visit = visit_index;
		// open modal
		TINBudget.renameVisit(visit_index);
	});
	$('body').on('click', 'a.clear_visit', function(event) {
		var visit_index = Number($(event.target).closest('.visit').attr('data-visit'));
		TINBudget.clearVisit(visit_index);
		TINBudget.pushState();
	});
	$('body').on('click', 'a.delete_visit', function(event) {
		// hide other modal content, show copy_visit section
		$('.modal-content').hide()
		$('#tinbudget_confirm_delete').show()
		$('#tinbudget_confirm_delete').find('p').text("Are you sure you want to delete this visit?")
		$("#tinbudget_modal").modal('show');
		
		var visit_index = Number($(event.target).closest('.visit').attr('data-visit'));
		TINBudget.confirmDelete = function() {
			TINBudget.deleteVisit(visit_index);
			TINBudget.refreshSchedule();
			TINBudget.pushState();
		}
	});
	$('body').on('click', '.modal .rename_visit', function(event) {
		// get new name, clear input element
		var new_visit_name = $("#tinbudget_rename_visit input").val();
		var new_visit_text = "Visit " + TINBudget.target_visit + ": " + new_visit_name;
		$("#tinbudget_rename_visit input").val("");
		
		// update target visit and clear target_visit
		var active_arm_table = $(".arm_table[data-arm='" + TINBudget.active_arm_index + "']");
		active_arm_table.find('.visit[data-visit="' + TINBudget.target_visit + '"] button').text(new_visit_text);
		TINBudget.target_visit = null;
		TINBudget.pushState();
	});
	$('body').on('click', '.modal .visit_select', function(event) {
		var btn = $(event.target);
		var visit_index = btn.attr('data-visit-index');
		if (btn.hasClass('btn-outline-primary')) {
			btn.removeClass('btn-outline-primary');
			btn.addClass('btn-primary');
			TINBudget.copy_destination_visits[visit_index] = true;
		} else {
			btn.removeClass('btn-primary');
			btn.addClass('btn-outline-primary');
			delete TINBudget.copy_destination_visits[visit_index];
		}
	});
	$('body').on('click', '.modal .copy_visit_counts', function(event) {
		// didn't select any visits
		if (jQuery.isEmptyObject(TINBudget.copy_destination_visits)) {
			return;
		}
		
		// copy counts
		var active_arm_table = $(".arm_table[data-arm='" + TINBudget.active_arm_index + "']");
		active_arm_table.find('tbody tr:not(:last-child)').each(function(i, tr) {
			for (var dest_index in TINBudget.copy_destination_visits) {
				var dest_span = $(tr).find('.proc_cell[data-visit="' + dest_index + '"] span');
				var src_span = $(tr).find('.proc_cell[data-visit="' + TINBudget.copy_source_visit_index + '"] span');
				dest_span.text(src_span.text().trim());
			}
		});
		
		// clean up
		TINBudget.copy_destination_visits = null;
		TINBudget.copy_source_visit_index = null;
		TINBudget.updateAllVisitCosts();
		TINBudget.pushState();
	});
	
	// $('body').on('click', 'button#tin_budget_edit_procedures', function(event) {
	// 	TINBudget.editProcedures();
	// });
	
	// $('body').on('click', 'button#tin_budget_procedure_comments', function(event) {
	// 	TINBudget.procedureComments();
	// });
	
	// edit procedures table's modal events (save, cancel, add row, remove row)
	$('body').on('click', '.modal .save_proc_changes', function(event) {
		// update TINBudget.procedures using edit procedures table
		var proc_table = $('table#edit_procedures');
		var comments_table = $('table#edit_procedure_comments');
		TINBudget.procedures = [];
		proc_table.find('tbody tr').each(function(i, tr) {
			var proc_name = $(tr).find('td.name input').val();
			var proc_routine_care = $(tr).find('td.routine-care input').prop('checked');
			var proc_cost = $(tr).find('td.cost input').val();
			var proc_cpt = $(tr).find('td.cpt input').val();
			var proc_added_on_the_fly = $(tr).find('td.name').hasClass("added_on_the_fly");
			if (!proc_name) {
				proc_name = "Procedure " + (i + 1);
				$(tr).find('td.name input').val(proc_name);
			}
			if (!proc_cost) {
				proc_cost = "0";
				$(tr).find('td.cost input').val(proc_cost);
			}
			var proc_comment = '';
			comments_table.find('tbody tr').each(function(j, jtr) {
				var proc_com_name = $(jtr)[0].cells[0].innerText;
				if (proc_name == proc_com_name) {
					proc_comment = $(jtr).find('td.comment textarea').val();
				}
			});
			TINBudget.procedures.push({
				name: proc_name,
				routine_care: proc_routine_care,
				cost: proc_cost,
				cpt: proc_cpt,
				added_on_the_fly: proc_added_on_the_fly,
				comment: proc_comment
			});
		});
		
		TINBudget.refreshSchedule();
		TINBudget.pushState();
	});
	$('body').on('click', '.modal .cancel_proc_changes', function(event) {
		TINBudget.refreshProceduresBank();
		TINBudget.refreshProcedureRows();
	});
	$('body').on('click', 'button#add_proc_table_row', function(event) {
		$("table#edit_procedures tbody").append("<tr>\
			<td><button type='button' class='btn btn-outline-danger delete_this_row'><i class='fas fa-trash-alt'></i></button></td>\
			<td class='name added_on_the_fly'><input type='text'></td>\
			<td class='routine-care'><input type='checkbox'></td>\
			<td class='cost'><input type='number'></td>\
			<td class='cpt'><input class='cptSelect' type='text'></td>\
		</tr>");
		
		// add autocomplete for CPT code lookup
		$("table#edit_procedures tbody tr:last-child td.cpt input").autocomplete(TINBudget.autocompSettings).focus(function(){
			$(this).data("uiAutocomplete").search($(this).val());
		});
	});
	$('body').on('click', '.delete_this_row', function(event) {
		$(event.target).closest('tr').remove();
	});
	
	// edit PROCEDURE COMMENTS table's modal events (save, cancel)
	$('body').on('click', '.modal .save_proc_comment_changes', function(event) {
		// update TINBudget.procedures using textarea input from user
		var comments_table = $('table#edit_procedure_comments');
		comments_table.find('tbody tr').each(function(i, tr) {
			TINBudget.my_tr = $(tr);
			var proc_name = $(tr)[0].cells[0].innerText;
			var proc_comment = $(tr).find('td.comment textarea').val();
			TINBudget.procedures.forEach(function(procedure, proc_i) {
				if (procedure.name == proc_name) {
					TINBudget.procedures[proc_i].comment = proc_comment;
				}
			})
		});
		
		TINBudget.refreshSchedule();
		TINBudget.pushState();
	});
	$('body').on('click', '.modal .cancel_proc_comment_changes', function(event) {
		TINBudget.refreshProceduresBank();
	});
	
	// -- end modal section
	
	// confirm/cancel delete via modal for arms/visits/procedures
	$('body').on('click', '#tinbudget_confirm_delete .confirm_delete', function(event) {
		if (TINBudget.confirmDelete) {
			TINBudget.confirmDelete();
		}
	});
	
	// register click event for when user clicks + or - button for procedure count cell
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
		TINBudget.pushState();
	});
	
	// hide/show buttons automatically
	$('body').on('mouseenter', '.proc_cell', function(event) {
		$('.proc_cell button').hide();
		$(event.target).find('button').show();
	});
	$('body').on('mouseleave', '.proc_cell', function(event) {
		$('.proc_cell button').hide();
	});
	
	// allow undo/redo
	$('body').on('keydown', function(event) {
		if (event.ctrlKey && event.key === 'z') {
			TINBudget.undo();
		} else if (event.ctrlKey && event.key === 'y') {
			TINBudget.redo();
		}
	});
	// register undo/redo button click events
	$('body').on('click', '#tin_budget_undo', TINBudget.undo);
	$('body').on('click', '#tin_budget_redo', TINBudget.redo);
	
	// register event to disable/enable cost field when routine care checkbox is changed
	$('body').on('change', '.routine-care input', function(event) {
		var routine_care_checkbox = $(event.target);
		var is_routine_care = routine_care_checkbox.prop('checked');
		var cost_field = $(event.target).closest('tr').find("td.cost input");
		
		if (is_routine_care) {
			cost_field.val(0);
			cost_field.prop('disabled', true);
		} else {
			cost_field.prop('disabled', false);
		}
		
	});
}

// initialization/registration
$('head').append('<link rel="stylesheet" type="text/css" href="' + TINBudget.budget_css_url + '">');
$('body').append($('#tinbudget_modal').remove());
$(document).ready(function() {
	// initialization
	TINBudget.registerEvents();
	TINBudget.states = [];
	TINBudget.stateIndex = 0;
	if (TINBudgetSurvey.soe_data && Object.keys(TINBudgetSurvey.soe_data).length !== 0) {
		//reset added_on_the_fly flags
		// TINBudgetSurvey.soe_data.procedures.forEach(function(procedure, index) {
		// 	TINBudgetSurvey.soe_data.procedures[index].added_on_the_fly = false;
		// });
		TINBudget.loadState(TINBudgetSurvey.soe_data);
		var arm_index = getUrlParameter('arm') ?? 1;
		TINBudget.showArm(arm_index);
	} else {
		TINBudget.refreshSchedule();
		TINBudget.showArm(1);
	}
	TINBudget.pushState();
});

// saving/loading
TINBudget.getState = function() {
	var schedule = {
		active_arm_index: Number(TINBudget.active_arm_index),
		arms: [],
		procedures: TINBudget.procedures
	};
	var arm_count = $('.arm_table').length;
	for (var arm_i = 1; arm_i <= arm_count; arm_i++) {
		// make arm object
		var arm_name = $(".arm[data-arm=" + arm_i + "] button.dropdown-toggle").text();
		arm_name = arm_name.substring(arm_name.search(':')+1).trim();
		var arm = {
			name: arm_name,
			visits: []
		};
		
		var visit_count = $('.arm_table[data-arm="' + arm_i + '"] .visit').length;
		for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
			var visit_dropdown = $(".arm_table[data-arm=" + arm_i + "] .visit:eq(" + (visit_i - 1) + ")");
			var visit_name = visit_dropdown.find('button').text();
			visit_name = visit_name.substring(visit_name.search(':') + 1).trim();
			
			// collect procedure counts for this visit
			var procedure_counts = [];
			var procedures_added = [];
			var visit_sum = 0;
			$('.arm_table[data-arm="' + arm_i + '"] .proc_cell[data-visit="' + visit_dropdown.attr('data-visit') + '"]').each(function(i, td) {
				var proc_name = $(".procedure:eq(" + Number(i) + ")").text().trim();
				var proc_count = Number($(td).find('span').text());
				var proc_cost = $(td).find('span').attr('data-cost');
				procedure_counts.push({
					name: proc_name,
					count: proc_count,
					cost: proc_cost
				});
				procedures_added.push(proc_name);
				visit_sum += proc_count * proc_cost;
			});
			
			// add 0 counts for any procedures that are still missing
			TINBudget.procedures.forEach(function(procedure, proc_i) {
				if (!procedures_added.includes(procedure.name)) {
					procedure_counts.push({
						name: procedure.name,
						count: 0,
						cost: procedure.cost
					});
				}
			});
			
			// add visit obj to arm.visits
			arm.visits[visit_i] = {
				name: visit_name,
				procedure_counts: procedure_counts,
				total: visit_sum
			}
		}
		// add arm obj to schedule.arms
		schedule.arms.push(arm);
	}
	return schedule
}

TINBudget.pushState = function() {
	// prune invalid future states
	TINBudget.states = TINBudget.states.slice(0, TINBudget.stateIndex + 1);
	// push new state on top
	TINBudget.states.push(TINBudget.getState());
	if (TINBudget.states.length >= TINBudget.MAX_STATES) {
		TINBudget.states.shift(); //Pop first state off array
	}
	TINBudget.stateIndex = TINBudget.states.length - 1;
	// enforce size
	TINBudget.states = TINBudget.states.slice(-TINBudget.MAX_STATES);
	
	TINBudget.refreshStateButtons()
	
	if (TINBudgetSurvey) {
		TINBudgetSurvey.updateScheduleField(JSON.stringify(TINBudget.states[TINBudget.stateIndex]));
	}
}

TINBudget.loadState = function(schedule) {
	$('#arm_dropdowns').empty();
	$('#arm_tables').empty();
	TINBudget.procedures = schedule.procedures;
	for (var arm_i in schedule.arms) {
		var arm = schedule.arms[arm_i];
		TINBudget.createArm();
		
		// set arm name
		var arm_label_index = Number(arm_i) + 1;
		TINBudget.active_arm_index = arm_label_index;
		var arm_button = $("[data-arm='" + Number(arm_label_index) + "'] button");
		arm_button.text("Arm " + arm_label_index + ": " + arm.name);
		var this_arm_table = $('.arm_table[data-arm="' + arm_label_index + '"]');
		
		// add visits
		this_arm_table.find('th:last-child, td:last-child').remove()
		arm.visits.forEach(function(visit, visit_i) {
			if (!visit) {
				return;
			}
			
			// make, rename, set counts
			TINBudget.createVisit();
			this_arm_table.find('.visit').last().find('button').text("Visit " + visit_i + ": " + visit.name);
			visit.procedure_counts.forEach(function(count_obj, count_i) {
				this_arm_table.find('tbody tr:eq(' + count_i + ') td:last-child span.proc_count').text(count_obj.count);
			});
		});
	}
	TINBudget.refreshProceduresBank();
	TINBudget.refreshProcedureRows(schedule);
	
	TINBudget.showArm(schedule.active_arm_index);
	
	TINBudget.refreshStateButtons()
	
	if (TINBudgetSurvey) {
		TINBudgetSurvey.updateScheduleField(JSON.stringify(schedule));
	}
}

TINBudget.undo = function() {
	if (TINBudget.stateIndex > 0) {
		TINBudget.stateIndex--;
		TINBudget.loadState(TINBudget.states[TINBudget.stateIndex]);
	}
}

TINBudget.redo = function() {
	var lastIndex = TINBudget.states.length - 1;
	if (TINBudget.stateIndex < lastIndex) {
		TINBudget.stateIndex++;
		TINBudget.loadState(TINBudget.states[TINBudget.stateIndex]);
	}
}

TINBudget.refreshStateButtons = function() {
	// disable/enable undo/redo buttons based on state stack
	var undo = $("#tin_budget_undo");
	var redo = $("#tin_budget_redo");
	if ((TINBudget.states.length - 1) > TINBudget.stateIndex) {	// is there a state to go forward to?
		redo.removeAttr('disabled');
	} else {
		redo.attr('disabled', 'disabled');
	}
	if (TINBudget.stateIndex > 0) {	// is there a state to go back to?
		undo.removeAttr('disabled');
	} else {
		undo.attr('disabled', 'disabled');
	}
}

// thanks: https://stackoverflow.com/questions/19491336/get-url-parameter-jquery-or-how-to-get-query-string-values-in-js
var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};