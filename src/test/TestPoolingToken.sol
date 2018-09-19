pragma solidity ^0.4.24;

import "../contracts/PoolingDividendToken.sol";


contract TestPoolingToken is PoolingDividendToken {

  constructor(address _holder, uint256 _initialAmount, uint256 _poolSize)
    PoolingDividendToken(_poolSize) public {
    balances[_holder] = _initialAmount;
    totalSupply_ = _initialAmount;
    emit Transfer(address(0x0), msg.sender, _initialAmount);    
  }

}
