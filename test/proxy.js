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

function testProxyTx(testReg, proxy, fromAccount, shouldEqual) {
  return new Promise((resolve, reject) => {
    let testNum = getRanomNumber()
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [testNum])
    // Send forward request from the owner
    proxy.forward(testReg.address, 0, '0x' + data, {from: fromAccount}).then(() => {
      return testReg.registry.call(proxy.address)
    }).then(regData => {
      if (shouldEqual) {
        assert.equal(regData.toNumber(), testNum)
      } else {
        assert.notEqual(regData.toNumber(), testNum)
      }
      resolve()
    })
  })
}

function testProxyLongTx(testReg, proxy, fromAccount) {
  return new Promise((resolve, reject) => {
    let testNum = getRanomNumber()
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('reallyLongFunctionName',
                                                         ['uint256', 'address', 'string', 'uint256'],
                                                         [testNum, fromAccount, 'testStrThatIsQuiteLong', testNum])
    // Send forward request from the owner
    proxy.forward(testReg.address, 0, '0x' + data, {from: fromAccount}).then(() => {
      return testReg.registry.call(fromAccount)
    }).then(regData => {
      assert.equal(regData.toNumber(), testNum)
      resolve()
    })
  })
}

contract('Proxy', (accounts) => {
  let proxy1
  let proxy2
  let ownerProxy1 = accounts[0]
  let ownerProxy2 = accounts[1]
  let testReg

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    Proxy.new({from: ownerProxy1}).then(instance => {
      proxy1 = instance
      return Proxy.new({from: ownerProxy2})
    }).then(instance => {
      proxy2 = instance
      return TestRegistry.deployed()
    }).then(instance => {
      testReg = instance
      done()
    })
  })

  it('Owner can send transaction', (done) => {
    testProxyTx(testReg, proxy1, ownerProxy1, true).then(() => {
      return testProxyTx(testReg, proxy2, ownerProxy2, true)
    }).then(() => {
      done()
    }).catch(done)
  })

  it('Non-owner can not send transaction', (done) => {
    testProxyTx(testReg, proxy1, ownerProxy2, false).then(() => {
      return testProxyTx(testReg, proxy2, ownerProxy1, false)
    }).then(() => {
      done()
    }).catch(done)
  })

  it('Transactions with a lot of data works', (done) => {
    testProxyLongTx(testReg, proxy1, ownerProxy1, true).then(() => {
      return testProxyTx(testReg, proxy2, ownerProxy2, true)
    }).then(() => {
      done()
    }).catch(done)
  })

  it('Emits event on received transaction', (done) => {
    let ethToSend = 10
    web3.eth.sendTransactionAsync({
      from: accounts[1],
      to: proxy1.address,
      value: web3.toWei(ethToSend, 'ether')
    }).then(txHash => {
      return web3.eth.getTransactionReceiptAsync(txHash)
    }).then(result => {
      let log = result.logs[0]
      // the abi for the Received event
      let eventAbi = proxy1.abi[6]
      let event = ethJSABI.decodeEvent(eventAbi, log.data, log.topics) // [log.topics[1], log.topics[0]])
      assert.equal(event.sender, accounts[1])
      assert.equal(web3.fromWei(event.value, 'ether'), ethToSend)
      return web3.eth.getBalanceAsync(proxy1.address)
    }).then(balance => {
      assert.equal(web3.fromWei(balance, 'ether').toNumber(), ethToSend, 'Balance should be updated')
      done()
    })
  })

  it('Event emitted on tx from proxy', (done) => {
    // Encode the transaction to send to the proxy contract
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    // Send forward request from the owner
    proxy1.forward(testReg.address, 0, data, {from: accounts[0]}).then(tx => {
      let log=tx.logs[0]
      assert.equal(log.event, 'Forwarded', 'Should emit a "Forwarded" event');
      assert.equal(log.args.destination, testReg.address)
      assert.equal(log.args.value.toNumber(), 0)
      assert.equal(log.args.data, data)
      done()
    })
  })

  it('Should send ether correctly', (done) => {
    let initialBalance
    let ethToSend = 2
    let receiver = accounts[3]
    web3.eth.getBalanceAsync(receiver).then(balance => {
      initialBalance = web3.fromWei(balance, 'ether').toNumber()
      return proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    }).then(tx => {
      let log=tx.logs[0]
      assert.equal(web3.fromWei(log.args.value, 'ether').toNumber(), ethToSend, 'Event should show correct amount of ether')
      return web3.eth.getBalanceAsync(receiver)
    }).then(balance => {
      let newBalance = initialBalance + ethToSend
      assert.equal(web3.fromWei(balance, 'ether').toNumber(), newBalance, 'Balance should be updated')
      done()
    })
  })

  it('Should send small amount of ether correctly', (done) => {
    let initialBalance
    let weiToSend = 1
    let receiver = accounts[4]
    web3.eth.getBalanceAsync(receiver).then(balance => {
      initialBalance = balance
      return proxy1.forward(receiver, weiToSend, '0x0', {from: ownerProxy1})
    }).then(tx => {
      let log=tx.logs[0]
      assert.equal(log.args.value.toNumber(), weiToSend, 'Event should show correct amount of ether')
      return web3.eth.getBalanceAsync(receiver)
    }).then(balance => {
      let newBalance = initialBalance.plus(weiToSend)
      assert.isTrue(balance.equals(newBalance), 'Balance should be updated')
      done()
    })
  })

  it('Should throw if sending to much ether', (done) => {
    let ethToSend = 20
    let receiver = accounts[3]
    let proxyBalance
    web3.eth.getBalanceAsync(proxy1.address).then(balance => {
      proxyBalance = web3.fromWei(balance, 'ether').toNumber()
      return proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    }).catch(e => {
      errorThrown = true
    }).then(() => {
      assert.isTrue(errorThrown, 'An error should have been thrown')
      return web3.eth.getBalanceAsync(proxy1.address)
    }).then(balance => {
      assert.equal(web3.fromWei(balance, 'ether').toNumber(), proxyBalance, 'Balance of proxy should not have changed')
      done()
    })
  })

  it('Should throw if sending negative ether', (done) => {
    let ethToSend = -2
    let receiver = accounts[3]
    let proxyBalance
    web3.eth.getBalanceAsync(proxy1.address).then(balance => {
      proxyBalance = web3.fromWei(balance, 'ether').toNumber()
      return proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    }).catch(e => {
      errorThrown = true
    }).then(() => {
      assert.isTrue(errorThrown, 'An error should have been thrown')
      return web3.eth.getBalanceAsync(proxy1.address)
    }).then(balance => {
      assert.equal(web3.fromWei(balance, 'ether').toNumber(), proxyBalance, 'Balance of proxy should not have changed')
      done()
    })
  })

  it('Should throw if sending zero ether', (done) => {
    let ethToSend = -2
    let receiver = accounts[3]
    let proxyBalance
    web3.eth.getBalanceAsync(proxy1.address).then(balance => {
      proxyBalance = web3.fromWei(balance, 'ether').toNumber()
      return proxy1.forward(receiver, web3.toWei(ethToSend, 'ether'), '0x0', {from: ownerProxy1})
    }).catch(e => {
      errorThrown = true
    }).then(() => {
      assert.isTrue(errorThrown, 'An error should have been thrown')
      return web3.eth.getBalanceAsync(proxy1.address)
    }).then(balance => {
      assert.equal(web3.fromWei(balance, 'ether').toNumber(), proxyBalance, 'Balance of proxy should not have changed')
      done()
    })
  })

  it('Should be able to empty out proxy from ether', (done) => {
    let initialBalance
    let receiver = accounts[5]
    web3.eth.getBalanceAsync(proxy1.address).then(balance => {
      return proxy1.forward(receiver, balance, '0x0', {from: ownerProxy1})
    }).then(tx => {
      return web3.eth.getBalanceAsync(proxy1.address)
    }).then(balance => {
      assert.isTrue(balance.isZero(), 'Balance should be zero')
      done()
    })
  })

  it('Should throw if function call fails', (done) => {
    let errorThrown = false
    // Encode the transaction to send to the proxy contract
    let data = lightwallet.txutils._encodeFunctionTxData('testThrow', [], [])
    proxy1.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).catch(e => {
      errorThrown = true
    }).then(() => {
      assert.isTrue(errorThrown, 'An error should have been thrown')
      done()
    }).catch(done)
  })
})
