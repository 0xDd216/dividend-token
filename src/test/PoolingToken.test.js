const TestPoolingToken = artifacts.require("./TestPoolingToken.sol");
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('PoolingDividendToken', function(accounts) {
  const holder = accounts[0];
  const other = accounts[1];
  const issuer = accounts[2];
  var that;

  beforeEach(async function () {
    this.token = await TestPoolingToken.new(holder, 100, 42, {from: issuer});
    this.holderBalance = web3.eth.getBalance(holder);
    that = this;
  });

  describe("pooling", function() {
    it("should owe 0 dividend on pooling payment", function() {
      return this.token.issueDividend({from: issuer, value: 41})
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => n.should.be.bignumber.equal(0))
    });

    it("should owe full dividend on payment over pool size", function () {
      return this.token.issueDividend({from: issuer, value: 50})
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => n.should.be.bignumber.equal(50))
    });

    it("should owe full dividend on cumulative payments over pool size", function () {
      return this.token.issueDividend({from: issuer, value: 13})
        .then(() => that.token.issueDividend({from: issuer, value: 41}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => n.should.be.bignumber.equal(54))
    });

    it("should account for balance change when pooling", function () {
      return this.token.issueDividend({from: issuer, value: 13})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(() => that.token.issueDividend({from: issuer, value: 41}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => n.should.be.bignumber.equal(27))
    });
  });
});

