pragma solidity 0.4.11;
import "./libs/Owned.sol";


contract Proxy is Owned {
    event LogForwarded (address indexed destination, uint value, bytes data);
    event LogReceived (address indexed sender, uint value);

    function () payable { LogReceived(msg.sender, msg.value); }

    function forward(address destination, uint value, bytes data) public onlyOwner {
        require(destination.call.value(value)(data));
        LogForwarded(destination, value, data);
    }
}
