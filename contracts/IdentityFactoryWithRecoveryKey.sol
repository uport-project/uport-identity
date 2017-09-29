pragma solidity 0.4.15;
import "./RecoverableController.sol";


contract IdentityFactoryWithRecoveryKey {
    event IdentityCreated(
        address indexed userKey,
        address proxy,
        address controller,
        address indexed recoveryKey);

    mapping(address => address) public senderToProxy;
    mapping(address => address) public recoveryToProxy;

    //cost ~2.4M gas
    function CreateProxyWithControllerAndRecoveryKey(address userKey, address _recoveryKey, uint longTimeLock, uint shortTimeLock) {
        Proxy proxy = new Proxy();
        RecoverableController controller = new RecoverableController(proxy, userKey, longTimeLock, shortTimeLock);
        proxy.transfer(controller);
        controller.changeRecoveryFromRecovery(_recoveryKey);

        IdentityCreated(userKey, proxy, controller, _recoveryKey);
        senderToProxy[msg.sender] = proxy;
        recoveryToProxy[_recoveryKey] = proxy;
    }
}
