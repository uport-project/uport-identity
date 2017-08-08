const lightwallet = require('eth-signer')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const ethJSABI = require("ethjs-abi")
web3.eth = Promise.promisifyAll(web3.eth)

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

function getRanomNumber() {
  return Math.floor(Math.random() * (10000 - 1)) + 1;
}

async function testProxyTx(testReg, proxy, fromAccount, shouldEqual) {
  let errorThrown = false
  let testNum = getRanomNumber()
  // Encode the transaction to send to the proxy contract
  let data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [testNum])
  // Send forward request from the owner
  try {
    await proxy.forward(testReg.address, 0, '0x' + data, {from: fromAccount})
  } catch (e) {
    errorThrown = true
  }
  let regData = await testReg.registry.call(proxy.address)
  if (shouldEqual) {
    assert.isFalse(errorThrown, 'An error should not have been thrown')
    assert.equal(regData.toNumber(), testNum)
  } else {
    assert.isTrue(errorThrown, 'An error should have been thrown')
    assert.notEqual(regData.toNumber(), testNum)
  }
}

async function testProxyLongTx(testReg, proxy, fromAccount) {
  let testNum = getRanomNumber()
  // Encode the transaction to send to the proxy contract
  let data = lightwallet.txutils._encodeFunctionTxData('reallyLongFunctionName',
                                                       ['uint256', 'address', 'string', 'uint256'],
                                                       [testNum, fromAccount, 'testStrThatIsQuiteLong', testNum])
  // Send forward request from the owner
  await proxy.forward(testReg.address, 0, '0x' + data, {from: fromAccount})
  let regData = await testReg.registry.call(fromAccount)
  assert.equal(regData.toNumber(), testNum)
}

contract('Proxy', (accounts) => {
  let proxy1
  let proxy2
  let ownerProxy1 = accounts[0]
  let ownerProxy2 = accounts[1]
  let testReg

  before(async function() {
    // Truffle deploys contracts with accounts[0]
    proxy1 = await Proxy.new({from: ownerProxy1})
    proxy2 = await Proxy.new({from: ownerProxy2})
    testReg = await TestRegistry.new({from: ownerProxy1})
  })

  it('Owner can send transaction', async function() {
    await testProxyTx(testReg, proxy1, ownerProxy1, true)
    await testProxyTx(testReg, proxy2, ownerProxy2, true)
  })

  it('Non-owner can not send transaction', async function() {
    await testProxyTx(testReg, proxy1, ownerProxy2, false)
    await testProxyTx(testReg, proxy2, ownerProxy1, false)
  })

  it('Transactions with a lot of data works', async function() {
    await testProxyLongTx(testReg, proxy1, ownerProxy1, true)
    await testProxyTx(testReg, proxy2, ownerProxy2, true)
  })

  it('Emits event on received transaction', async function() {
    let ethToSend = 10
    let txHash = await web3.eth.sendTransactionAsync({
      from: accounts[1],
      to: proxy1.address,
      value: web3.toWei(ethToSend, 'ether')
    })
    let receipt = await web3.eth.getTransactionReceiptAsync(txHash)
    let log = receipt.logs[0]
    // the abi for the Received event
    let eventAbi = proxy1.abi[6]
    let event = ethJSABI.decodeEvent(eventAbi, log.data, log.topics) // [log.topics[1], log.topics[0]])
    assert.equal(event.sender, accounts[1])
    assert.equal(web3.fromWei(event.value, 'ether'), ethToSend)
    let balance = await web3.eth.getBalanceAsync(proxy1.address)
    assert.equal(web3.fromWei(balance, 'ether').toNumber(), ethToSend, 'Balance should be updated')
  })

  it('Event emitted on tx from proxy', async function() {
    // Encode the transaction to send to the proxy contract
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    // Send forward request from the owner
    let tx = await proxy1.forward(testReg.address, 0, data, {from: accounts[0]})
    let log = tx.logs[0]
    assert.equal(log.event, 'Forwarded', 'Should emit a "Forwarded" event');
    assert.equal(log.args.destination, testReg.address)
    assert.equal(log.args.value.toNumber(), 0)
    assert.equal(log.args.data, data)
  })

  it('Should send ether correctly', async function() {
    let initialBalance
    let ethToSend = 2
    let receiver = accounts[3]
    let balance = await web3.eth.getBalanceAsync(receiver)
    initialBalance = web3.fromWei(balance, 'ether').toNumber()
    let tx = await proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    let log = tx.logs[0]
    assert.equal(web3.fromWei(log.args.value, 'ether').toNumber(), ethToSend, 'Event should show correct amount of ether')

    balance = await web3.eth.getBalanceAsync(receiver)
    let newBalance = initialBalance + ethToSend
    assert.equal(web3.fromWei(balance, 'ether').toNumber(), newBalance, 'Balance should be updated')
  })

  it('Should send small amount of ether correctly', async function() {
    let initialBalance
    let weiToSend = 1
    let receiver = accounts[4]
    let balance = await web3.eth.getBalanceAsync(receiver)
    initialBalance = balance
    let tx = await proxy1.forward(receiver, weiToSend, '0x0', {from: ownerProxy1})
    let log = tx.logs[0]
    assert.equal(log.args.value.toNumber(), weiToSend, 'Event should show correct amount of ether')

    balance = await web3.eth.getBalanceAsync(receiver)
    let newBalance = initialBalance.plus(weiToSend)
    assert.isTrue(balance.equals(newBalance), 'Balance should be updated')
  })

  it('Should throw if sending to much ether', async function() {
    let errorThrown = false
    let ethToSend = 20
    let receiver = accounts[3]
    let proxyBalance
    let balance = await web3.eth.getBalanceAsync(proxy1.address)
    proxyBalance = web3.fromWei(balance, 'ether').toNumber()

    try {
      await proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    } catch(e) {
      errorThrown = true
    }
    assert.isTrue(errorThrown, 'An error should have been thrown')
    balance = await web3.eth.getBalanceAsync(proxy1.address)
    assert.equal(web3.fromWei(balance, 'ether').toNumber(), proxyBalance, 'Balance of proxy should not have changed')
  })

  it('Should throw if sending negative ether', async function() {
    let errorThrown = false
    let ethToSend = -2
    let receiver = accounts[3]
    let proxyBalance
    let balance = await web3.eth.getBalanceAsync(proxy1.address)
    proxyBalance = web3.fromWei(balance, 'ether').toNumber()
    try {
      await proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    } catch(e) {
      errorThrown = true
    }
    assert.isTrue(errorThrown, 'An error should have been thrown')
    balance = await web3.eth.getBalanceAsync(proxy1.address)
    assert.equal(web3.fromWei(balance, 'ether').toNumber(), proxyBalance, 'Balance of proxy should not have changed')
  })

  it('Should throw if sending zero ether', async function() {
    let errorThrown = false
    let ethToSend = -2
    let receiver = accounts[3]
    let proxyBalance
    let balance = await web3.eth.getBalanceAsync(proxy1.address)
    proxyBalance = web3.fromWei(balance, 'ether').toNumber()
    try {
      await proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    } catch(e) {
      errorThrown = true
    }
    assert.isTrue(errorThrown, 'An error should have been thrown')
    bal = await web3.eth.getBalanceAsync(proxy1.address)
    assert.equal(web3.fromWei(balance, 'ether').toNumber(), proxyBalance, 'Balance of proxy should not have changed')
  })

  it('Should be able to empty out proxy from ether', async function() {
    let initialBalance
    let receiver = accounts[5]
    let balance = await web3.eth.getBalanceAsync(proxy1.address)
    let tx = await proxy1.forward(receiver, balance, '0x0', {from: ownerProxy1})
    balance = await web3.eth.getBalanceAsync(proxy1.address)
    assert.isTrue(balance.isZero(), 'Balance should be zero')
  })

  it('Should throw if function call fails', async function() {
    let errorThrown = false
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('testThrow', [], [])
    try {
      await proxy1.forward(testReg.address, 0, '0x' + data, {from: accounts[0]})
    } catch(e) {
      errorThrown = true
    }
    assert.isTrue(errorThrown, 'An error should have been thrown')
  })
})
