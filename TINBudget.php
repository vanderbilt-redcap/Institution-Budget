<?php
namespace Vanderbilt\TINBudget;

class TINBudget extends \ExternalModules\AbstractExternalModule {
	
	public function getProcedureCosts() {
		$procedure_field = $this->getProjectSetting('procedure_field');
		if (empty($procedure_field)) {
			throw new \Exception("The TIN Budget module can't determine procedure costs until a procedure cost field has been configured at the project level.");
		}
		$pid = $this->getProjectId();
		if (empty($pid)) {
			throw new \Exception("The TIN Budget module can't determine procedure costs outside of the project context (the project ID is indeterminate).");
		}
		$labels = $this->getChoiceLabels($procedure_field, $pid);
		$procedure_costs = [];
		foreach($labels as $label) {
			$pieces = explode('=', $label);
			$name = trim($pieces[0]);
			$cost = trim($pieces[1]);
			$procedure_costs[$name] = $cost;
		}
		return $procedure_costs;
	}
	
	public function getArms() {
		return ["Screening", "Drug 1", "Drug 2", "Drug 3"];
	}
	
	public function getVisits() {
		return ["Screening", "Baseline 1", "Day 5 Visit", "Day 10 Visit"];
	}
	
}