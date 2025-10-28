<?php

use Vanderbilt\InstituteBudget\InstituteBudget;
use Vanderbilt\InstituteBudget\PriceCheckerAPI;
/**
 * @var InstituteBudget $module
 */

if ($_GET['term']) {
    $priceChecker = $module->getPriceCheckerApi();
    $result = $priceChecker->query($_GET['term']);
    
    header('Content-Type: application/json; charset=utf-8');
    echo $result;
}