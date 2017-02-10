pragma solidity ^0.4.4;
import "../recovery/RecoveryQuorum.sol";

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
