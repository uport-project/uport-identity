pragma solidity ^0.4.4;
import "../proxies/Proxy.sol"; //I think this works will all proxys, but not sure
import "../libraries/ArrayLib.sol";
import "../factories/IdentityFactoryWithProxy.sol";

contract IdentityHub {
    uint    public version;
    uint    public existingIdentityNum = 1;
    uint    public shortTimeLock;// use 900 for 15 minutes
    uint    public longTimeLock; // use 259200 for 3 days


    IdentityFactory identityFactory;


    struct identity {
        address userKey;
        address proposedUserKey;
        uint    proposedUserKeyPendingUntil;

        address proposedController;
        uint    proposedControllerPendingUntil;

        uint idenNum;
        Proxy   proxy;
        address[]  delegateAddresses;
    }
    struct Delegate{
        uint    deletedAfter; // delegate exists if not 0
        uint    pendingUntil;
        address proposedUserKey;
        address proposedController;
    }


    identity[] Iden; //Stored in array instead of mapping so no copying data necessary
    mapping (address => Delegate) public delegates;
    mapping (address => uint) public idenNums; //used to refer to one struct in Iden array from multiple addresses


    event IdentityEvent(address indexed identity, string action, address initiatedBy);
    event RecoveryEvent(string action, address initiatedBy);
    event Forwarded (address indexed idenitity, address indexed destination, uint value, bytes data); //indexed proxy to make visible in bloom filter
    event Received (address indexed identity, address indexed sender, uint value);


    function IdentityHub(address _identityFactory, uint _shortTimeLock, uint _longTimeLock) {
        version = 1;
        identityFactory = IdentityFactory(_identityFactory);
        shortTimeLock = _shortTimeLock;
        longTimeLock = _longTimeLock;
    }

    //MODIFIERS

    //makes sure no existing data is being overwritten
    modifier checkAddressesExistance(address _userKey, address[] _delegates) {
        if (idenNums[_userKey] != 0) throw;
        for (uint i = 0; i < _delegates.length; i++) {if (idenNums[_delegates[i]] != 0) throw;}
        _;
    }

    //only a userKey (not a delegate) can get through
    modifier onlyUserKeys(address key) {
        if (idenNums[key] == 0 || Iden[idenNums[key]].userKey != key) throw;
        _;
    }

    //only a delegate (not a userKey) can get through
    modifier onlyDelegateKeys(address key) {
        if (idenNums[key] == 0 || Iden[idenNums[key]].userKey == key) throw;
        _;
    }

    //BASIC FUNCTIONS

    //creates a basic identity - for maximum gas savings, should deploy a minimal proxy (VERSION 4)
    function createIdentity(address _userKey, address[] _delegates) checkAddressesExistance(_userKey, _delegates){
        Proxy proxy = new Proxy();
        Iden.push(identity({userKey: _userKey, proposedUserKey: 0x0, proposedUserKeyPendingUntil: 0, proposedController: 0x0, proposedControllerPendingUntil: 0, idenNum: existingIdentityNum, proxy: proxy, delegateAddresses: _delegates}));
        updateMapping(_userKey, existingIdentityNum);

        //create all delegates
        for (uint i = 0; i < _delegates.length; i++) {
            updateMapping(_delegates[i], existingIdentityNum);
            delegates[_delegates[i]] = Delegate({deletedAfter: 31536000000000, pendingUntil: 0, proposedUserKey: 0x0, proposedController: 0x0});
        }
        existingIdentityNum++;
        IdentityEvent(proxy, "createIdentity", msg.sender);
    }

    function forward(address destination, uint value, bytes data) onlyUserKeys(msg.sender) {
        uint idenNum = idenNums[msg.sender];

        Iden[idenNum].proxy.forward(destination, value, data);
        Forwarded (Iden[idenNum].proxy, destination, value, data);
    }

    function fundProxy() onlyUserKeys(msg.sender) payable {
        uint idenNum = idenNums[msg.sender];

        if (!Iden[idenNum].proxy.send(msg.value)) {throw;}
        Received(Iden[idenNum].proxy, msg.sender, msg.value);
    }

    //FUNCTION FOR USERKEYS (NOT DELEGATES)

    function userSignControllerChange(address _proposedController) onlyUserKeys(msg.sender) {
        var user = Iden[idenNums[msg.sender]];

        user.proposedControllerPendingUntil = now + longTimeLock;
        user.proposedController = _proposedController;
        RecoveryEvent("signControllerChange", msg.sender);
    }

    function userUpgradeController(uint _longTimeLock, uint _shortTimeLock) onlyUserKeys(msg.sender) {
        uint idenNum = idenNums[msg.sender];
        var user = Iden[idenNum];

        if(user.proposedControllerPendingUntil < now && user.proposedController != 0x0){
            changeController(idenNum, user.proposedController, _longTimeLock, _shortTimeLock,  true);
        }
        RecoveryEvent("changeController", msg.sender);
    }

    function userSignUserKeyChange(address _proposedUserKey) onlyUserKeys(msg.sender){
        var user = Iden[idenNums[msg.sender]];

        user.proposedUserKeyPendingUntil = now + shortTimeLock;
        user.proposedUserKey = _proposedUserKey;
        RecoveryEvent("signUserKeyChange", msg.sender);
    }

    //this maybe should be able to be called by anyone?
    function userChangeUserKey() onlyUserKeys(msg.sender){
        uint idenNum = idenNums[msg.sender];
        var user = Iden[idenNum];

        //don't let overwrite anyone elses data
        if (idenNums[user.proposedUserKey] != 0) {throw;}

        if(user.proposedUserKeyPendingUntil < now && user.proposedUserKey != 0x0){
            changeUserKey(idenNum, user.proposedUserKey, true);
        }
    }

    function userReplaceDelegates(address[] delegatesToRemove, address[] delegatesToAdd) onlyUserKeys(msg.sender){
        uint idenNum = idenNums[msg.sender];
        var user = Iden[idenNum];

        removeDelegates(idenNum, delegatesToRemove);
        garbageCollect(idenNum);
        addDelegates(idenNum, delegatesToAdd);

        RecoveryEvent("replaceDelegates", msg.sender);
    }

    function delegateSignUserChange(address proposedUserKey) onlyDelegateKeys(msg.sender){
        uint idenNum = idenNums[msg.sender];

        if(delegateRecordExists(delegates[msg.sender])) {
            delegates[msg.sender].proposedUserKey = proposedUserKey;
            changeUserKey(idenNum, proposedUserKey, false);
            RecoveryEvent("signUserChange", msg.sender);
        }
    }

    function delegateSignControllerChange(address _proposedController) onlyDelegateKeys(msg.sender){
        uint idenNum = idenNums[msg.sender];

        if(delegateRecordExists(delegates[msg.sender])) {
            delegates[msg.sender].proposedController = _proposedController;
            changeController(idenNum, _proposedController, longTimeLock, shortTimeLock, false);
            RecoveryEvent("signControllerChange", msg.sender);
        }
    }

    //HELPER FUNCTIONS - ALL ARE PRIVATE

    //if user has to many delegates, this function will run out of gas. In this case,
    //should delete delegates in bunches before calling this.
    //this also leaves blank spaces in Iden array, as to not overcomplicate logic
    function deleteIdentity(address _userKey) private onlyUserKeys(_userKey) {
        uint idenNum = idenNums[_userKey];
        var user = Iden[idenNum];

        for(uint i = 0; i < user.delegateAddresses.length; i++) {
            delete delegates[user.delegateAddresses[i]];
            delete idenNums[user.delegateAddresses[i]];
        }

        delete idenNums[_userKey];
        delete Iden[idenNum];
    }

    function changeUserKey(uint _idenNum, address newUserKey, bool alreadyApproved) private{
        var user = Iden[_idenNum];

        if(collectedSignatures(_idenNum, newUserKey, false) >= neededSignatures(_idenNum) || alreadyApproved){
            delete idenNums[user.userKey];
            user.userKey = newUserKey;
            updateMapping(newUserKey, _idenNum);
            delete user.proposedUserKey;

            for(uint i = 0 ; i < user.delegateAddresses.length ; i++){
                //remove any pending delegates after a recovery
                if(delegates[user.delegateAddresses[i]].pendingUntil > now){
                    delegates[user.delegateAddresses[i]].deletedAfter = now;
                }
                delete delegates[user.delegateAddresses[i]].proposedUserKey;
            }

        RecoveryEvent("changeUserKey", msg.sender);
        }
    }


    function changeController(uint _idenNum, address _proposedController, uint _longTimeLock, uint _shortTimeLock,  bool alreadyApproved) private {
        var user = Iden[_idenNum];

        if(collectedSignatures(_idenNum, _proposedController, true) >= neededSignatures(_idenNum) || alreadyApproved){
            user.proxy.transfer(_proposedController);
            if (_proposedController == address(identityFactory)) {
              identityFactory.CreateControllerAndRecoveryForProxy(user.proxy, user.userKey, user.delegateAddresses, _longTimeLock, _shortTimeLock);
            }
            deleteIdentity(user.userKey);
        }
        RecoveryEvent("changeController", msg.sender);
    }

    function neededSignatures(uint _idenNum) returns (uint){
        var user = Iden[_idenNum];
        uint currentDelegateCount; //always 0 at this point
        for(uint i = 0 ; i < user.delegateAddresses.length ; i++){
            if(delegateIsCurrent(delegates[user.delegateAddresses[i]])){ currentDelegateCount++; }
        }
        return currentDelegateCount/2 + 1;
    }

    function collectedSignatures(uint _idenNum, address _proposedKey, bool isForController) returns (uint signatures){
        var user = Iden[idenNums[msg.sender]];

        for(uint i = 0 ; i < user.delegateAddresses.length ; i++){
            if (isForController) {
                if (delegateHasValidSignature(delegates[user.delegateAddresses[i]]) && delegates[user.delegateAddresses[i]].proposedController == _proposedKey){
                    signatures++;
                }
            } else {
                if (delegateHasValidSignature(delegates[user.delegateAddresses[i]]) && delegates[user.delegateAddresses[i]].proposedUserKey == _proposedKey){
                    signatures++;
                }
            }
        }
    }

    function addDelegates(uint _idenNum, address[] delegatesToAdd) private {
        var user = Iden[_idenNum];

        for (uint i = 0; i < delegatesToAdd.length; i++) {
            address delegate = delegatesToAdd[i];
            //checks to make sure delegate does not exist already
            if (idenNums[msg.sender] != 0) {throw;}

            if(!delegateRecordExists(delegates[delegate]) && user.delegateAddresses.length < 15) {
                delegates[delegate] = Delegate({proposedUserKey: 0x0, pendingUntil: now + longTimeLock, deletedAfter: 31536000000000, proposedController: 0x0});
                user.delegateAddresses.push(delegate);
                updateMapping(delegate, _idenNum);
            }
        }
    }

    function removeDelegates(uint _idenNum, address[] delegatesToRemove) private {
        var user = Iden[_idenNum];

        for (uint i = 0; i < delegatesToRemove.length; i++) {
            address delegate = delegatesToRemove[i];
            //checks to make sure delegate is owned by person removing them
            if (idenNums[msg.sender] != _idenNum) {throw;}

            if(delegates[delegate].deletedAfter > longTimeLock + now){
            //remove right away if they are still pending
                if(delegates[delegate].pendingUntil > now){
                    delegates[delegate].deletedAfter = now;
                    delete idenNums[delegate];
                } else{
                    delegates[delegate].deletedAfter = longTimeLock + now;
                }
            }
        }
    }

    function garbageCollect(uint _idenNum) private{
        var user = Iden[_idenNum];
        uint i = 0;
        while(i < user.delegateAddresses.length){
            if(delegateIsDeleted(delegates[user.delegateAddresses[i]])){
                delegates[user.delegateAddresses[i]].deletedAfter = 0;
                delegates[user.delegateAddresses[i]].pendingUntil = 0;
                delegates[user.delegateAddresses[i]].proposedUserKey = 0;
                ArrayLib.removeAddress(i, user.delegateAddresses);
            }else{i++;}
        }
    }

    function delegateRecordExists(Delegate d) private returns (bool){
        return d.deletedAfter != 0;
    }
    function delegateIsDeleted(Delegate d) private returns (bool){
        return d.deletedAfter <= now; //doesnt check record existence
    }
    function delegateIsCurrent(Delegate d) private returns (bool){
        return delegateRecordExists(d) && !delegateIsDeleted(d) && now > d.pendingUntil;
    }
    function delegateHasValidSignature(Delegate d) private returns (bool){
        return delegateIsCurrent(d) && d.proposedUserKey != 0x0;
    }

    function updateMapping(address keyToUpdate, uint newIdentityNum) private {
        idenNums[keyToUpdate] = newIdentityNum;
    }
}
