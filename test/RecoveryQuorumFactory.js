const RecoveryQuorumFactory = artifacts.require('RecoveryQuorumFactory')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')
const Promise = require('bluebird')
web3.eth = Promise.promisifyAll(web3.eth)

function compareCode(addr1, addr2) {
  let c1, c2
  return new Promise((resolve, reject) => {
    web3.eth.getCodeAsync(addr1).then(code => {
      c1 = code
      return web3.eth.getCodeAsync(addr2)
    }).then(code => {
      c2 = code
      assert.equal(c1, c2, 'the deployed contract has incorrect code')
      resolve()
    })
  })
}

contract('RecoveryQuorumFactory', (accounts) => {
  let recoveryQuorumFactory
  let recoveryQuorum
  let deployedRecoveryQuorum
  let user1
  let delegate1
  let delegate2
  let delegate3
  let delegate4
  let delegates

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    delegate1 = accounts[4]
    delegate2 = accounts[5]
    delegate3 = accounts[6]
    delegate4 = accounts[7]
    delegates = [delegate1, delegate2, delegate3, delegate4]

    RecoveryQuorumFactory.deployed().then((instance) => {
      recoveryQuorumFactory = instance
      return RecoveryQuorum.new({from: accounts[0]})
    }).then((instance) => {
      deployedRecoveryQuorum = instance
      done()
    })
  })

  it('Correctly creates recovery contracts', (done) => {
    recoveryQuorumFactory.CreateRecoveryQuorum(user1, delegates).then((tx) => {
      let log = tx.logs[0];
      assert.equal(log.event,"RecoveryQuorumCreated","wrong event");
      recoveryQuorumAddress = log.args.recoveryQuorum
      recoveryQuorum = RecoveryQuorum.at(recoveryQuorumAddress)
      return compareCode(recoveryQuorumAddress, deployedRecoveryQuorum.address)
    }).then(done).catch(done)
  })


  it('Created recoveryQuorum should have correct state', (done) => {
    recoveryQuorum.getAddresses().then(delegateAddresses => {
      assert.deepEqual(delegateAddresses, delegates)
      done()
    }).catch(done)
  })
})
