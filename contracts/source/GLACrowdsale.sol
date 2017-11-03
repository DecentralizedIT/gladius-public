pragma solidity ^0.4.15;

import "./crowdsale/Crowdsale.sol";
import "../infrastructure/ITokenRetreiver.sol";
import "../infrastructure/authentication/whitelist/IWhitelist.sol";
import "../integration/wings/IWingsAdapter.sol";

/**
 * @title GLACrowdsale
 *
 * Gladius is the decentralized solution to protect against DDoS attacks by allowing you to connect 
 * with protection pools near you to provide better protection and accelerate your content. With an easy 
 * to use interface as well as powerful insight tools, Gladius enables anyone to protect and accelerate 
 * their website. Visit https://gladius.io/ 
 *
 * #created 29/09/2017
 * #author Frank Bonnet
 */
contract GLACrowdsale is Crowdsale, ITokenRetreiver, IWingsAdapter {

    // Whitelist used for authentication
    IWhitelist private whitelist;

    // Presale
    bool private presaleAttached;
    IToken private presaleToken;
    ICrowdsale private presale;
    mapping(address => bool) private presaleConversions;


    /**
     * Setup the whitelist
     *
     * @param _whitelist The address of the whitelist authenticator
     */
    function setupWhitelist(address _whitelist) public only_owner at_stage(Stages.Deploying) {
        whitelist = IWhitelist(_whitelist);
    }


    /**
     * Wings integration - Get the total raised amount of Ether
     *
     * Can only increased, means if you withdraw ETH from the wallet, should be not modified (you can use two fields 
     * to keep one with a total accumulated amount) amount of ETH in contract and totalCollected for total amount of ETH collected
     *
     * @return Total raised Ether amount
     */
    function totalCollected() public constant returns (uint) {
        return raised;
    }


    /**
     * Allows the implementing contract to validate a 
     * contributing account
     *
     * @param _contributor Address that is being validated
     * @return Wheter the contributor is accepted or not
     */
    function isAcceptedContributor(address _contributor) internal constant returns (bool) {
        return whitelist.authenticate(_contributor);
    }


    /**
     * Attach the presale contracts
     *
     * @param _presale The address of the private presale contract
     * @param _presaleToken The token used in the private presale 
     */
    function attachPresale(address _presale, address _presaleToken) public only_owner at_stage(Stages.Deploying) {
        presaleToken = IToken(_presaleToken);
        presale = ICrowdsale(_presale);
        presaleAttached = true;
    }


    /**
     * Allow investors that contributed in the private presale 
     * to generate the same amount of tokens in the actual crowdsale
     *
     * @param _contributor Account that contributed in the presale
     */
    function importPresaleContribution(address _contributor) public {
        require(presaleAttached);
        require(!presaleConversions[_contributor]);
        presaleConversions[_contributor] = true;

        // Read amounts from private presale
        uint distributedPresaleTokens = presaleToken.balanceOf(_contributor);

        // If this is zero _contributor did not contribute anything
        require(distributedPresaleTokens > 0);
        
        // Allocate tokens
        uint allocatedPresaleTokens = presale.balanceOf(_contributor);
        _allocateTokens(_contributor, allocatedPresaleTokens, crowdsaleEnd + 30 days);

        // Issue tokens
        if (!token.issue(_contributor, distributedPresaleTokens)) {
            revert();
        }
    }


    /**
     * Failsafe mechanism
     * 
     * Allows beneficary to retreive tokens from the contract
     *
     * @param _tokenContract The address of ERC20 compatible token
     */
    function retreiveTokens(address _tokenContract) public only_beneficiary {
        IToken tokenInstance = IToken(_tokenContract);

        // Retreive tokens from our token contract
        ITokenRetreiver(token).retreiveTokens(_tokenContract);

        // Retreive tokens from crowdsale contract
        uint tokenBalance = tokenInstance.balanceOf(this);
        if (tokenBalance > 0) {
            tokenInstance.transfer(beneficiary, tokenBalance);
        }
    }
}