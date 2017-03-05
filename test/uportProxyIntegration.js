var HookedWeb3Provider = require('hooked-web3-provider');
var lightwallet = require('eth-signer');

var Signer = lightwallet.signer;
var HDSigner = lightwallet.signers.HDSigner;
var Phrase = lightwallet.generators.Phrase;
var ProxySigner = lightwallet.signers.ProxySigner;
var regularWeb3Provider = web3.currentProvider;

const IdentityFactory = artifacts.require('IdentityFactory')
const Proxy = artifacts.require('Proxy')
const StandardController = artifacts.require('StandardController')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')
const TestRegistry = artifacts.require('TestRegistry')

const SEED1 = 'tackle crystal drum type spin nest wine occur humor grocery worry pottery';
const SEED2 = 'tree clock fly receive mirror scissors away avoid seminar attract wife holiday';
const LOG_NUMBER_1 = 1234;
const LOG_NUMBER_2 = 2345;

const PROXY_GAS_OVERHEAD = 7723;
var gasUsedWithProxy;
var gasUsedWithoutProxy;

contract("Uport proxy integration tests", (accounts) => {
  var identityFactory;
  var testReg;
  var proxy;
  var standardController;
  var recoveryQuorum;

  var delegateDeletedAfter =    0;
  var delegatePendingUntil =    1;
  var delegateProposedUserKey = 2;

  var proxySigner;
  var user1Signer;
  var user2Signer;
  var user1;
  var user2;
  var admin;

  // var neededSigs = 2;
  var shortTimeLock = 2;
  var longTimeLock = 5;

  before(() => {
    user1Signer = new HDSigner(Phrase.toHDPrivateKey(SEED1));
    user1 = user1Signer.getAddress();
    user2Signer = new HDSigner(Phrase.toHDPrivateKey(SEED2));
    user2 = user2Signer.getAddress();
    admin = accounts[0];
    delegates = [
        accounts[1],
        accounts[2]
    ];
    web3.eth.sendTransaction({from: admin, to: user1, value: web3.toWei('1', 'ether')});
    web3.eth.sendTransaction({from: admin, to: user2, value: web3.toWei('1', 'ether')});

    var web3Prov = new HookedWeb3Provider({
      host: 'http://localhost:8545',
      transaction_signer: new Signer(user1Signer),
    });
    web3.setProvider(web3Prov);
    // Truffle deploys contracts with accounts[0]
    IdentityFactory.setProvider(web3Prov);
    TestRegistry.setProvider(web3Prov);
    IdentityFactory.deployed().then((instance) => {
      identityFactory = instance
    })

    TestRegistry.new({from: accounts[0]}).then(tr => {
      testReg = tr;
    })
  });

  it("Create proxy, controller, and recovery contracts", (done) => {
    var event = identityFactory.IdentityCreated({creator: user1})
    event.watch((error, result) => {
      event.stopWatching();
      proxy = Proxy.at(result.args.proxy);
      standardController = StandardController.at(result.args.controller);
      recoveryQuorum = RecoveryQuorum.at(result.args.recoveryQuorum);

      standardController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: admin}).then(() => {done();});
    });
    identityFactory.CreateProxyWithControllerAndRecovery(user1, delegates, longTimeLock, shortTimeLock, {from: user1}).catch(done);
  });

  it("Use proxy for simple function call", (done) => {
    // Set up the new Proxy provider
    proxySigner = new Signer(new ProxySigner(proxy.address, user1Signer, standardController.address));
    var web3ProxyProvider = new HookedWeb3Provider({
      host: 'http://localhost:8545',
      transaction_signer: proxySigner
    });
    TestRegistry.setProvider(web3ProxyProvider);

    // Register a number from proxy.address
    testReg.register(LOG_NUMBER_1, {from: proxy.address}).then(txData => {
      // Verify that the proxy address is logged
      gasUsedWithProxy = txData.receipt.cumulativeGasUsed
      return testReg.registry.call(proxy.address);
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1);
      done();
    }).catch(done);
  });

  it("Proxy can receive and send Eth", (done) => {
    var initialProxyBalance = web3.eth.getBalance(proxy.address)/(web3.toWei(1, "ether"))
    var initialCoinbaseBalance = web3.eth.getBalance(accounts[0])/(web3.toWei(1, "ether"))

    assert.equal(0, initialProxyBalance, "proxy should initially have no value")
    web3.eth.sendTransaction({from: accounts[0], to: proxy.address, value: web3.toWei('1.5', 'ether')}, function(){
      var mediumProxyBalance = web3.eth.getBalance(proxy.address)/(web3.toWei(1, "ether"))
      assert.equal(mediumProxyBalance, 1.5, "then proxy contract should have received 1.5ETH value")
      var mediumCoinbaseBalance = web3.eth.getBalance(accounts[0])/(web3.toWei(1, "ether"))
      assert.approximately(mediumCoinbaseBalance, initialCoinbaseBalance - 1.5, .05, "coinbase should have less (1.5ETH value + gas)")

      proxySigner = new Signer(new ProxySigner(proxy.address, user1Signer, standardController.address));
      var web3ProxyProvider = new HookedWeb3Provider({
        host: 'http://localhost:8545',
        transaction_signer: proxySigner
      });

      web3.setProvider(web3ProxyProvider)
      web3.eth.sendTransaction({from: proxy.address, to: accounts[0], value: web3.toWei('1.4', 'ether')}, function(){
        var finalProxyBalance = web3.eth.getBalance(proxy.address)/(web3.toWei(1, "ether"))
        assert.approximately(finalProxyBalance, .1, .05, "coinbase should have received 1.4ETH value")
        var finalCoinbaseBalance = web3.eth.getBalance(accounts[0])/(web3.toWei(1, "ether"))
        assert.approximately(finalCoinbaseBalance, mediumCoinbaseBalance + 1.4, .05, "coinbase should have received 1.4ETH value")
        done();
      });
    });
  });

  it("Do a social recovery and do another function call", (done) => {
    // User regular web3 provider to send from regular accounts
    recoveryQuorum.signUserChange(user2, {from: delegates[0]})
    .then(() => {
      return recoveryQuorum.delegates.call(delegates[0]);})
    .then((delegate1) => {
      assert.isAbove(delegate1[delegateDeletedAfter], 0, "this delegate should have record in quorum");
      return recoveryQuorum.delegates.call("0xdeadbeef");})
    .then((notADelegate) => {
      assert.equal(notADelegate[delegateDeletedAfter], 0, "this delegate should not have a record in quorum");
      return recoveryQuorum.delegateAddresses(1);})
    .then((delegate1Address) => {
      assert.equal(delegate1Address, delegates[1], "this delegate should also be in the delegateAddresses array in quorum");
      return recoveryQuorum.signUserChange(user2, {from: delegates[1]});
    }).then(() => {
      proxySigner = new Signer(new ProxySigner(proxy.address, user2Signer, standardController.address));
      var web3ProxyProvider = new HookedWeb3Provider({
        host: 'http://localhost:8545',
        transaction_signer: proxySigner
      });
      TestRegistry.setProvider(web3ProxyProvider);
      // Register a number from proxy.address
      return standardController.userKey.call()
    }).then((newUserKey) => {
      assert.equal(newUserKey, user2, "User key of standardController should have been updated.");
      return testReg.register(LOG_NUMBER_2, {from: proxy.address})
    }).then(() => {
      return testReg.registry.call(proxy.address);
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2);
      done();
    }).catch(done);
  });


  it("Measures gas used by controller + proxy", (done) => {
    // Set up the Proxy provider

    var testReg2
    var web3Prov = new web3.providers.HttpProvider("http://localhost:8545")
    TestRegistry.setProvider(web3Prov);
    // Register a number from proxy.address
    TestRegistry.new({from: accounts[0]}).then(tr => {
      testReg2 = tr
      return testReg2.register(LOG_NUMBER_1, {from: accounts[0]})
    }).then(txData => {
      gasUsedWithoutProxy = txData.receipt.cumulativeGasUsed
      assert.approximately(gasUsedWithProxy - gasUsedWithoutProxy, PROXY_GAS_OVERHEAD, 1000, "PROXY_GAS_OVERHEAD has unexpected value. Please update this in the test file if value has changed.");
      done();
    }).catch(done);
  });

});
