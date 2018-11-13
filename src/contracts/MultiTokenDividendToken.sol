pragma solidity ^0.4.24;

import "./TokenDividendToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


contract MultiTokenDividendToken is TokenDividendToken, ERC20 {
  using SafeMath for uint256;

  struct Owed {
    uint256 amount;
    uint256 paidFrom;
  }

  struct TokenRecord {
    mapping (address => Owed) owed;
    uint256 total;
    uint256 baseTotal;
    uint256 minimum;
    uint256 paidOut;
  }

  mapping (address => TokenRecord) internal tokens_;
  address[] internal issuedFor_;

  function issueTokenDividend(IERC20 _token) public returns (bool) {
    TokenRecord storage record = tokens_[address(_token)];
    uint unissued = _unissuedTokens(_token);
    require(unissued >= record.minimum, "Unissued tokens less than minimum");
    _addTokenDividend(_token, unissued);
    emit TokenDividendIssued(_token, unissued);
    return true;
  }
  
  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool) {
    IERC20 token;
    // bound by total number of tokens used to issue dividends
    for (uint i = 0; i < issuedFor_.length; i++) {
      token = IERC20(issuedFor_[i]);
      _updateTokensOwed(token, _from);
      _updateTokensOwed(token, _to);
    }
    return super.transferFrom(_from, _to, _value);
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    IERC20 token;
    // bound by total number of tokens used to issue dividends
    for (uint i = 0; i < issuedFor_.length; i++) {
      token = IERC20(issuedFor_[i]);
      _updateTokensOwed(token, msg.sender);
      _updateTokensOwed(token, _to);
    }
    return super.transfer(_to, _value);
  }
  
  function outstandingTokensFor(IERC20 _token, address _recipient)
    public view returns (uint256) {
    TokenRecord storage record = tokens_[address(_token)];
    if (record.total == 0) return 0;
    
    uint extra = record.total
      .sub(record.owed[_recipient].paidFrom)
      .mul(balanceOf(_recipient))
      .div(record.baseTotal);
    return record.owed[_recipient].amount.add(extra);
    
  }

  function _unissuedTokens(IERC20 _token) private view returns (uint256) {
    TokenRecord storage record = tokens_[address(_token)];
    uint balance = _token.balanceOf(address(this));
    
    if (record.total == 0) return balance;
    
    return balance
      .add(record.paidOut)
      .sub(record.total);
  }

  /**
   * Assumes _amount is available to distribute
   */
  function _addTokenDividend(IERC20 _token, uint256 _amount) private {
    require(totalSupply() > 0, "There must be tokens to distribute to");

    TokenRecord storage record = tokens_[address(_token)];
  
    if (record.total == 0) {     
      issuedFor_.push(address(_token)); // update record of which tokens have been paid out in
      if (record.baseTotal == 0) record.baseTotal = totalSupply();
    }
    
    if (totalSupply() == record.baseTotal) {
      record.total = record.total.add(_amount);
    }
    else {
      uint amount = _amount.mul(record.baseTotal).div(totalSupply());
      record.total = record.total.add(amount);
    }
    record.paidOut = record.paidOut.add(_amount);
  }

  function _withdrawTokenFor(IERC20 _token, address _address) internal returns (uint256) {
    TokenRecord storage record = tokens_[address(_token)];
    _updateTokensOwed(_token, _address);
    uint amount = record.owed[_address].amount;
    if (amount > 0) {
      _token.transfer(_address, amount);
    }   
    return amount;
  }

  function _updateTokensOwed(IERC20 _token, address _for) internal {
    TokenRecord storage record = tokens_[address(_token)];
    if (record.owed[_for].paidFrom < record.total) {
      uint extra = record.total
        .sub(record.owed[_for].paidFrom)
        .mul(balanceOf(_for))
        .div(record.baseTotal);
      record.owed[_for].amount = record.owed[_for].amount.add(extra);
      record.owed[_for].paidFrom = record.total;
    } 
  }
}
