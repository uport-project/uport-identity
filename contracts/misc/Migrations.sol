// mainnet: 0x237fe774d27c03f57d2bfd7709f901f531c3440f
// ropsten: 0x4a954e8ba71be5246fe8590e09b145ef4e31c552
pragma solidity ^0.4.8;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function Migrations() {
    owner = msg.sender;
  }

  function setCompleted(uint completed) restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
