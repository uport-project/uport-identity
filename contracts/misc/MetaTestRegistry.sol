pragma solidity 0.4.11;


// This contract is only used for testing purposes.
contract MetaTestRegistry {

  mapping(address => uint) public registry;

  function register(address sender, uint x) {
    registry[sender] = x;
  }

  function testThrow(address sender) {
      throw;
  }
}
