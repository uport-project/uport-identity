pragma solidity 0.4.11;
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
  mapping(address => uint) public migrationInitiated;
  mapping(address => address) public migrationNewAddress;

  modifier onlyAuthorized() {
    if (msg.sender == relay || checkMessageData(msg.sender)) _;
    else throw;
  }

  modifier onlyOwner(address identity, address sender) {
    if (isOwner(identity, sender)) _ ;
    else throw;
  }

  modifier onlyOlderOwner(address identity, address sender) {
    if (isOlderOwner(identity, sender)) _ ;
    else throw;
  }

  modifier onlyRecovery(address identity, address sender) {
    if (recoveryKeys[identity] == sender) _;
    else throw;
  }

  modifier rateLimited(Proxy identity, address sender) {
    if (limiter[identity][sender] < (now - adminRate)) {
      limiter[identity][sender] = now;
      _ ;
    } else throw;
  }

  modifier validAddress(address addr) { //protects against some weird attacks
    if (addr != address(0)) _;
    else throw;
  }

  /// @dev Contract constructor sets initial timelocks and meta-tx relay address
  /// @param _userTimeLock Time before new owner can control proxy
  /// @param _adminTimeLock Time before new owner can add/remove owners
  /// @param _adminRate Time period used for rate limiting a given key for admin functionality
  /// @param _relayAddress Address of meta transaction relay contract
  function MetaIdentityManager(uint _userTimeLock, uint _adminTimeLock, uint _adminRate, address _relayAddress) {
    adminTimeLock = _adminTimeLock;
    userTimeLock = _userTimeLock;
    adminRate = _adminRate;
    relay = _relayAddress;
  }

  /// @dev Creates a new proxy contract for an owner and recovery
  /// @param owner Key who can use this contract to control proxy. Given full power
  /// @param recoveryKey Key of recovery network or address from seed to recovery proxy
  /// Gas cost of ~300,000
  function createIdentity(address owner, address recoveryKey) validAddress(recoveryKey) {
    Proxy identity = new Proxy();
    owners[identity][owner] = now - adminTimeLock; // This is to ensure original owner has full power from day one
    recoveryKeys[identity] = recoveryKey;
    IdentityCreated(identity, msg.sender, owner,  recoveryKey);
  }

  /// @dev Allows a user to transfer control of existing proxy to this contract. Must come through proxy
  /// @param owner Key who can use this contract to control proxy. Given full power
  /// @param recoveryKey Key of recovery network or address from seed to recovery proxy
  /// Note: User must change owner of proxy to this contract after calling this
  function registerIdentity(address owner, address recoveryKey) validAddress(recoveryKey) {
    if (recoveryKeys[msg.sender] > 0 ) throw; // Invariant enforced w/ validRecovery modifier
    owners[msg.sender][owner] = now - adminTimeLock; // Owner has full power from day one
    recoveryKeys[msg.sender] = recoveryKey;
    IdentityCreated(msg.sender, msg.sender, owner, recoveryKey);
  }

  /// @dev Allows a user to forward a call through their proxy.
  function forwardTo(address sender, Proxy identity, address destination, uint value, bytes data)
    onlyAuthorized
    onlyOwner(identity, sender)
  {
    identity.forward(destination, value, data);
  }

  /// @dev Allows an olderOwner to add a new owner instantly
  function addOwner(address sender, Proxy identity, address newOwner)
    onlyAuthorized
    onlyOlderOwner(identity, sender)
    rateLimited(identity, sender)
  {
    owners[identity][newOwner] = now - userTimeLock;
    OwnerAdded(identity, newOwner, sender);
  }

  /// @dev Allows a recoveryKey to add a new owner with userTimeLock waiting time
  function addOwnerFromRecovery(address sender, Proxy identity, address newOwner)
    onlyAuthorized
    onlyRecovery(identity, sender)
    rateLimited(identity, sender)
  {
    if (owners[identity][newOwner] > 0) throw;
    owners[identity][newOwner] = now;
    OwnerAdded(identity, newOwner, sender);
  }

  /// @dev Allows an owner to remove another owner instantly
  function removeOwner(address sender, Proxy identity, address owner)
    onlyAuthorized
    onlyOlderOwner(identity, sender)
    rateLimited(identity, sender)
  {
    delete owners[identity][owner];
    OwnerRemoved(identity, owner, sender);
  }

  /// @dev Allows an owner to change the recoveryKey instantly
  function changeRecovery(address sender, Proxy identity, address recoveryKey)
    onlyAuthorized
    onlyOlderOwner(identity, sender)
    rateLimited(identity, sender)
    validAddress(recoveryKey)
  {
    recoveryKeys[identity] = recoveryKey;
    RecoveryChanged(identity, recoveryKey, sender);
  }

  /// @dev Allows an owner to begin process of transfering proxy to new IdentityManager
  function initiateMigration(address sender, Proxy identity, address newIdManager)
    onlyAuthorized
    onlyOlderOwner(identity, sender)
  {
    migrationInitiated[identity] = now;
    migrationNewAddress[identity] = newIdManager;
    MigrationInitiated(identity, newIdManager, sender);
  }

  /// @dev Allows an owner to cancel the process of transfering proxy to new IdentityManager
  function cancelMigration(address sender, Proxy identity) onlyAuthorized onlyOwner(identity, sender) {
    address canceledManager = migrationNewAddress[identity];
    delete migrationInitiated[identity];
    delete migrationNewAddress[identity];
    MigrationCanceled(identity, canceledManager, sender);
  }

  /// @dev Allows an owner to finalize and completly transfer proxy to new IdentityManager
  /// Note: before transfering to a new address, make sure this address is "ready to recieve" the proxy.
  /// Not doing so risks the proxy becoming stuck.
  function finalizeMigration(address sender, Proxy identity) onlyAuthorized onlyOlderOwner(identity, sender) {
    if (migrationInitiated[identity] == 0 || migrationInitiated[identity] + adminTimeLock >= now) {
      throw;
    } else {
      address newIdManager = migrationNewAddress[identity];
      delete migrationInitiated[identity];
      delete migrationNewAddress[identity];
      identity.transfer(newIdManager);
      MigrationFinalized(identity, newIdManager, sender);
    }
  }

  //Checks that address a is the first input in msg.data.
  //Has very minimal gas overhead.
  function checkMessageData(address a) constant internal returns (bool t) {
    if (msg.data.length < 36) return false;
    assembly {
        let mask := 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
        t := eq(a, and(mask, calldataload(4)))
    }
  }

  function isOwner(address identity, address owner) constant returns (bool) {
    return (owners[identity][owner] > 0 && (owners[identity][owner] + userTimeLock) <= now);
  }

  function isOlderOwner(address identity, address owner) constant returns (bool) {
    return (owners[identity][owner] > 0 && (owners[identity][owner] + adminTimeLock) <= now);
  }

  function isRecovery(address identity, address recoveryKey) constant returns (bool) {
    return recoveryKeys[identity] == recoveryKey;
  }
}
