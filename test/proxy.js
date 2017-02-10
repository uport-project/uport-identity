require('./helpers.js')()

const LOG_NUMBER_1 = 1234;
const LOG_NUMBER_2 = 2345;

contract("Proxy", (accounts) => {
  var proxy
  var testReg

  before(() => {
    // Truffle deploys contracts with accounts[0]
    proxy = Proxy.deployed();
    testReg = TestRegistry.deployed();
  });

  it("Owner can send transaction", (done) => {
    // Encode the transaction to send to the proxy contract
    var data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1]);
    // Send forward request from the owner
    proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).then(() => {
      return testReg.registry.call(proxy.address);
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1)
      done();
    }).catch(done);
  });

  it("Receives transaction", (done) => {
    var event = proxy.Received();
    // Encode the transaction to send to the proxy contract
    event.watch((error, result) => {
      event.stopWatching()
      //console.log(result)
      assert.equal(result.args.sender, accounts[1]);
      assert.equal(result.args.value, web3.toWei('1', 'ether'));
      done();
    });
    web3.eth.sendTransaction({from: accounts[1], to: proxy.address, value: web3.toWei('1', 'ether')});
  });


  it("Event works correctly", (done) => {
    // Encode the transaction to send to the proxy contract
    var data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1]);
    // Send forward request from the owner
    var event = proxy.Forwarded();
    event.watch((error, result) => {
      event.stopWatching()
      //console.log(result)
      assert.equal(result.args.destination, testReg.address);
      assert.equal(result.args.value, 0);
      assert.equal(result.args.data, data);
      done();
    });
    proxy.forward(testReg.address, 0, data, {from: accounts[0]});
  });

  it("Non-owner can't send transaction", (done) => {
    // Encode the transaction to send to the proxy contract
    var data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2]);
    // Send forward request from a non-owner
    proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[1]}).then(() => {
      return testReg.registry.call(proxy.address);
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2)
      done();
    }).catch(done);
  });

  it("Should throw if function call fails", (done) => {
    var errorThrown = false;
    // Encode the transaction to send to the proxy contract
    var data = lightwallet.txutils._encodeFunctionTxData('testThrow', [], []);
    proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).catch((e) => {
      errorThrown = true;
    }).then(() => {
      assert.isTrue(errorThrown, "An error should have been thrown");
      done();
    }).catch(done);
  });
});

