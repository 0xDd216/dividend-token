pragma solidity ^0.4.24;

import "../contracts/StandardDividendToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract TestDividendToken is StandardDividendToken, ERC20Mintable {
  
  constructor(address _holder, uint256 _initialAmount, uint256 _minimum) public {
    mint(_holder, _initialAmount);
    emit Transfer(address(0x0), msg.sender, _initialAmount);
    minimum_ = _minimum;
  }
}
