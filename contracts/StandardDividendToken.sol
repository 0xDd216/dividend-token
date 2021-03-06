pragma solidity ^0.5.0;

import "./DividendToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/**
 * @title StandardDividendToken
 * @author 0xDd216
 * @dev Allows token holders to withdraw dividends paid into the contract
 * in proportion to their holdings at the point the dividend was paid.
 * Changes in total token supply are accounted for. Only the token holder
 * can trigger withdrawal of their funds.
 * Calculations of owed amounts are amortized, so there exist no unbounded 
 * functions in terms of work done.
 */
contract StandardDividendToken is DividendToken, ERC20 {
  using SafeMath for uint256;

  struct Owed {    
    uint256 amount; // amount owed
    uint256 paidFrom; // total dividend paid out from
  }
  
  mapping (address => Owed) internal owed_; // Outstanding balance by address
  uint256 private total_; // total (adjusted) dividends issued
  uint256 private baseTotal_; // Used to account for changes in supply
  uint256 internal minimum_; // Minimum dividend amount allowed (default 0)

  /**
   * @dev Pays a dividend into the contract. Value must be above minimum_.
   * Should probably override this method to constrain who can call it.
   */
  function issueDividend() public payable returns (bool) {
    require(msg.value >= minimum_, "Dividend amount is less than minimum");
    _addDividend(msg.value);
    emit DividendIssued(msg.sender, msg.value);
    return true;
  }

  /**
   * @dev Updates owed amounts for sender and receiver first
   */
  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool) {
    _updateOwed(_from);
    _updateOwed(_to);
    return super.transferFrom(_from, _to, _value);
  }

  /**
   * @dev Updates owed amounts for sender and receiver first
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    _updateOwed(msg.sender);
    _updateOwed(_to);
    return super.transfer(_to, _value);
  }

  /**
   * @dev Gets the total amount withdrawable by the given address
   * @param _recipient address
   * @return wei owed
   */
  function outstandingFor(address _recipient) public view returns (uint256) {
    if (total_ == 0) return 0;
    uint extra = total_
      .sub(owed_[_recipient].paidFrom)
      .mul(balanceOf(_recipient))
      .div(baseTotal_);
    return owed_[_recipient].amount.add(extra);
  }

  /**
   * @dev Withdraws owed dividend payments to the calling address
   * @return wei paid
   */
  function withdraw() public returns (uint256) {
    uint amount = _withdrawFor(msg.sender);
    emit Withdrawn(msg.sender, amount);
    return amount;
  }

  /**
   * @dev Adds an incoming dividend payment to cumulative
   * total_ to facilitate withdrawal calculation. total_
   * holds the cumulative total of payments, adjusted for
   * change in total supply against a base rate. If baseTotal_
   * is not set then it is set to equal totalSupply().
   */
  function _addDividend(uint256 _amount) internal {
    // avoid divide-by-zero
    require(totalSupply() > 0, "There must be tokens to distribute to");
    
    // if we are yet to set a base total then do so
    if (total_ == 0 && baseTotal_ == 0)
      baseTotal_ = totalSupply();
    
    if (totalSupply() == baseTotal_)
      total_ = total_.add(_amount);
    else {
      // to avoid re-calculation of percentage holdings when
      // supply changes, we factor the changes into the
      // cumulative total of paid dividends
      uint amount = _amount.mul(baseTotal_).div(totalSupply());
      total_ = total_.add(amount);
    }
  }  

  /**
   * @dev Internal function which pays out to a given address. Expose to allow
   * 'push' payments. Won't trigger transfer if 0 owed.
   * @param _address to withdraw on behalf of
   * @return the amount withdrawn
   */
  function _withdrawFor(address payable _address) internal returns (uint256) {
    _updateOwed(_address);
    uint amount = owed_[_address].amount;
    if (amount > 0) {
      owed_[_address].amount = 0;
      _address.transfer(amount);
    }
    return amount;
  }

  /**
   * @dev Updates the record of the amount owed for a given address.
   * Takes the total (adjusted) dividends paid since last update
   * and divides by the balance of the address. Must be called
   * before balance is adjusted.
   */
  function _updateOwed(address _for) internal {
    if (owed_[_for].paidFrom < total_) {
      uint extra = total_
        .sub(owed_[_for].paidFrom)
        .mul(balanceOf(_for))
        .div(baseTotal_);
      owed_[_for].amount = owed_[_for].amount.add(extra);
      owed_[_for].paidFrom = total_;
    }
  }
}
