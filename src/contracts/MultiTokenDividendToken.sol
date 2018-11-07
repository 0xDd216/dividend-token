pragma solidity ^0.4.24;

import "./TokenDividendToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


contract MultiTokenDividendToken is TokenDividendToken, ERC20 {
  using SafeMath for uint256;

  struct Owed {
    uint256 to;
    uint256 amount;
  }

  struct TokenRecord {
    mapping (address => Owed) owed;
    uint256[] totals;
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
    if (record.totals.length <= 1) return 0;
    
    uint extra = record.totals[record.totals.length.sub(1)]
      .sub(record.totals[record.owed[_recipient].to])
      .mul(balanceOf(_recipient))
      .div(record.baseTotal);
    return record.owed[_recipient].amount.add(extra);
    
  }

  function _unissuedTokens(IERC20 _token) internal view returns (uint256) {
    TokenRecord storage record = tokens_[address(_token)];
    uint balance = _token.balanceOf(address(this));
    
    if (record.totals.length == 0) return balance;
    
    return balance
      .add(record.paidOut)
      .sub(record.totals[record.totals.length.sub(1)]);
  }

  function _addTokenDividend(IERC20 _token, uint256 _amount) internal {
    require(totalSupply() > 0, "There must be tokens to distribute to");

    TokenRecord storage record = tokens_[address(_token)];
  
    if (record.totals.length == 0) {     
      issuedFor_.push(address(_token)); // update record of which tokens have been paid out in
      record.totals.push(0);
      if (record.baseTotal == 0) record.baseTotal = totalSupply();
    }
    
    if (totalSupply() == record.baseTotal) {
      record.totals.push(record.totals[record.totals.length.sub(1)]
                         .add(_amount));
    }
    else {
      uint amount = _amount.mul(record.baseTotal).div(totalSupply());
      record.totals.push(record.totals[record.totals.length.sub(1)]
                         .add(amount));
    }    
  }

  function _withdrawTokenFor(IERC20 _token, address _address) internal returns (uint256) {
    TokenRecord storage record = tokens_[address(_token)];
    _updateTokensOwed(_token, _address);
    uint amount = record.owed[_address].amount;
    if (amount > 0) {
      
    }
    return amount;
  }

  function _updateTokensOwed(IERC20 _token, address _for) internal {
    TokenRecord storage record = tokens_[address(_token)];
    uint latestDividend = record.totals.length.sub(1);
    if (record.owed[_for].to != latestDividend) {
      uint extra = record.totals[latestDividend]
        .sub(record.totals[record.owed[_for].to])
        .mul(balanceOf(_for))
        .div(record.baseTotal);
      record.owed[_for].amount = record.owed[_for].amount.add(extra);
      record.owed[_for].to = latestDividend;
    } 
  }
}
