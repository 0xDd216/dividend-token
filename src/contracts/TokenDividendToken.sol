pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


contract TokenDividendToken {

  function issueTokenDividend(IERC20 _token) public returns (bool);

  function withdrawToken(IERC20 _token) public returns (uint256);

  function outstandingTokensFor(IERC20 _token, address _recipient) public view returns (uint256);

  event TokenDividendIssued(IERC20 indexed token, uint256 amount);

  event TokenWithdrawn(IERC20 indexed token, address indexed by, uint256 amount);

}
