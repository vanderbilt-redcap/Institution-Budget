<?php

namespace Vanderbilt\InstituteBudget;

class PriceCheckerAPI
{
    private $url;
    private $username;
    private $password;
    private $result;
    
    public function __construct($url, $username, $password)
    {
        $this->url = trim($url);
        $this->username = trim($username);
        $this->password = trim($password);
        
    }
    
    public function getUrl(): string
    {
        return $this->url;
    }
    
    public function getUsername(): string
    {
        return $this->username;
    }
    
    public function getPassword(): string
    {
        return $this->password;
    }
    
    /**
     * Parses the incoming json data from the pricechecker api into a value/label json string compatible with js autocomplete
     * @param string $response | JSON string with keys [id, description, cpt, totalFees, minimumTotalFees, benchmarkTotalFees]
     * @return string
     */
    public function parseAPIResponse($response) : string
    {
        $decoded = json_decode($response, true);
        if ($decoded['data']) {
            return json_encode($decoded['data']);
        }
        
        return '';
    }

    public function query($queryTerm) : string
    {
        $queryTerm = urlencode(trim($queryTerm));
        $endpoint = $this->getUrl() . $queryTerm;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        
        if(!empty($this->getUsername()) && !empty($this->getPassword())) {
            curl_setopt($ch, CURLOPT_USERPWD, $this->getUsername().":".$this->getPassword());
        } else {
            return '';
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
        $response = curl_exec($ch);
        if($response === false)
        {
            error_log("IBT ERROR: Curl error: ".curl_error($ch));
            return '';
        }
        curl_close($ch);
        $response = $this->parseAPIResponse($response);
        
        return $response;
    }
}