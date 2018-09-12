pragma solidity ^0.4.24;

import "../contracts/StandardDividendToken.sol";

contract TestDividendToken is StandardDividendToken {

  constructor(uint256 _initialAmount, uint256 _minimum) public {
    balances[msg.sender] = _initialAmount;
    totalSupply_ = _initialAmount;
    emit Transfer(address(0x0), msg.sender, _initialAmount);
    minimum_ = _minimum;
  }

  function mint(uint256 _amount) public {
    balances[msg.sender] = balances[msg.sender].add(_amount);
    totalSupply_ = totalSupply_.add(_amount);
  }
  
}
