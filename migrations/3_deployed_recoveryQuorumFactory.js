const RecoveryQuorumFactory = artifacts.require('./RecoveryQuorumFactory.sol')
const ArrayLib = artifacts.require('./libs/ArrayLib.sol')


module.exports = function (deployer, network) {
  deployer.link(ArrayLib, [RecoveryQuorumFactory])
  deployer.deploy(RecoveryQuorumFactory)
}
