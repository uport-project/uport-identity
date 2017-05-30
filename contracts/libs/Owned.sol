pragma solidity ^0.4.8;

contract Owned {
  address public owner;
  modifier onlyOwner(){ if (isOwner(msg.sender)) _; }
  modifier ifOwner(address sender) { if(isOwner(sender)) _; }

  function Owned(){ owner = msg.sender; }

  function isOwner(address addr) public returns(bool) { return addr == owner; }

  function transfer(address _owner) onlyOwner { owner = _owner; }
}
