const TestDividendToken = artifacts.require("./TestDividendToken.sol");
const TestPoolingToken = artifacts.require("./TestPoolingToken.sol");
const BigNumber = web3.BigNumber;
const { assertRevert } = require("openzeppelin-solidity/test/helpers/assertRevert.js");

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('StandardDividendToken', function(accounts) {

  const holder = accounts[0];
  const other = accounts[1];
  const issuer = accounts[2];
  var that;

  beforeEach(async function () {
    this.token = await TestDividendToken.new(holder, 100, 42, {from: issuer});
    this.holderBalance = web3.eth.getBalance(holder);
    this.otherBalance = web3.eth.getBalance(other);
    that = this;
  });

  describe("restrictions", function() {
    it("should revert on payment below minimum", function() {
      return assertRevert(this.token.issueDividend({from: issuer, value: 41}));
    });

    it("should revert on payment to zero balance contract", function () {
      return TestDividendToken.new(holder, 0, 0)
        .then(t => assertRevert(t.issueDividend({from: issuer, value: 42})));
    });
  });

  describe("initialization", function() {
    it("should owe 0 dividend on initialization", function() {
      return this.token.outstandingFor.call(holder, {from: holder})
        .then(n => n.should.be.bignumber.equal(0))
    });

    it("should pay 0 dividend after initialization", function() {
      return this.token.withdraw({from: holder})
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(holder).add(tx.gasPrice.mul(gasUsed));
          that.holderBalance.should.be.bignumber.equal(after);
        })
    });
  });

  describe("issuing dividends", function() {
    it("should hold correct balance after issuing dividend", function() {   
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => web3.eth.getBalance(that.token.address)
              .should.be.bignumber.equal(42))
    });

    it("should owe full dividend after issuing", function () {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => n.should.be.bignumber.equal(42))
    });

    it("should pay full dividend after issuing", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.withdraw({from: holder}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(holder).add(tx.gasPrice.mul(gasUsed));
          that.holderBalance.add(42).should.be.bignumber.equal(after);
        })
    });

    it("should owe correct proportion of dividend", function() {
      return this.token.transfer(other, 25, {from: holder})
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n =>  n.should.be.bignumber.equal(31))
        .then(() => that.token.outstandingFor.call(other, {from: holder}))
        .then(n => n.should.be.bignumber.equal(10))
    });

    it("should pay correct proportion of dividend", function() {
      return this.token.transfer(other, 25, {from: holder})
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.withdraw({from: other}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(other).add(tx.gasPrice.mul(gasUsed));
          that.otherBalance.add(10).should.be.bignumber.equal(after);
        })
    });     

    it("should owe 0 after withdrawing dividend", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.withdraw({from: holder}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => outstanding.should.be.bignumber.equal(0))
    });
    
    it("should pay 0 after withdrawing dividend", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.withdraw({from: holder})) // withdraw funds
        .then(function () {
          this.holderBalance = web3.eth.getBalance(holder);
          return that.token.withdraw({from: holder}); // try again
        })
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(holder).add(tx.gasPrice.mul(gasUsed));
          this.holderBalance.should.be.bignumber.equal(after);
        })
    });

    it("should owe correct dividend after post-issuance transfer", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => outstanding.should.be.bignumber.equal(42))
    });

    it("should pay correct dividend after post-issuance transfer", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.transfer(other, 25, {from: holder}))      
        .then(function(receipt) {
          gasUsed = receipt.receipt.gasUsed;
          return that.token.withdraw({from: holder});
        })
        .then(function(receipt) {
          gasUsed += receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) { // assume gasPrice of txs is same
          const after = web3.eth.getBalance(holder).add(tx.gasPrice.mul(gasUsed));
          that.holderBalance.add(42).should.be.bignumber.equal(after);
        })
    });

    it("should owe correct cumulative dividends in proportion", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => outstanding.should.be.bignumber.equal(63))
    });

    it("should pay correct cumulative dividends in proportion", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return that.token.issueDividend({from: issuer, value: 42})
        })
        .then(() => that.token.withdraw({from: holder}))      
        .then(function(receipt) {
          this.gasUsed += receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(holder).add(tx.gasPrice.mul(gasUsed));
          that.holderBalance.add(63).should.be.bignumber.equal(after);
        })
    });
  });

  describe("changing supply", function() {
    it("should owe correct dividend after change in supply", function() {
      return this.token.transfer(other, 50, {from: holder})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => n.should.be.bignumber.equal(10))
    });

    it("should pay correct dividend after change in supply", function() {
      return this.token.transfer(other, 50, {from: holder})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.withdraw({from: other}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(other).add(tx.gasPrice.mul(gasUsed));
          that.otherBalance.add(31).should.be.bignumber.equal(after);
        })
    });

    it("should owe correct cumulative dividends with change in supply", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => outstanding.should.be.bignumber.equal(63))
    });

    it("should pay correct cumulative dividends with change in supply", function() {
      return this.token.issueDividend({from: issuer, value: 42})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: 42}))
        .then(() => that.token.withdraw({from: holder}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) {
          const after = web3.eth.getBalance(holder).add(tx.gasPrice.mul(gasUsed));
          that.holderBalance.add(63).should.be.bignumber.equal(after);
        })
    });
  });

});

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

