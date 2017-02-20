// mainnet:
// ropsten: 0x65c1120f15e92b57ea729a047d1ba19f73c007d4
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
