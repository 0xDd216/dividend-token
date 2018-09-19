pragma solidity ^0.4.24;

import "../contracts/StandardDividendToken.sol";


contract TestDividendToken is StandardDividendToken {
  
  constructor(address _holder, uint256 _initialAmount, uint256 _minimum) public {
    balances[_holder] = _initialAmount;
    totalSupply_ = _initialAmount;
    emit Transfer(address(0x0), msg.sender, _initialAmount);
    minimum_ = _minimum;
  }

  function mint(address _to, uint256 _amount) public {
    balances[_to] = balances[_to].add(_amount);
    totalSupply_ = totalSupply_.add(_amount);
  } 
}
