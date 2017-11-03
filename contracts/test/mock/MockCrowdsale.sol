pragma solidity ^0.4.15;


/**
 * @title Mock crowdsale for testing only
 *
 * #created 23/10/2017
 * #author Frank Bonnet
 */  
contract MockCrowdsale {

    mapping (address => uint) private balances;


    function setBalanceOf(address _owner, uint _balance) {
        balances[_owner] = _balance;
    }


    /** 
     * Get the allocated token balance of `_owner`
     * 
     * @param _owner The address from which the allocated token balance will be retrieved
     * @return The allocated token balance
     */
    function balanceOf(address _owner) public constant returns (uint) {
        return balances[_owner];
    }
}
