const Owned = artifacts.require('Owned')
const assertThrown = require('./utils/assertThrown')

contract('Owned', (accounts) => {
  let owned
  const controller = accounts[0]
  const creator = accounts[0]
  const notController = accounts[1]
  const toBeController = accounts[2]

  beforeEach(async function() {
    owned = await Owned.new({from: creator})
  })

  it('Is initially owned by creator', async function() {
    let isOwner = await owned.isOwner.call(creator)
    assert.isTrue(isOwner, 'Controller should be controller')
  })

  it('Is initially not owned by non creator', async function() {
    isOwner = await owned.isOwner.call(notController)
    assert.isFalse(isOwner, 'Non-controller should not be controller')
  })

  it('Non-controller can not change controller', async function() {
    errorThrown = false
    try {
      await owned.transfer(notController, {from: notController})
    } catch (e) {
      errorThrown = true
    }
    assertThrown(errorThrown, 'An error should have been thrown')
    let isOwner = await owned.isOwner.call(notController)
    assert.isFalse(isOwner, 'Controller should not be changed')
  })

  it('Controller can change controller', async function() {
    await owned.transfer(toBeController, {from: controller})
    let isOwner = await owned.isOwner.call(toBeController)
    assert.isTrue(isOwner, 'Controller should be changed')
  })

  it('Controller can not change controller to proxy address', async function() {
    await owned.transfer(owned.address, {from: controller})
    let isOwner = await owned.isOwner.call(owned.address)
    assert.isFalse(isOwner, 'Controller should not be changed')
  })
})
