pragma solidity 0.4.11;

// This contract is only used for testing purposes.
contract MetaTestRegistry {

  mapping(address => uint) public registry;

  function register(address sender, uint x) {
    registry[sender] = x;
  }

  function reallyLongFunctionName(uint with, address many, string strange, uint params) {
    registry[many] = params;
  }

  function testThrow(address sender) {
      throw;
  }
}
