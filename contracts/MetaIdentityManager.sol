pragma solidity 0.4.8;
import "./Proxy.sol";

contract MetaIdentityManager {
  uint adminTimeLock;
  uint userTimeLock;
  uint adminRate;
  address relay;

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

  modifier onlyAuthorized() {
    if (msg.sender == relay || checkMessageData(msg.sender)) _;
    else throw;
  }

  modifier onlyOwner(address identity, address sender) {
    if (owners[identity][sender] > 0 && (owners[identity][sender] + userTimeLock) <= now ) _ ;
    else throw;
  }

  modifier onlyOlderOwner(address identity, address sender) {
    if (owners[identity][sender] > 0 && (owners[identity][sender] + adminTimeLock) <= now) _ ;
    else throw;
  }

  modifier onlyRecovery(address identity, address sender) {
    if (recoveryKeys[identity] == sender) _ ;
    else throw;
  }

  modifier rateLimited(Proxy identity, address sender) {
    if (limiter[identity][sender] < (now - adminRate)) {
      limiter[identity][sender] = now;
      _ ;
    } else throw;
  }

  // Instantiate IdentityManager with the following limits:
  // - userTimeLock - Time before new owner can control proxy
  // - adminTimeLock - Time before new owner can add/remove owners
  // - adminRate - Time period used for rate limiting a given key for admin functionality
  function MetaIdentityManager(uint _userTimeLock, uint _adminTimeLock, uint _adminRate, address relayAddress) {
    adminTimeLock = _adminTimeLock;
    userTimeLock = _userTimeLock;
    adminRate = _adminRate;
    relay = relayAddress;
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
  function forwardTo(address sender, Proxy identity, address destination, uint value, bytes data) onlyAuthorized onlyOwner(identity, sender)  {
    identity.forward(destination, value, data);
  }

  // an owner can add a new device instantly
  function addOwner(address sender, Proxy identity, address newOwner) onlyAuthorized onlyOlderOwner(identity, sender) rateLimited(identity, sender) {
    owners[identity][newOwner] = now;
    OwnerAdded(identity, newOwner, sender);
  }

  // a recovery key owner can add a new device with 1 days wait time
  function addOwnerFromRecovery(address sender, Proxy identity, address newOwner) onlyAuthorized onlyRecovery(identity, sender) rateLimited(identity, sender) {
    if (owners[identity][newOwner] > 0) throw;
    owners[identity][newOwner] = now;
    OwnerAdded(identity, newOwner, sender);
  }

  // an owner can remove another owner instantly
  function removeOwner(address sender, Proxy identity, address owner) onlyAuthorized onlyOlderOwner(identity, sender) rateLimited(identity, sender) {
    owners[identity][owner] = 0;
    OwnerRemoved(identity, owner, sender);
  }

  // an owner can add change the recoverykey whenever they want to
  function changeRecovery(address sender, Proxy identity, address recoveryKey) onlyAuthorized onlyOlderOwner(identity, sender) rateLimited(identity, sender) {
    if (recoveryKey == address(0)) throw;
    recoveryKeys[identity] = recoveryKey;
    RecoveryChanged(identity, recoveryKey, sender);
  }

  // an owner can migrate away to a new IdentityManager
  function initiateMigration(address sender, Proxy identity, address newIdManager) onlyAuthorized onlyOlderOwner(identity, sender) {
    migrationInitiated[identity] = now;
    migrationNewAddress[identity] = newIdManager;
    MigrationInitiated(identity, newIdManager, sender);
  }

  // any owner can cancel a migration
  function cancelMigration(address sender, Proxy identity) onlyAuthorized onlyOwner(identity, sender) {
    address canceledManager = migrationNewAddress[identity];
    migrationInitiated[identity] = 0;
    migrationNewAddress[identity] = 0;
    MigrationCanceled(identity, canceledManager, sender);
  }

  // owner needs to finalize migration once adminTimeLock time has passed
  // WARNING: before transfering to a new address, make sure this address is "ready to recieve" the proxy.
  // Not doing so risks the proxy becoming stuck.
  function finalizeMigration(address sender, Proxy identity) onlyAuthorized onlyOlderOwner(identity, sender) {
    if (migrationInitiated[identity] > 0 && migrationInitiated[identity] + adminTimeLock < now) {
      address newIdManager = migrationNewAddress[identity];
      migrationInitiated[identity] = 0;
      migrationNewAddress[identity] = 0;
      identity.transfer(newIdManager);
      MigrationFinalized(identity, newIdManager, sender);
    }
  }

  //Checks that address a is the first input in msg.data.
  //Has very minimal gas overhead. Apparently, negative lol
  function checkMessageData(address a) constant internal returns (bool t) {
    if (msg.data.length < 36) return false;
    assembly {
        let mask := 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
        t := eq(and(mask, a), and(mask, calldataload(4)))
    }
  }
}
