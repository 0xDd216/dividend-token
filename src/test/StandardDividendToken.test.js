var TestDividendToken = artifacts.require("./TestDividendToken.sol");
const BigNumber = web3.BigNumber;
const { assertRevert } = require("openzeppelin-solidity/test/helpers/assertRevert.js");

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('StandardDividendToken', function(accounts) {

  var creator = accounts[0];
  var other = accounts[1];
  var issuer = accounts[2];

  it("should owe 0 dividend on initialization", function() {
    return TestDividendToken.new(100, 0)
      .then(instance => instance.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(0))
  });

  it("should pay 0 dividend after initialization", function() {
    var preBalance;
    var gasUsed;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        preBalance = web3.eth.getBalance(creator);
        return instance.withdraw({from: creator})
      })
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx)
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after);
      })
  });

  it("should hold correct balance after issuing dividend", function() {
    var token;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        token = instance;
        return token.issueDividend({from: issuer, value: 42})
      })
      .then(() => web3.eth.getBalance(token.address).should.be.bignumber.equal(42))
  });

  it("should revert on payment below minimum", function() {
    return TestDividendToken.new(100, 42)
      .then(instance => assertRevert(instance.issueDividend({from: issuer, value: 41})))
  });

  it("should revert on payment to zero balance contract", function () {
    return TestDividendToken.new(0, 0)
      .then(instance => assertRevert(instance.issueDividend({from: issuer, value: 42})));
  });

  it("should owe full dividend after issuing", function () {
    var token;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        token = instance;
        return token.issueDividend({from: issuer, value: 1000})
      })
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(1000))
  });

  it("should pay full dividend after issuing", function() {
    var token;
    var preBalance;
    var gasUsed;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        preBalance = web3.eth.getBalance(creator);
        token = instance;
        return token.issueDividend({from: issuer, value: 1000});
      })
      .then(() => token.withdraw({from: creator}))
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx)
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after.sub(1000));
      })
  });

  it("should owe correct proportion of dividend", function() {
    var token;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        token = instance;
        token.transfer(other, 25, {from: creator});
      })
      .then(() => token.issueDividend({from: issuer, value: 1000}))
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding =>  outstanding.should.be.bignumber.equal(750))
      .then(() => token.outstandingFor.call(other, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(250))
  });

  it("should pay correct proportion of dividend", function() {
    var token;
    var preBalance;
    var gasUsed;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        preBalance = web3.eth.getBalance(other);
        token = instance;
        return token.transfer(other, 25, {from: creator});
      })
      .then(() => token.issueDividend({from: issuer, value: 1000}))
      .then(() => token.withdraw({from: other}))
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx)
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(other).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after.sub(250));
      })
  });     

  it("should owe 0 after withdrawing dividend", function() {
    var token;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        token.issueDividend({from: issuer, value: 1000})
      })
      .then(() => token.withdraw({from: creator}))
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(0))
  });
    
  it("should pay 0 after withdrawing dividend", function() {
    var preBalance;
    var gasUsed;
    var token;
    return TestDividendToken.new(100, 0)
      .then(function(instance) {
        token = instance;
        return token.issueDividend({from: issuer, value: 1000})
      })
      .then(() => token.withdraw({from: creator})) // withdraw funds
      .then(() => preBalance = web3.eth.getBalance(creator))
      .then(() => token.withdraw({from: creator})) // try again
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx)
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after);
      }) 
  });

  it("should owe correct dividend after change in supply", function() {
    var token;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return token.transfer(other, 50, {from: creator})
      })
      .then(() => token.mint(100, {from: other}))
      .then(() => token.issueDividend({from: issuer, value: 1000}))
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(250))
  });

  it("should pay correct dividend after change in supply", function() {
    var token;
    var preBalance;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return token.transfer(other, 50, {from: creator});
      })
      .then(() => preBalance = web3.eth.getBalance(creator))
      .then(() => token.mint(100, {from: other}))
      .then(() => token.issueDividend({from: issuer, value: 1000}))
      .then(() => token.withdraw({from: creator}))
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx);
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after.sub(250));
      })
  });

  it("should owe correct dividend after post-issuance transfer", function() {
    var token;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return token.issueDividend({from: issuer, value: 1000});
      })
      .then(() => token.transfer(other, 50, {from: creator}))
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(1000))
  });

  it("should pay correct dividend after post-issuance transfer", function() {
    var token;
    var preBalance;
    var gasUsed;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return  token.issueDividend({from: issuer, value: 1000});
      })
      .then(() => preBalance = web3.eth.getBalance(creator))
      .then(() => token.transfer(other, 25, {from: creator}))      
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return token.withdraw({from: creator});
      })
      .then(function(receipt) {
        gasUsed += receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx);
      })
      .then(function(tx) { // assume gasPrice of txs is same
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after.sub(1000));
      })
  });


  it("should owe correct cumulative dividends in proportion", function() {
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return token.issueDividend({from: issuer, value: 42});
      })
      .then(() => token.issueDividend({from: issuer, value: 42}))
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(84))
  });

  it("should pay correct cumulative dividends in proportion", function() {
    var token;
    var preBalance;
    var gasUsed;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return  token.issueDividend({from: issuer, value: 42});
      })
      .then(() => token.issueDividend({from: issuer, value: 42}))
      .then(() => preBalance = web3.eth.getBalance(creator))
      .then(() => token.withdraw({from: creator}))      
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx);
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after.sub(84));
      })
  });

  it("should owe correct cumulative dividends with change in supply", function() {
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return token.issueDividend({from: issuer, value: 42});
      })
      .then(() => token.mint(100, {from: other}))
      .then(() => token.issueDividend({from: issuer, value: 42}))
      .then(() => token.outstandingFor.call(creator, {from: creator}))
      .then(outstanding => outstanding.should.be.bignumber.equal(63))
  });

  it("should owe correct cumulative dividends with change in supply", function() {
    var token;
    var preBalance;
    var gasUsed;
    return TestDividendToken.new(100, 0)
      .then(function (instance) {
        token = instance;
        return  token.issueDividend({from: issuer, value: 42});
      })
      .then(() => preBalance = web3.eth.getBalance(creator))
      .then(() => token.mint(100, {from: other}))
      .then(() => token.issueDividend({from: issuer, value: 42}))
      .then(() => token.withdraw({from: creator}))
      .then(function(receipt) {
        gasUsed = receipt.receipt.gasUsed;
        return web3.eth.getTransaction(receipt.tx);
      })
      .then(function(tx) {
        const after = web3.eth.getBalance(creator).add(tx.gasPrice.mul(gasUsed));
        preBalance.should.be.bignumber.equal(after.sub(63));
      })
  });
})
