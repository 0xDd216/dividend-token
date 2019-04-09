pragma solidity ^0.5.0;

import "./StandardDividendToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title PoolingDividendToken
 * @author 0xDd216
 * @dev Dividend Token where amount paid in is held until the amount 
 * is greater than specified pool size, then paid out as a
 * dividend.
 */
contract PoolingDividendToken is StandardDividendToken {
  using SafeMath for uint256;

  uint256 internal poolSize_;
  uint256 private held_;

  /**
   * @param _poolSize maximum amount of withheld funds
   */
  constructor(uint256 _poolSize) StandardDividendToken() public {
    poolSize_ = _poolSize;
  }

  function _addDividend(uint256 _amount) internal {
    uint256 _total = held_.add(_amount);
    if (_total >= poolSize_) {
      held_ = 0;
      super._addDividend(_total);
    } else {
      held_ = _total;
    }
  }
}
