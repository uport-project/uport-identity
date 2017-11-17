pragma solidity 0.4.15;
import "./libs/Controlled.sol";


contract Proxy is Controlled {
    event LogForwarded (address indexed destination, uint value, bytes data);
    event LogReceived (address indexed sender, uint value);

    function () payable { LogReceived(msg.sender, msg.value); }

    function forward(address destination, uint value, bytes data) public onlyController {
        require(destination.call.value(value)(data));
        LogForwarded(destination, value, data);
    }
}
