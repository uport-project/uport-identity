const HookedWeb3Provider = require('hooked-web3-provider')
const lightwallet = require('eth-signer')

const Signer = lightwallet.signer
const HDSigner = lightwallet.signers.HDSigner
const Phrase = lightwallet.generators.Phrase
const ProxySigner = lightwallet.signers.ProxySigner

const IdentityFactory = artifacts.require('IdentityFactory')
const Proxy = artifacts.require('Proxy')
const RecoverableController = artifacts.require('RecoverableController')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')
const TestRegistry = artifacts.require('TestRegistry')

const SEED1 = 'tackle crystal drum type spin nest wine occur humor grocery worry pottery'
const SEED2 = 'tree clock fly receive mirror scissors away avoid seminar attract wife holiday'
const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345
const PROXY_GAS_OVERHEAD = 7723

let gasUsedWithProxy
let gasUsedWithoutProxy

contract('Uport proxy integration tests', (accounts) => {
  let identityFactory
  let testReg
  let proxy
  let recoverableController
  let recoveryQuorum
  let rpchost

  let delegateDeletedAfter = 0

  let proxySigner
  let user1Signer
  let user2Signer
  let user1
  let user2
  let admin
  let delegates

  // let neededSigs = 2
  let shortTimeLock = 2
  let longTimeLock = 5

  before(() => {
    user1Signer = new HDSigner(Phrase.toHDPrivateKey(SEED1))
    user1 = user1Signer.getAddress()
    user2Signer = new HDSigner(Phrase.toHDPrivateKey(SEED2))
    user2 = user2Signer.getAddress()
    admin = accounts[0]
    rpchost = IdentityFactory.currentProvider.host
    delegates = [
      accounts[1],
      accounts[2]
    ]
    web3.eth.sendTransaction({from: admin, to: user1, value: web3.toWei('1', 'ether')})
    web3.eth.sendTransaction({from: admin, to: user2, value: web3.toWei('1', 'ether')})

    let web3Prov = new HookedWeb3Provider({
      host: rpchost,
      transaction_signer: new Signer(user1Signer)
    })
    web3.setProvider(web3Prov)
    // Truffle deploys contracts with accounts[0]
    IdentityFactory.setProvider(web3Prov)
    TestRegistry.setProvider(web3Prov)
    IdentityFactory.deployed().then((instance) => {
      identityFactory = instance
    })

    TestRegistry.new({from: accounts[0]}).then(tr => {
      testReg = tr
    })
  })

  it('Create proxy, controller, and recovery contracts', (done) => {
    let event = identityFactory.IdentityCreated({creator: user1})
    event.watch((error, result) => {
      if (error) throw Error(error)
      event.stopWatching()
      proxy = Proxy.at(result.args.proxy)
      recoverableController = RecoverableController.at(result.args.controller)
      recoveryQuorum = RecoveryQuorum.at(result.args.recoveryQuorum)

      recoverableController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: admin}).then(() => { done() })
    })
    identityFactory.CreateProxyWithControllerAndRecovery(user1, delegates, longTimeLock, shortTimeLock, {from: user1}).catch(done)
  })

  it('Use proxy for simple function call', (done) => {
    // Set up the new Proxy provider
    proxySigner = new Signer(new ProxySigner(proxy.address, user1Signer, recoverableController.address))
    let web3ProxyProvider = new HookedWeb3Provider({
      host: rpchost,
      transaction_signer: proxySigner
    })
    TestRegistry.setProvider(web3ProxyProvider)

    // Register a number from proxy.address
    testReg.register(LOG_NUMBER_1, {from: proxy.address}).then(txData => {
      // Verify that the proxy address is logged
      gasUsedWithProxy = txData.receipt.cumulativeGasUsed
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1)
      done()
    }).catch(done)
  })

  it('Proxy can receive and send Eth', (done) => {
    let initialProxyBalance = web3.eth.getBalance(proxy.address) / (web3.toWei(1, 'ether'))
    let initialCoinbaseBalance = web3.eth.getBalance(accounts[0]) / (web3.toWei(1, 'ether'))

    assert.equal(0, initialProxyBalance, 'proxy should initially have no value')
    web3.eth.sendTransaction({from: accounts[0], to: proxy.address, value: web3.toWei('1.5', 'ether')}, function () {
      let mediumProxyBalance = web3.eth.getBalance(proxy.address) / (web3.toWei(1, 'ether'))
      assert.equal(mediumProxyBalance, 1.5, 'then proxy contract should have received 1.5ETH value')
      let mediumCoinbaseBalance = web3.eth.getBalance(accounts[0]) / (web3.toWei(1, 'ether'))
      assert.approximately(mediumCoinbaseBalance, initialCoinbaseBalance - 1.5, 0.05, 'coinbase should have less (1.5ETH value + gas)')

      proxySigner = new Signer(new ProxySigner(proxy.address, user1Signer, recoverableController.address))
      let web3ProxyProvider = new HookedWeb3Provider({
        host: rpchost,
        transaction_signer: proxySigner
      })

      web3.setProvider(web3ProxyProvider)
      web3.eth.sendTransaction({from: proxy.address, to: accounts[0], value: web3.toWei('1.4', 'ether')}, function () {
        let finalProxyBalance = web3.eth.getBalance(proxy.address) / (web3.toWei(1, 'ether'))
        assert.approximately(finalProxyBalance, 0.1, 0.05, 'coinbase should have received 1.4ETH value')
        let finalCoinbaseBalance = web3.eth.getBalance(accounts[0]) / (web3.toWei(1, 'ether'))
        assert.approximately(finalCoinbaseBalance, mediumCoinbaseBalance + 1.4, 0.05, 'coinbase should have received 1.4ETH value')
        done()
      })
    })
  })

  it('Do a social recovery and do another function call', (done) => {
    // User regular web3 provider to send from regular accounts
    recoveryQuorum.signUserChange(user2, {from: delegates[0]})
    .then(() => {
      return recoveryQuorum.delegates.call(delegates[0])
    }).then((delegate1) => {
      assert.isAbove(delegate1[delegateDeletedAfter], 0, 'this delegate should have record in quorum')
      return recoveryQuorum.delegates.call('0xdeadbeef')
    }).then((notADelegate) => {
      assert.equal(notADelegate[delegateDeletedAfter], 0, 'this delegate should not have a record in quorum')
      return recoveryQuorum.delegateAddresses(1)
    }).then((delegate1Address) => {
      assert.equal(delegate1Address, delegates[1], 'this delegate should also be in the delegateAddresses array in quorum')
      return recoveryQuorum.signUserChange(user2, {from: delegates[1]})
    }).then(() => {
      proxySigner = new Signer(new ProxySigner(proxy.address, user2Signer, recoverableController.address))
      let web3ProxyProvider = new HookedWeb3Provider({
        host: rpchost,
        transaction_signer: proxySigner
      })
      TestRegistry.setProvider(web3ProxyProvider)
      // Register a number from proxy.address
      return recoverableController.userKey.call()
    }).then((newUserKey) => {
      assert.equal(newUserKey, user2, 'User key of recoverableController should have been updated.')
      return testReg.register(LOG_NUMBER_2, {from: proxy.address})
    }).then(() => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2)
      done()
    }).catch(done)
  })

  it('Measures gas used by controller + proxy', (done) => {
    // Set up the Proxy provider
    let testReg2
    let web3Prov = new web3.providers.HttpProvider(rpchost)
    TestRegistry.setProvider(web3Prov)
    // Register a number from proxy.address
    TestRegistry.new({from: accounts[0]}).then(tr => {
      testReg2 = tr
      return testReg2.register(LOG_NUMBER_1, {from: accounts[0]})
    }).then(txData => {
      gasUsedWithoutProxy = txData.receipt.cumulativeGasUsed
      assert.approximately(gasUsedWithProxy - gasUsedWithoutProxy, PROXY_GAS_OVERHEAD, 1000, 'PROXY_GAS_OVERHEAD has unexpected value. Please update this in the test file if value has changed.')
      done()
    }).catch(done)
  })
})
