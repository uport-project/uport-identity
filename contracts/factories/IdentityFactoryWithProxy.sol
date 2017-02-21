pragma solidity 0.4.8;
import "../recovery/RecoveryQuorum.sol";

contract IdentityFactory {
  mapping(address => address) public senderToProxy;

  event IdentityCreated(
    address indexed userKey,
    address proxy,
    address controller,
    address recoveryQuorum);

  function CreateControllerAndRecoveryForProxy(address _proxy, address userKey, address[] delegates, uint longTimeLock, uint shortTimeLock) {
    Proxy proxy = Proxy(_proxy);
    StandardController controller = new StandardController(proxy, userKey, longTimeLock, shortTimeLock);
    proxy.transfer(controller);
    RecoveryQuorum recoveryQuorum = new RecoveryQuorum(controller, delegates);
    controller.changeRecoveryFromRecovery(recoveryQuorum);

    IdentityCreated(userKey, proxy, controller, recoveryQuorum);
    senderToProxy[msg.sender] = proxy;
  }
}
