// mainnet: 0x12e627125abcfa989de831572f198577780d7127
// ropsten: 0x1c9d9e1962985c9b8101777cae25c46279fe2a9c
pragma solidity 0.4.8;
import "../recovery/RecoveryQuorum.sol";

contract IdentityFactory {
  mapping(address => address) public senderToProxy;

  event IdentityCreated(
    address indexed userKey,
    address proxy,
    address controller,
    address recoveryQuorum);

  function CreateProxyWithControllerAndRecovery(address userKey, address[] delegates, uint longTimeLock, uint shortTimeLock) {
    Proxy proxy = new Proxy();
    StandardController controller = new StandardController(proxy, userKey, longTimeLock, shortTimeLock);
    proxy.transfer(controller);
    RecoveryQuorum recoveryQuorum = new RecoveryQuorum(controller, delegates);
    controller.changeRecoveryFromRecovery(recoveryQuorum);

    IdentityCreated(userKey, proxy, controller, recoveryQuorum);
    senderToProxy[msg.sender] = proxy;
  }
}
