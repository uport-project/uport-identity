const lightwallet = require('eth-signer')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const ethJSABI = require("ethjs-abi")

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

contract('Proxy', (accounts) => {
  let proxy
  let testReg

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    Proxy.new({from: accounts[0]}).then((instance) => {
      proxy = instance
      return TestRegistry.deployed()
    }).then((instance) => {
      testReg = instance
      done()
    })
  })

  it('Owner can send transaction', (done) => {
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    // Send forward request from the owner
    proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).then(() => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1)
      done()
    }).catch(done)
  })

  it('Emits event on received transaction', (done) => {
    web3.eth = Promise.promisifyAll(web3.eth)
    web3.eth.sendTransactionAsync({
      from: accounts[1],
      to: proxy.address,
      value: web3.toWei('1', 'ether')
    }).then(txHash => {
      return web3.eth.getTransactionReceiptAsync(txHash)
    }).then(result => {
      let log = result.logs[0]
      // the abi for the Received event
      let eventAbi = proxy.abi[6]
      let event = ethJSABI.decodeEvent(eventAbi, log.data, log.topics) // [log.topics[1], log.topics[0]])
      assert.equal(event.sender, accounts[1])
      assert.equal(web3.fromWei(event.value, 'ether'), 1)
      done()
    })
  })

  it('Event works correctly', (done) => {
    // Encode the transaction to send to the proxy contract
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    // Send forward request from the owner
    proxy.forward(testReg.address, 0, data, {from: accounts[0]}).then(tx => {
      let log=tx.logs[0]
      assert.equal(log.event, 'Forwarded', 'Should emit a "Forwarded" event');
      assert.equal(log.args.destination, testReg.address)
      assert.equal(log.args.value.toNumber(), 0)
      assert.equal(log.args.data, data)
      done()
    })
  })

  it('Non-owner can not send transaction', (done) => {
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
    // Send forward request from a non-owner
    proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[1]}).then(() => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2)
      done()
    }).catch(done)
  })

  it('Should throw if function call fails', (done) => {
    let errorThrown = false
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('testThrow', [], [])
    proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).catch((e) => {
      errorThrown = true
    }).then(() => {
      assert.isTrue(errorThrown, 'An error should have been thrown')
      done()
    }).catch(done)
  })
})
