pragma solidity 0.4.15;
import "./Proxy.sol";


contract RecoverableController {
    uint    public version;
    Proxy   public proxy;

    address public userKey;
    address public proposedUserKey;
    uint    public proposedUserKeyPendingUntil;

    address public recoveryKey;
    address public proposedRecoveryKey;
    uint    public proposedRecoveryKeyPendingUntil;

    address public proposedController;
    uint    public proposedControllerPendingUntil;

    uint    public shortTimeLock; // use 900 for 15 minutes
    uint    public longTimeLock; // use 259200 for 3 days

    event RecoveryEvent(string action, address initiatedBy);

    modifier onlyUserKey() {
        if (msg.sender == userKey) _;
    }
    modifier onlyRecoveryKey() {
        if (msg.sender == recoveryKey) _;
    }

    function RecoverableController(address proxyAddress, address _userKey, uint _longTimeLock, uint _shortTimeLock) {
        version = 1;
        proxy = Proxy(proxyAddress);
        userKey = _userKey;
        shortTimeLock = _shortTimeLock;
        longTimeLock = _longTimeLock;
        recoveryKey = msg.sender;
    }

    function forward(address destination, uint value, bytes data) onlyUserKey {
        proxy.forward(destination, value, data);
    }

    //pass 0x0 to cancel
    function signRecoveryChange(address _proposedRecoveryKey) onlyUserKey {
        proposedRecoveryKeyPendingUntil = now + longTimeLock;
        proposedRecoveryKey = _proposedRecoveryKey;
        RecoveryEvent("signRecoveryChange", msg.sender);
    }

    function changeRecovery() {
        if (proposedRecoveryKeyPendingUntil < now && proposedRecoveryKey != 0x0) {
            recoveryKey = proposedRecoveryKey;
            delete proposedRecoveryKey;
        }
    }

    //pass 0x0 to cancel
    function signControllerChange(address _proposedController) onlyUserKey {
        proposedControllerPendingUntil = now + longTimeLock;
        proposedController = _proposedController;
        RecoveryEvent("signControllerChange", msg.sender);
    }

    function changeController() {
        if (proposedControllerPendingUntil < now && proposedController != 0x0) {
            proxy.transfer(proposedController);
            selfdestruct(proposedController);
        }
    }

    //pass 0x0 to cancel
    function signUserKeyChange(address _proposedUserKey) onlyUserKey {
        proposedUserKeyPendingUntil = now + shortTimeLock;
        proposedUserKey = _proposedUserKey;
        RecoveryEvent("signUserKeyChange", msg.sender);
    }

    function changeUserKey(){
        if (proposedUserKeyPendingUntil < now && proposedUserKey != 0x0) {
            userKey = proposedUserKey;
            delete proposedUserKey;
            RecoveryEvent("changeUserKey", msg.sender);
        }
    }

    function changeRecoveryFromRecovery(address _recoveryKey) onlyRecoveryKey{ recoveryKey = _recoveryKey; }

    function changeUserKeyFromRecovery(address _userKey) onlyRecoveryKey{
        delete proposedUserKey;
        userKey = _userKey;
    }
}
