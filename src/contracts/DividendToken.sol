pragma solidity ^0.4.24;


contract DividendToken {

  function issueDividend() public payable returns (bool);

  function withdraw() public returns (uint256);

  function outstandingFor(address _recipient) public view returns (uint256);

  event DividendIssued(address indexed paidBy, uint256 amount);

  event Withdrawn(address indexed by, uint256 amount);
  
}
