// mainnet: 0x96360525c00ce7ab8129ff619235796069f16f0a
// ropsten: 0x96e96f7e293e7fc17c614aae5a8de952e108edfd
pragma solidity 0.4.8;
import "../controllers/StandardController.sol";

contract IdentityFactoryWithRecoveryKey {
  mapping(address => address) public senderToProxy;

  event IdentityCreated(
    address indexed userKey,
    address proxy,
    address controller,
    address recoveryKey);

  function CreateProxyWithControllerAndRecoveryKey(address userKey, address _recoveryKey, uint longTimeLock, uint shortTimeLock) {
    Proxy proxy = new Proxy();
    StandardController controller = new StandardController(proxy, userKey, longTimeLock, shortTimeLock);
    proxy.transfer(controller);
    controller.changeRecoveryFromRecovery(_recoveryKey);

    IdentityCreated(userKey, proxy, controller, _recoveryKey);
    senderToProxy[msg.sender] = proxy;
  }
}
