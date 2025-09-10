<?php

use Vanderbilt\InstituteBudget\InstituteBudget;
use Vanderbilt\InstituteBudget\PriceCheckerAPI;
/**
 * @var InstituteBudget $module
 */

if ($_GET['term']) {
    $url = $module->getProjectSetting('pricechecker_endpoint_url');
    $user = $module->getProjectSetting('pricechecker_user');
    $pass = $module->getProjectSetting('pricechecker_pass');
    $priceChecker = new PriceCheckerAPI($url, $user, $pass);
    $result = $priceChecker->query($_GET['term']);
    
    header('Content-Type: application/json; charset=utf-8');
    echo $result;
}