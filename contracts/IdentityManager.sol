pragma solidity 0.4.8;
import "./Proxy.sol";

contract IdentityManager {
  uint adminTimeLock;
  uint userTimeLock;
  uint adminRate;

  event IdentityCreated(
    address indexed identity,
    address indexed creator,
    address owner,
    address indexed recoveryKey);

  event OwnerAdded(
    address indexed identity,
    address indexed owner,
    address instigator);

  event OwnerRemoved(
    address indexed identity,
    address indexed owner,
    address instigator);

  event RecoveryChanged(
    address indexed identity,
    address indexed recoveryKey,
    address instigator);
    
  event MigrationInitiated(
    address indexed identity,
    address indexed newIdManager,
    address instigator);
    
  event MigrationCanceled(
    address indexed identity,
    address indexed newIdManager,
    address instigator);
    
   event MigrationFinalized(
    address indexed identity,
    address indexed newIdManager,
    address instigator);

  mapping(address => mapping(address => uint)) owners;
  mapping(address => address) recoveryKeys;
  mapping(address => mapping(address => uint)) limiter;
  mapping(address => uint) migrationInitiated;
  mapping(address => address) migrationNewAddress;

  modifier onlyOwner(address identity) { 
    if (owners[identity][msg.sender] > 0 && (owners[identity][msg.sender] + userTimeLock) <= now ) _ ;
    else throw; 
  }

  modifier onlyOlderOwner(address identity) { 
    if (owners[identity][msg.sender] > 0 && (owners[identity][msg.sender] + adminTimeLock) <= now) _ ;
    else throw;
  }

  modifier onlyRecovery(address identity) { 
    if (recoveryKeys[identity] == msg.sender) _ ;
    else throw;
  }

  modifier rateLimited(Proxy identity) {
    if (limiter[identity][msg.sender] < (now - adminRate)) {
      limiter[identity][msg.sender] = now;
      _ ;
    } else throw;
  }

  // Instantiate IdentityManager with the following limits:
  // - userTimeLock - Time before new owner can control proxy
  // - adminTimeLock - Time before new owner can add/remove owners
  // - adminRate - Time period used for rate limiting a given key for admin functionality
  function IdentityManager(uint _userTimeLock, uint _adminTimeLock, uint _adminRate) {
    adminTimeLock = _adminTimeLock;
    userTimeLock = _userTimeLock;
    adminRate = _adminRate;
  }

  // Factory function
  // gas 289,311
  function CreateIdentity(address owner, address recoveryKey) {
    if (recoveryKey == address(0)) throw;
    Proxy identity = new Proxy();
    owners[identity][owner] = now - adminTimeLock; // This is to ensure original owner has full power from day one
    recoveryKeys[identity] = recoveryKey;
    IdentityCreated(identity, msg.sender, owner,  recoveryKey);
  }

  // An identity Proxy can use this to register itself with the IdentityManager
  // Note they also have to change the owner of the Proxy over to this, but after calling this
  function registerIdentity(address owner, address recoveryKey) {
    if (recoveryKey == address(0)) throw;
    if (owners[msg.sender][owner] > 0 || recoveryKeys[msg.sender] > 0 ) throw; // Deny any funny business
    owners[msg.sender][owner] = now - adminTimeLock; // This is to ensure original owner has full power from day one
    recoveryKeys[msg.sender] = recoveryKey;
    IdentityCreated(msg.sender, msg.sender, owner, recoveryKey);
  }

  // Primary forward function
  function forwardTo(Proxy identity, address destination, uint value, bytes data) onlyOwner(identity) {
    identity.forward(destination, value, data);
  }

  // an owner can add a new device instantly
  function addOwner(Proxy identity, address newOwner) onlyOlderOwner(identity) rateLimited(identity) {
    owners[identity][newOwner] = now;
    OwnerAdded(identity, newOwner, msg.sender);
  }

  // a recovery key owner can add a new device with 1 days wait time
  function addOwnerForRecovery(Proxy identity, address newOwner) onlyRecovery(identity) rateLimited(identity) {
    if (owners[identity][newOwner] > 0) throw;
    owners[identity][newOwner] = now;
    OwnerAdded(identity, newOwner, msg.sender);
  }

  // an owner can remove another owner instantly
  function removeOwner(Proxy identity, address owner) onlyOlderOwner(identity) rateLimited(identity) {
    owners[identity][owner] = 0;
    OwnerRemoved(identity, owner, msg.sender);
  }

  // an owner can add change the recoverykey whenever they want to
  function changeRecovery(Proxy identity, address recoveryKey) onlyOlderOwner(identity) rateLimited(identity) {
    if (recoveryKey == address(0)) throw;
    recoveryKeys[identity] = recoveryKey;
    RecoveryChanged(identity, recoveryKey, msg.sender);
  }

  // an owner can migrate away to a new IdentityManager
  function initiateMigration(Proxy identity, address newIdManager) onlyOlderOwner(identity) {
    migrationInitiated[identity] = now;
    migrationNewAddress[identity] = newIdManager;
    MigrationInitiated(identity, newIdManager, msg.sender);
  }

  // any owner can cancel a migration
  function cancelMigration(Proxy identity) onlyOwner(identity) {
    address canceledManager = migrationNewAddress[identity];
    migrationInitiated[identity] = 0;
    migrationNewAddress[identity] = 0;
    MigrationCanceled(identity, canceledManager, msg.sender);
  }

  // owner needs to finalize migration once adminTimeLock time has passed
  // WARNING: before transfering to a new address, make sure this address is "ready to recieve" the proxy.
  // Not doing so risks the proxy becoming stuck. 
  function finalizeMigration(Proxy identity) onlyOlderOwner(identity) {
    if (migrationInitiated[identity] > 0 && migrationInitiated[identity] + adminTimeLock < now) {
      address newIdManager = migrationNewAddress[identity];
      migrationInitiated[identity] = 0;
      migrationNewAddress[identity] = 0;
      identity.transfer(newIdManager);
      MigrationFinalized(identity, newIdManager, msg.sender);
    }
  }
}

