pragma solidity ^0.4.4;
import "../controllers/StandardController.sol";

contract IdentityFactoryWithRecoveryKey {
    event IdentityCreated(
        address indexed userKey,
        address proxy,
        address controller,
        address recoveryKey);

    mapping(address => address) public senderToProxy;

    //cost ~2.4M gas
    function CreateProxyWithControllerAndRecoveryKey(address userKey, address _recoveryKey, uint longTimeLock, uint shortTimeLock) {
        Proxy proxy = new Proxy();
        StandardController controller = new StandardController(proxy, userKey, longTimeLock, shortTimeLock);
        proxy.transfer(controller);
        controller.changeRecoveryFromRecovery(_recoveryKey);

        IdentityCreated(userKey, proxy, controller, _recoveryKey);
        senderToProxy[msg.sender] = proxy;
    }
}
