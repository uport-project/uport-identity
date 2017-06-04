pragma solidity 0.4.8;

import "./IdentityManager.sol";
import "./Proxy.sol";

contract RecoveryManager {
    event RecoveryIdentityCreated(
         address indexed IdentityManager,
         address indexed identity,
         address initiatedBy);

    event SignUserChange(
        address indexed identity,
        address indexed initiatedBy,
        address newKey);

    event ChangeUserKey(
        address indexed identity,
        address indexed initatedBy,
        address newKey);

    struct Delegate {
        bool exists;
        address proposedUserKey;
    }

    struct RecoveryIdentity {
        bool exists;
        uint neededSignatures;
        IdentityManager identityManager;
        mapping (address => Delegate)  delegates;
        address[] delegateAddresses; // needed for iteration of mapping
    }

    //Create RecoveryManager
    function RecoveryManager () {}

    //Proxy address => RecoveryIdentity
    mapping (address => RecoveryIdentity) recoveryIdentities;


    modifier onlyDelegate(address identity) {
        if (recoveryIdentities[identity].delegates[msg.sender].exists) _;
        else throw;
    }

    function createRecovery(address identityManager, address identity, address[] _delegates) {
        RecoveryIdentity recovIden = recoveryIdentities[identity];
        if (recovIden.exists) throw; //overwrite protection

        recovIden.exists = true;
        recovIden.neededSignatures = _delegates.length/2 + 1;
        recovIden.identityManager = IdentityManager(identityManager);
        addDelegates(identity, _delegates);

        RecoveryIdentityCreated(identityManager, identity, msg.sender);
    }

    //Delegate calls this to vote for a new owner
    function signUserChange(address identity, address proposedUserKey) onlyDelegate(identity) {
        recoveryIdentities[identity].delegates[msg.sender].proposedUserKey = proposedUserKey;
        SignUserChange(identity, msg.sender, proposedUserKey);
        changeUserKey(identity, proposedUserKey);
    }

    //If a strict majority of delegates have voted for newUserKey,
    //this will add newUserKey as owner in IdentityManager
    function changeUserKey(address identity, address newUserKey) {
        RecoveryIdentity iden = recoveryIdentities[identity];
        if (collectedSignatures(identity, newUserKey) >= iden.neededSignatures) {
            iden.identityManager.addOwnerForRecovery(Proxy(identity), newUserKey);
            deleteProposedKeys(identity);
            ChangeUserKey(identity, msg.sender, newUserKey);
        }
    }

    function updateRecoveryDelegates(address identity, address[] newDelegates) {
      if (msg.sender != address(recoveryIdentities[identity].identityManager)) throw;
      deleteDelegates(identity);
      addDelegates(identity, newDelegates);
      recoveryIdentities[identity].neededSignatures = newDelegates.length/2 + 1;
    }

    //HELPER FUNCTIONS

    function getAddresses(address identity) constant returns (address[]) {
        return recoveryIdentities[identity].delegateAddresses;
    }

    //Returns the number of delegates that have voted for _proposedUserKey
    function collectedSignatures(address identity, address _proposedUserKey) returns (uint signatures){
        if (_proposedUserKey == address(0)) throw; //substitute for delegateHasValidSignature
        RecoveryIdentity iden = recoveryIdentities[identity];
        for(uint i = 0 ; i < iden.delegateAddresses.length ; i++){
            if (iden.delegates[iden.delegateAddresses[i]].proposedUserKey == _proposedUserKey){
                signatures++;
            }
        }
    }

    //deletes the delegates proposedUserKeys
    function deleteProposedKeys(address identity) internal {
        RecoveryIdentity iden = recoveryIdentities[identity];
        for (uint i = 0; i < iden.delegateAddresses.length; i++) {
            delete iden.delegates[iden.delegateAddresses[i]].proposedUserKey;
        }
    }

    //deletes all delegates from identity
    function deleteDelegates(address identity) internal {
        RecoveryIdentity iden = recoveryIdentities[identity];
        for (uint i = 0; i < iden.delegateAddresses.length; i++) {
            delete iden.delegates[iden.delegateAddresses[i]];
        }
        delete iden.delegateAddresses;
    }

    function addDelegates(address identity, address[] _delegates) internal {
      RecoveryIdentity iden = recoveryIdentities[identity];
      for (uint i = 0; i < _delegates.length; i++) {
          iden.delegateAddresses.push(_delegates[i]);
          iden.delegates[_delegates[i]] = Delegate({exists: true, proposedUserKey: address(0)});
      }
    }
}
