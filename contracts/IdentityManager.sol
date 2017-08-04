pragma solidity 0.4.11;
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
  mapping(address => uint) public migrationInitiated;
  mapping(address => address) public migrationNewAddress;

  modifier onlyOwner(address identity) {
    if (isOwner(identity, msg.sender)) _ ;
    else throw;
  }

  modifier onlyOlderOwner(address identity) {
    if (isOlderOwner(identity, msg.sender)) _ ;
    else throw;
  }

  modifier onlyRecovery(address identity) {
    if (recoveryKeys[identity] == msg.sender) _ ;
    else throw;
  }

  modifier rateLimited(address identity) {
    if (limiter[identity][msg.sender] < (now - adminRate)) {
      limiter[identity][msg.sender] = now;
      _ ;
    } else throw;
  }

  modifier validAddress(address addr) { //protects against some weird attacks
    if (addr != address(0)) _;
    else throw;
  }

  /// @dev Contract constructor sets initial timelock limits
  /// @param _userTimeLock Time before new owner can control proxy
  /// @param _adminTimeLock Time before new owner can add/remove owners
  /// @param _adminRate Time period used for rate limiting a given key for admin functionality
  function IdentityManager(uint _userTimeLock, uint _adminTimeLock, uint _adminRate) {
    adminTimeLock = _adminTimeLock;
    userTimeLock = _userTimeLock;
    adminRate = _adminRate;
  }

  /// @dev Creates a new proxy contract for an owner and recovery
  /// @param owner Key who can use this contract to control proxy. Given full power
  /// @param recoveryKey Key of recovery network or address from seed to recovery proxy
  /// Gas cost of 289,311
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
    if (recoveryKeys[msg.sender] > 0) throw; // Deny any funny business
    owners[msg.sender][owner] = now - adminTimeLock; // This is to ensure original owner has full power from day one
    recoveryKeys[msg.sender] = recoveryKey;
    IdentityCreated(msg.sender, msg.sender, owner, recoveryKey);
  }

  /// @dev Allows a user to forward a call through their proxy.
  function forwardTo(Proxy identity, address destination, uint value, bytes data) onlyOwner(identity) {
    identity.forward(destination, value, data);
  }

  /// @dev Allows an olderOwner to add a new owner instantly
  function addOwner(Proxy identity, address newOwner) onlyOlderOwner(identity) rateLimited(identity) {
    owners[identity][newOwner] = now - userTimeLock;
    OwnerAdded(identity, newOwner, msg.sender);
  }

  /// @dev Allows a recoveryKey to add a new owner with userTimeLock waiting time
  function addOwnerFromRecovery(Proxy identity, address newOwner) onlyRecovery(identity) rateLimited(identity) {
    if (isOwner(identity, newOwner)) throw;
    owners[identity][newOwner] = now;
    OwnerAdded(identity, newOwner, msg.sender);
  }

  /// @dev Allows an owner to remove another owner instantly
  function removeOwner(Proxy identity, address owner) onlyOlderOwner(identity) rateLimited(identity) {
    delete owners[identity][owner];
    OwnerRemoved(identity, owner, msg.sender);
  }

  /// @dev Allows an owner to change the recoveryKey instantly
  function changeRecovery(Proxy identity, address recoveryKey)
    onlyOlderOwner(identity)
    rateLimited(identity)
    validAddress(recoveryKey)
  {
    recoveryKeys[identity] = recoveryKey;
    RecoveryChanged(identity, recoveryKey, msg.sender);
  }

  /// @dev Allows an owner to begin process of transfering proxy to new IdentityManager
  function initiateMigration(Proxy identity, address newIdManager)
    onlyOlderOwner(identity)
    validAddress(newIdManager)
  {
    migrationInitiated[identity] = now;
    migrationNewAddress[identity] = newIdManager;
    MigrationInitiated(identity, newIdManager, msg.sender);
  }

  /// @dev Allows an owner to cancel the process of transfering proxy to new IdentityManager
  function cancelMigration(Proxy identity) onlyOwner(identity) {
    address canceledManager = migrationNewAddress[identity];
    delete migrationInitiated[identity];
    delete migrationNewAddress[identity];
    MigrationCanceled(identity, canceledManager, msg.sender);
  }

  /// @dev Allows an owner to finalize migration once adminTimeLock time has passed
  /// WARNING: before transfering to a new address, make sure this address is "ready to recieve" the proxy.
  /// Not doing so risks the proxy becoming stuck.
  function finalizeMigration(Proxy identity) onlyOlderOwner(identity) {
    if (migrationInitiated[identity] == 0 || migrationInitiated[identity] + adminTimeLock >= now) {
      throw;
    } else {
      address newIdManager = migrationNewAddress[identity];
      delete migrationInitiated[identity];
      delete migrationNewAddress[identity];
      identity.transfer(newIdManager);
      MigrationFinalized(identity, newIdManager, msg.sender);
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
