pragma solidity 0.4.15;


contract Controlled {
    address public controller;
    modifier onlyController() {
        require(isController(msg.sender));
        _;
    }

    function Controlled() { controller = msg.sender; }

    function isController(address addr) public returns(bool) { return addr == controller; }

    function transfer(address newController) public onlyController {
        if (newController != address(this)) {
            controller = newController;
        }
    }
}
