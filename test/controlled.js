const Controlled = artifacts.require('Controlled')
const assertThrown = require('./utils/assertThrown')

contract('Controlled', (accounts) => {
  let controlled
  const controller = accounts[0]
  const creator = accounts[0]
  const notController = accounts[1]
  const toBeController = accounts[2]

  beforeEach(async function() {
    controlled = await Controlled.new({from: creator})
  })

  it('Is initially controlled by creator', async function() {
    let isController = await controlled.isController.call(creator)
    assert.isTrue(isController, 'Controller should be controller')
  })

  it('Is initially not controlled by non creator', async function() {
    isController = await controlled.isController.call(notController)
    assert.isFalse(isController, 'Non-controller should not be controller')
  })

  it('Non-controller can not change controller', async function() {
    errorThrown = false
    try {
      await controlled.transfer(notController, {from: notController})
    } catch (e) {
      errorThrown = true
    }
    assertThrown(errorThrown, 'An error should have been thrown')
    let isController = await controlled.isController.call(notController)
    assert.isFalse(isController, 'Controller should not be changed')
  })

  it('Controller can change controller', async function() {
    await controlled.transfer(toBeController, {from: controller})
    let isController = await controlled.isController.call(toBeController)
    assert.isTrue(isController, 'Controller should be changed')
  })

  it('Controller can not change controller to proxy address', async function() {
    await controlled.transfer(controlled.address, {from: controller})
    let isController = await controlled.isController.call(controlled.address)
    assert.isFalse(isController, 'Controller should not be changed')
  })
})
