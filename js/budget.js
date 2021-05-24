
TINBudget.MAX_STATES = 100;

TINBudget.refreshSchedule = function() {
	// highlight dropdown for active arm
	$('.arm button').removeClass('active-arm')
	$('.arm[data-arm="' + TINBudget.active_arm_index + '"] button').addClass('active-arm')
	
	// update data-arm and data-visit attributes for elements that have them
	$('[data-arm]').each(function(i, e) {
		var arm_i = Number($(e).index()) + 1;
		$(e).attr('data-arm', arm_i);
	});
	var active_arm_table = $(".arm_table[data-arm='" + TINBudget.active_arm_index + "']");
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
	
	// TODO enable/disable arm, visit, procedure dropdown options as necessary
	
	// refresh procedures, costs, and sums
	TINBudget.refreshProcedureRows();
	TINBudget.refreshProcedureOptions();
	TINBudget.refreshProcedureCosts();
	TINBudget.updateAllVisitCosts();
	
	console.log('schedule table refreshed');
}
TINBudget.refreshProceduresTable = function() {
	// remove all rows
	$("table#edit_procedures tbody").empty()
	
	// add rows to edit_procedures table using TINBudget.procedures data
	TINBudget.procedures.forEach(function(procedure, i) {
		$("table#edit_procedures tbody").append("<tr>\
			<td><button type='button' class='btn btn-outline-danger delete_this_row'><i class='fas fa-trash-alt'></i></button></td>\
			<td class='name'><input type='text'></td>\
			<td class='cost'><input type='number'></td>\
			<td class='cpt'><input type='text'></td>\
		</tr>");
		$("table#edit_procedures tbody tr:last-child td.name input").val(procedure.name);
		$("table#edit_procedures tbody tr:last-child td.cost input").val(procedure.cost);
		$("table#edit_procedures tbody tr:last-child td.cpt input").val(procedure.cpt);
	});
}
TINBudget.refreshProcedureOptions = function() {
	// remove procedure options from all procedure dropdowns, then add them based on current TINBudget.procedures
	var options = "";
	TINBudget.procedures.forEach(function(procedure, i) {
		options += '<a class="dropdown-item procedure_option" data-procedure="' + (i+1) + '" href="#">' + procedure.name + '</a>';
	});
	
	$(".procedure_option").remove();
	$(".proc_dd_cell .dropdown-menu").each(function(i, menu) {
		$(menu).prepend(options);
	});
}
TINBudget.refreshProcedureCosts = function() {
	// update all .proc_cell data-cost attributes based on the procedure selected in the dropdown in the first cell of the row
	
	$('.procedure').each(function(i, div) {
		var proc_name = $(div).find('button.dropdown-toggle').text().trim();
		var proc_cost;
		for (var procedure of TINBudget.procedures) {
			if (procedure.name == proc_name) {
				proc_cost = procedure.cost;
				break;
			}
		}
		if (!proc_cost) {
			console.log("The TIN Budget module couldn't find the procedure cost for procedure named '" + proc_name + "'!");
			return;
		}
		
		$(div).closest('tr').find('.proc_count').each(function(i, span) {
			$(span).attr('data-cost', proc_cost);
		});
	});
}
TINBudget.refreshProcedureRows = function() {
	// to be called when the #edit_procedures table is saved
	
	// for all existing procedure rows, if the name has changed, update the name (of dropdown)
	// if it doesn't exist, remove procedure row
	// if all rows in parent arm_table are gone, add 1 new procedure row
	$('.procedure').each(function(i, div) {
		var dropdown = $(div);
		var proc_index = Number(dropdown.attr('data-procedure')) - 1;
		var procedure = TINBudget.procedures[proc_index];
		
		if (procedure) {
			dropdown.find('button.dropdown-toggle').text(procedure.name);
		} else {
			// declare arm_table before removing row
			var arm_table = dropdown.closest('.arm_table');
			
			// remove row
			dropdown.closest('tr').remove();
			
			if (arm_table.find('.procedure').length == 0) {
				TINBudget.createProcedureRow(arm_table.index() + 1);
			}
		}
	});
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
	TINBudget.copy_source_arm_index = arm_index;
	
	// reset visit options based on which visit we're copying from
	$("#select_arms").empty();
	var arm_count = $('.arm_table').length;
	for (var arm_i = 1; arm_i <= arm_count; arm_i++) {
		var arm_name = $(".arm[data-arm=" + arm_i + "] button.dropdown-toggle").text();
		arm_name = arm_name.substring(arm_name.search(':')+1).trim();
		
		var arm_select_button = "<button type='button' data-arm-index='" + arm_i + "' class='btn btn-outline-primary arm_select'>" + arm_name + "</button>";
		if (arm_i == TINBudget.copy_source_arm_index) {
			arm_select_button = "<button type='button' data-arm-index='" + arm_i + "' class='btn btn-outline-secondary arm_select' disabled'>" + arm_name + "</button>"
		}
		$("#select_arms").append(arm_select_button);
	}
	
	// hide other modal content, show copy_visit section
	$('.modal-content').hide()
	$('#tinbudget_copy_arm').show()
	$("#tinbudget_modal").modal('show');
}
TINBudget.createArm = function() {
	if ($('.arm_table').length > 9) {
		alert("Can't create a new arm when more than 9 arms already exist");
		return;
	}
	
	var new_arm_i = $('.arm_table').length + 1;
	
	var visit_1_th = "<th>\
	<div class='dropdown visit' data-visit='1'>\
		<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownVisit1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
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
		<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownMenuButton" + new_arm_i + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
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
	TINBudget.refreshSchedule();
	
	return new_arm_i;
}
TINBudget.renameArm = function(arm_index) {
	// modal asking for new name
	$('.modal-content').hide()
	$('#tinbudget_rename_arm').show()
	$("#tinbudget_modal").modal('show');
}
TINBudget.clearArm = function(arm_index) {
	var table = $('.arm_table[data-arm="' + arm_index + '"]')
	table.find('span.proc_count, td.visit_total').each(function(i, element) {
		$(element).text(0)
	});
}
TINBudget.deleteArm = function(arm_index) {
	if ($('.arm').length > 1) {
		$('[data-arm="' + arm_index + '"]').remove()
	}
	
	TINBudget.refreshSchedule();
	TINBudget.showArm(Math.max(1, arm_index - 1));
}

// visit dropdown buttons
TINBudget.createVisit = function() {
	var arm_table = $(".arm_table[data-arm='" + TINBudget.active_arm_index + "']");
	var visit_count = arm_table.find('.visit').length;
	if (visit_count > 9) {
		alert("Can't create a new visit when more than 9 visits already exist");
		return;
	}
	
	var visit_j = visit_count + 1;
	var visit_dd = "<th>\
	<div class='dropdown visit' data-visit='" + visit_j + "'>\
		<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownVisit" + visit_j + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
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
}
TINBudget.renameVisit = function(visit_index) {
	$('.modal-content').hide()
	$('#tinbudget_rename_visit').show()
	$("#tinbudget_modal").modal('show');
}
TINBudget.copyVisit = function(visit_index) {
	TINBudget.copy_source_visit_index = visit_index;
	TINBudget.copy_destination_visits = {};
	
	// reset visit options based on which visit we're copying from
	$("#select_visits").empty();
	var visit_count = $('.arm_table[data-arm="' + TINBudget.active_arm_index + '"] .visit').length;
	for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
		var visit_name = $(".arm_table[data-arm=" + TINBudget.active_arm_index + "] .visit[data-visit='" + visit_i + "']").find('button').text();
		var visit_select_button = "<button type='button' class='btn btn-outline-primary visit_select' data-visit-index='" + visit_i + "'>" + visit_name + "</button>";
		if (visit_i == visit_index) {
			visit_select_button = "<button type='button' class='btn btn-outline-secondary visit_select' disabled data-visit-index='" + visit_i + "'>" + visit_name + "</button>"
		}
		visit_name = visit_name.substring(visit_name.search(':') + 1).trim();
		$("#select_visits").append(visit_select_button);
	}
	
	// hide other modal content, show copy_visit section
	$('.modal-content').hide()
	$('#tinbudget_copy_visit').show()
	$("#tinbudget_modal").modal('show');
}
TINBudget.clearVisit = function(visit_index) {
	var arm_table = $(".arm_table[data-arm='" + TINBudget.active_arm_index + "']");
	arm_table.find('.proc_cell:nth-child(' + (visit_index + 1) + ') span, .visit_total:nth-child(' + (visit_index + 1) + ')').text(0)
}
TINBudget.deleteVisit = function(visit_index) {
	var arm_index = TINBudget.active_arm_index;
	var arm_table = $(".arm_table[data-arm='" + arm_index + "']");
	
	TINBudget.arm_table = arm_table;
	if (arm_table.find('th').length > 2) {
		arm_table.find('th:nth-child(' + (visit_index + 1) + '), td:nth-child(' + (visit_index + 1) + ')').remove()
	}
	
	TINBudget.refreshSchedule();
}

// visit level helper functions
TINBudget.updateVisitCost = function(arm, visit) {
	// sum costs
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
	$(".arm_table[data-arm='" + arm + "'] .visit_total[data-visit='" + visit + "']").text(sum);
}
TINBudget.updateAllVisitCosts = function() {
	for (var arm_i = 1; arm_i <= $('.arm').length; arm_i++) {
		var visit_count = $('.arm_table[data-arm="' + arm_i + '"] .visit').length;
		for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
			TINBudget.updateVisitCost(arm_i, visit_i);
		}
	};
}

// procedure dropdown button functions
TINBudget.createProcedureRow = function(arm_index = null) {
	var arm_table = $(".arm_table[data-arm='" + (arm_index || TINBudget.active_arm_index) + "']");
	
	var proc_name = TINBudget.procedures[0].name;
	var proc_i = Number($('.procedure').length) + 1;
	var new_row = "<tr>\
	<td class='proc_dd_cell'>\
		<div class='dropdown procedure' data-procedure='1'>\
			<button type='button' class='btn btn-outline-secondary dropdown-toggle' id='dropdownProcedure" + proc_i + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\
				" + proc_name + "\
			</button>\
			<div class='dropdown-menu' aria-labelledby='dropdownProcedure" + proc_i + "'>\
				<div class='dropdown-divider'></div>\
				<a class='dropdown-item create_procedure' href='#'>Create another procedure row</a>\
				<a class='dropdown-item edit_procedures' href='#'>Edit procedures</a>\
				<a class='dropdown-item delete_procedure' href='#'>Delete this procedure row</a>\
			</div>\
		</div>\
	</td>";
	
	// add proc_count cells to new row
	var visit_count = Number(arm_table.find('.visit').length);
	for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
		new_row += "<td class='proc_cell' data-visit='" + visit_i + "'>\
			<button type='button' class='btn btn-outline-primary proc_decrement'>-</button>\
			<span data-cost='' class='proc_count mx-2'>0</span>\
			<button type='button' class='btn btn-outline-primary proc_increment'>+</button>\
		</td>"
	}
	
	// add closing tr tag
	new_row += "\
	</tr>";
	
	// append to arm_table
	arm_table.find('tbody tr:last-child').before(new_row);
	
	// refresh options
	TINBudget.refreshProcedureOptions();
}
TINBudget.editProcedures = function() {
	$('.modal-content').hide()
	$('#tinbudget_edit_procedures').show()
	$("#tinbudget_modal").modal('show');
}
TINBudget.deleteProcedureRow = function(remove_index) {
	var arm_table = $(".arm_table[data-arm='" + TINBudget.active_arm_index + "']");
	var proc_count = arm_table.find('.procedure').length;
	if (proc_count > 1) {
		arm_table.find('tbody tr:eq(' + remove_index + ')').remove();
	}
	
	TINBudget.updateAllVisitCosts();
}

// initialization/registration
$('head').append('<link rel="stylesheet" type="text/css" href="' + TINBudget.budget_css_url + '">');
$('body').append($('#tinbudget_modal').remove());
$(document).ready(function() {
	// initialization
	TINBudget.refreshProceduresTable();
	TINBudget.showArm(1);
	
	// register arm dropdown button click events
	$('body').on('click', 'a.show_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.showArm(arm_index);
		TINBudget.pushState();
	});
	$('body').on('click', 'a.copy_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.copyArm(arm_index);
	});
	$('body').on('click', 'a.create_arm', function(event) {
		var new_arm_index = TINBudget.createArm();
		TINBudget.showArm(new_arm_index);
		TINBudget.pushState();
	});
	$('body').on('click', '.arm .rename_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.target_arm = arm_index;
		TINBudget.renameArm(arm_index);
	});
	$('body').on('click', 'a.clear_arm', function(event) {
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.clearArm(arm_index);
		TINBudget.pushState();
	});
	$('body').on('click', 'a.delete_arm', function(event) {
		// hide other modal content, show copy_visit section
		$('.modal-content').hide()
		$('#tinbudget_confirm_delete').show()
		$('#tinbudget_confirm_delete').find('p').text("Are you sure you want to delete this arm?")
		$("#tinbudget_modal").modal('show');
		
		var arm_index = $(event.target).closest('div.arm').attr('data-arm');
		TINBudget.confirmDelete = function() {
			TINBudget.deleteArm(arm_index);
			TINBudget.pushState();
		}
	});
	$('body').on('click', '.modal .rename_arm', function(event) {
		// get new name, clear input element
		var new_arm_name = $("#tinbudget_rename_arm input").val();
		$("#tinbudget_rename_arm input").val("");
		
		// update target arm and clear target_arm
		$('.arm[data-arm="' + TINBudget.target_arm + '"] button').text("Arm " + TINBudget.target_arm + ": " + new_arm_name);
		TINBudget.target_arm = null;
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
		var src_arm_table_clone = $(".arm_table[data-arm='" + TINBudget.copy_source_arm_index + "']").clone()
		$("#select_arms button").each(function(i, btn) {
			if ($(btn).hasClass('btn-primary')) {
				var dest_arm_index = $(btn).attr('data-arm-index');
				src_arm_table_clone.attr('data-arm', dest_arm_index);
				$(".arm_table[data-arm='" + dest_arm_index + "']").replaceWith(src_arm_table_clone.prop('outerHTML'));
			}
		});
		TINBudget.copy_source_arm_index = null;
		TINBudget.showArm(visible_table_index);
		TINBudget.pushState();
	});
	
	// register visit dropdown buttons
	$('body').on('click', 'a.create_visit', function(event) {
		TINBudget.createVisit();
		TINBudget.pushState();
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
	
	// register procedure dropdown buttons
	$('body').on('click', 'a.create_procedure', function(event) {
		TINBudget.createProcedureRow();
		TINBudget.pushState();
	});
	$('body').on('click', 'a.edit_procedures', function(event) {
		TINBudget.editProcedures();
	});
	$('body').on('click', 'a.delete_procedure', function(event) {
		var remove_index = $(event.target).closest('tr').index();
		TINBudget.deleteProcedureRow(remove_index);
		TINBudget.pushState();
	});
	$('body').on('click', 'a.procedure_option', function(event) {
		var proc_option = $(event.target);
		var procedure_dropdown = proc_option.closest('.procedure').find('button.dropdown-toggle');
		
		// set new procedure name/index
		procedure_dropdown.text(proc_option.text().trim());
		procedure_dropdown.parent().attr('data-procedure', proc_option.attr('data-procedure'));
		
		// refresh costs and sums
		TINBudget.refreshProcedureCosts();
		TINBudget.updateAllVisitCosts();
		TINBudget.pushState();
	});
	
	// edit procedures table's modal events (save, cancel, add row, remove row)
	$('body').on('click', '.modal .save_proc_changes', function(event) {
		// update TINBudget.procedures using edit procedures table
		var proc_table = $('table#edit_procedures');
		TINBudget.procedures = [];
		proc_table.find('tbody tr').each(function(i, tr) {
			var proc_name = $(tr).find('td.name input').val();
			var proc_cost = $(tr).find('td.cost input').val();
			if (!proc_name) {
				proc_name = "Procedure " + (i + 1);
				$(tr).find('td.name input').val(proc_name);
			}
			if (!proc_cost) {
				proc_cost = "0";
				$(tr).find('td.cost input').val(proc_cost);
			}
			TINBudget.procedures.push({name: proc_name, cost: proc_cost});
		});
		
		TINBudget.refreshSchedule();
		TINBudget.pushState();
	});
	$('body').on('click', '.modal .cancel_proc_changes', function(event) {
		TINBudget.refreshProceduresTable();
	});
	$('body').on('click', 'button#add_proc_table_row', function(event) {
		$("table#edit_procedures tbody").append("<tr>\
			<td><button type='button' class='btn btn-outline-danger delete_this_row'><i class='fas fa-trash-alt'></i></button></td>\
			<td class='name'><input type='text'></td>\
			<td class='cost'><input type='number'></td>\
		</tr>");
	});
	$('body').on('click', '.delete_this_row', function(event) {
		$(event.target).closest('tr').remove();
	});
	
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
	
	TINBudget.states = [];
	TINBudget.stateIndex = 0;
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
			visits: [],
			procedureRows: []
		};
		
		// add procedure rows
		$(".arm_table[data-arm=" + arm_i + "] .procedure").each(function(i, div) {
			var proc_index = $(div).attr('data-procedure');
			var proc_name = $(div).find('button.dropdown-toggle').text().trim()
			arm.procedureRows.push({
				name: proc_name,
				index: proc_index
			});
		});
		
		var visit_count = $('.arm_table[data-arm="' + arm_i + '"] .visit').length;
		for (var visit_i = 1; visit_i <= visit_count; visit_i++) {
			var visit_name = $(".arm_table[data-arm=" + arm_i + "] .visit[data-visit='" + visit_i + "']").find('button').text();
			visit_name = visit_name.substring(visit_name.search(':') + 1).trim();
			
			// collect procedure counts for this visit
			var procedure_counts = [];
			var visit_sum = 0;
			$('.arm_table[data-arm="' + arm_i + '"] .proc_cell[data-visit="' + visit_i + '"]').each(function(i, td) {
				var proc_index = $(td).closest('tr').find('.procedure').attr('data-procedure');
				var proc_count = Number($(td).find('span').text());
				var proc_cost = $(td).find('span').attr('data-cost');
				procedure_counts.push({
					procedure_index: proc_index,
					count: proc_count,
					cost: proc_cost
				});
				visit_sum += proc_count * proc_cost;
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
	TINBudget.stateIndex = TINBudget.states.length - 1;
	// enforce size
	TINBudget.states = TINBudget.states.slice(-TINBudget.MAX_STATES);
	
	TINBudget.refreshStateButtons()
	
	console.log("pushed state, states:", TINBudget.states);
	
	if (TINBudgetSurvey) {
		TINBudgetSurvey.updateScheduleFields(JSON.stringify(TINBudget.states[TINBudget.states.length-1]));
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
		$('.active-arm').text("Arm " + arm_label_index + ": " + arm.name);
		var this_arm_table = $('.arm_table[data-arm="' + arm_label_index + '"]');
		
		// add procedure rows
		for (var procedure_row_i in arm.procedureRows) {
			if (procedure_row_i > 0) {
				TINBudget.createProcedureRow(arm_label_index);
			}
			var row_obj = arm.procedureRows[procedure_row_i];
			
			// set name and procedure-index attribute after creating row
			this_arm_table.find('.procedure').last().find('button').text(row_obj.name);
			this_arm_table.find('.procedure').last().attr('data-procedure', row_obj.index);
		}
		
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
	TINBudget.refreshProceduresTable();
	TINBudget.showArm(schedule.active_arm_index);
	
	TINBudget.refreshStateButtons()
	
	if (TINBudgetSurvey) {
		TINBudgetSurvey.updateScheduleFields(JSON.stringify(schedule));
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