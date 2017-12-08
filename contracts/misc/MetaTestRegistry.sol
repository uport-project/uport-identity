pragma solidity 0.4.15;


// This contract is only used for testing purposes.
contract MetaTestRegistry {

    mapping(address => uint) public registry;

    function register(address sender, uint x) {
        registry[sender] = x;
    }
}
