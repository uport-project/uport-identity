pragma solidity 0.4.11;


contract Owned {
    address public owner;
    modifier onlyOwner() {
        if (!isOwner(msg.sender)) {
            throw;
        }
        _;
    }

    function Owned() { owner = msg.sender; }

    function isOwner(address addr) public returns(bool) { return addr == owner; }

    function transfer(address _owner) onlyOwner {
        if (_owner != address(this)) {
            owner = _owner;
        }
    }
}
