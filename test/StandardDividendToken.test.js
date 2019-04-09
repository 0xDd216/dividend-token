const TestDividendToken = artifacts.require("./TestDividendToken.sol");
const BigNumber = require('bignumber.js');
const { shouldFail } = require("openzeppelin-test-helpers");

contract('StandardDividendToken', function(accounts) {

  const holder = accounts[0];
  const other = accounts[1];
  const issuer = accounts[2];
  var that;

  beforeEach(async function () {
    this.amount = new BigNumber(42);
    this.smallAmount = new BigNumber(41);
    this.zero = new BigNumber(0);
    this.token = await TestDividendToken.new(holder, 100, 
                                             this.amount, 
                                             {from: issuer});
    this.holderBalance = await web3.eth.getBalance(holder)
      .then(n => new BigNumber(n));

    this.otherBalance = await web3.eth.getBalance(other)
      .then(n => new BigNumber(n));
    that = this;
  });

  describe("restrictions", function() {
    it("should revert on payment below minimum", function() {
      return shouldFail.reverting(this.token.issueDividend({from: issuer, 
                                                            value: that.smallAmount}));
    });

    it("should revert on payment to zero balance contract", function () {
      return TestDividendToken.new(holder, 0, 0)
        .then(t => shouldFail.reverting(t.issueDividend({from: issuer, 
                                                         value: that.amount})));
    });
  });

  describe("initialization", function() {
    it("should owe 0 dividend on initialization", function() {
      return this.token.outstandingFor.call(holder, {from: holder})
        .then(n => new BigNumber(n).should.be.bignumber.equal(that.zero))
    });

    it("should pay 0 dividend after initialization", function() {
      return this.token.withdraw({from: holder})
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(holder);
        })
        .then(function(balance) {      
          const after = new BigNumber(balance)
                .plus(new BigNumber(this.gasPrice).times(gasUsed));          
          that.holderBalance.should.be.bignumber.equal(after);
        })
    });
  });

  describe("issuing dividends", function() {
    it("should hold correct balance after issuing dividend", function() {   
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => web3.eth.getBalance(that.token.address))
        .then(balance => new BigNumber(balance)
              .should.be.bignumber.equal(that.amount))
    });

    it("should owe full dividend after issuing", function () {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(that.amount))
    });

    it("should pay full dividend after issuing", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.withdraw({from: holder}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(holder);
        })
        .then(function (balance) {
          const after = new BigNumber(balance)
                .plus(new BigNumber(this.gasPrice).times(gasUsed));
          that.holderBalance.plus(that.amount).should.be.bignumber.equal(after);
        })
    });

    it("should owe correct proportion of dividend", function() {
      return this.token.transfer(other, 25, {from: holder})
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n =>  new BigNumber(n).should.be.bignumber.equal(31))
        .then(() => that.token.outstandingFor.call(other, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(10))
    });

    it("should pay correct proportion of dividend", function() {
      return this.token.transfer(other, 25, {from: holder})
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.withdraw({from: other}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(other);
        })
        .then(function(balance) {
          const after = new BigNumber(balance)
                .plus(new BigNumber(this.gasPrice).times(gasUsed));
          that.otherBalance.plus(10).should.be.bignumber.equal(after);
        })
    });     

    it("should owe 0 after withdrawing dividend", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.withdraw({from: holder}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => new BigNumber(outstanding)
              .should.be.bignumber.equal(that.zero))
    });
    
    it("should pay 0 after withdrawing dividend", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.withdraw({from: holder})) // withdraw funds
        .then(function () {
          return web3.eth.getBalance(holder);
        })
        .then(function (balance) {
          this.holderBalance = balance;
          return that.token.withdraw({from: holder}); // try again
        })
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx)
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(holder);
        })
        .then(function(balance) {
          const after = new BigNumber(balance)
                .plus(new BigNumber(this.gasPrice).times(gasUsed));
          this.holderBalance.should.be.bignumber.equal(after);
        })
    });

    it("should owe correct dividend after post-issuance transfer", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => new BigNumber(outstanding)
              .should.be.bignumber.equal(that.amount))
    });

    it("should pay correct dividend after post-issuance transfer", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
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
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(holder);
        })
        .then(function(balance) {
          const after = new BigNumber(balance).plus(new BigNumber(this.gasPrice).times(gasUsed));
          that.holderBalance.plus(that.amount).should.be.bignumber.equal(after);
        })
    });

    it("should owe correct cumulative dividends in proportion", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => new BigNumber(outstanding)
              .should.be.bignumber.equal(new BigNumber(63)))
    });

    it("should pay correct cumulative dividends in proportion", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.transfer(other, 50, {from: holder}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return that.token.issueDividend({from: issuer, value: that.amount})
        })
        .then(() => that.token.withdraw({from: holder}))      
        .then(function(receipt) {
          this.gasUsed += receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(holder);
        })
        .then(function(balance) {          
          const after = new BigNumber(balance).plus(new BigNumber(this.gasPrice).times(gasUsed));
          that.holderBalance.plus(63).should.be.bignumber.equal(after);
        })
    });
  });

  describe("changing supply", function() {
    it("should owe correct dividend after change in supply", function() {
      return this.token.transfer(other, 50, {from: holder})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(n => new BigNumber(n).should.be.bignumber.equal(10))
    });

    it("should pay correct dividend after change in supply", function() {
      return this.token.transfer(other, 50, {from: holder})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.withdraw({from: other}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(other);
        })
        .then(function(balance) {
          const after = new BigNumber(balance) 
                .plus(new BigNumber(this.gasPrice).times(gasUsed));
          that.otherBalance.plus(31).should.be.bignumber.equal(after);
        })
    });

    it("should owe correct cumulative dividends with change in supply", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.outstandingFor.call(holder, {from: holder}))
        .then(outstanding => new BigNumber(outstanding)
              .should.be.bignumber.equal(new BigNumber(63)))
    });

    it("should pay correct cumulative dividends with change in supply", function() {
      return this.token.issueDividend({from: issuer, value: that.amount})
        .then(() => that.token.mint(other, 100, {from: issuer}))
        .then(() => that.token.issueDividend({from: issuer, value: that.amount}))
        .then(() => that.token.withdraw({from: holder}))
        .then(function(receipt) {
          this.gasUsed = receipt.receipt.gasUsed;
          return web3.eth.getTransaction(receipt.tx);
        })
        .then(function(tx) {
          this.gasPrice = tx.gasPrice;
          return web3.eth.getBalance(holder);
        })
        .then(function(balance) {          
          const after = new BigNumber(balance)
                .plus(new BigNumber(this.gasPrice).times(gasUsed));
          that.holderBalance.plus(63).should.be.bignumber.equal(after);
        })
    });
  });

});
