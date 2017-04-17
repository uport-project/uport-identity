const IdentityManager = artifacts.require('IdentityManager')
const Proxy = artifacts.require('Proxy')

contract('IdentityManager', (accounts) => {
  let proxy
  let deployedProxy
  let identityManager
  let user1
  let nobody

  let proxyAddress
  let recoveryKey

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    recoveryKey = accounts[4]

    IdentityManager.deployed().then((instance) => {
      identityManager = instance
      return Proxy.new({from: accounts[0]})
    }).then((instance) => {
      deployedProxy = instance
      done()
    })
  })

  it('Correctly creates Identity', (done) => {
    const event = identityManager.IdentityCreated({creator: nobody})
    event.watch((error, result) => {
      if (error) throw Error(error)
      event.stopWatching()
      // Check that event has addresses to correct contracts
      proxyAddress = result.args.identity

      assert.equal(web3.eth.getCode(proxyAddress),
                   web3.eth.getCode(deployedProxy.address),
                   'Created proxy should have correct code')
      assert.equal(result.args.recoveryKey,
                   recoveryKey,
                   'Recovery key is set in event')
      assert.equal(result.args.creator,
                   nobody,
                   'Creator is set in event')
      proxy = Proxy.at(proxyAddress)
      // Check that the mapping has correct proxy address
      proxy.owner.call().then((proxyOwner) => {
        assert.equal(proxyOwner, identityManager.address, 'Proxy owner should be the identity manager')
        done()
      }).catch(done)
    })
    identityManager.CreateIdentity(user1, recoveryKey, {from: nobody})
  })
})
