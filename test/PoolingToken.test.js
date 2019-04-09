const TestPoolingToken = artifacts.require("./TestPoolingToken.sol");
const BigNumber = require('bignumber.js');
require('openzeppelin-test-helpers');

contract('PoolingDividendToken', function(accounts) {
  const holder = accounts[0];
  const other = accounts[1];
  const issuer = accounts[2];
  var that;

  beforeEach(async function () {
    this.token = await TestPoolingToken.new(holder, 100, 42, {from: issuer});
    this.holderBalance = web3.eth.getBalance(holder);
    this.bigAmount = new BigNumber(44);
    this.smallAmount = new BigNumber(22);
    this.zero = new BigNumber(0);
    that = this;
  });

  describe("pooling", function() {
    it("should owe 0 dividend on pooling payment", function() {
      return this.token.issueDividend({from: issuer, value: that.sm})
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(that.zero))
    });

    it("should owe full dividend on payment over pool size", function () {
      return this.token.issueDividend({from: issuer, value: that.bigAmount})
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(that.bigAmount))
    });

    it("should owe full dividend on cumulative payments over pool size", function () {
      return this.token.issueDividend({from: issuer, value: that.smallAmount})
        .then(() => that.token.issueDividend({from: issuer, value: that.smallAmount}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(that.bigAmount))
    });

    it("should account for balance change when pooling", function () {
      return this.token.issueDividend({from: issuer, value: that.smallAmount})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(() => that.token.issueDividend({from: issuer, value: that.smallAmount}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(that.smallAmount))
    });
  });
});

