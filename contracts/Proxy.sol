pragma solidity 0.4.15;
import "./libs/Owned.sol";


contract Proxy is Owned {
    event Forwarded (address indexed destination, uint value, bytes data);
    event Received (address indexed sender, uint value);

    function () payable { Received(msg.sender, msg.value); }

    function forward(address destination, uint value, bytes data) public onlyOwner {
        require(destination.call.value(value)(data));
        Forwarded(destination, value, data);
    }
}
