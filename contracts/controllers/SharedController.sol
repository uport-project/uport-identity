pragma solidity 0.4.8;
import "../proxies/Proxy.sol";
import "../libraries/ArrayLib.sol";

contract SharedController {
    Proxy public proxy;
    address[] public userAddresses;
    mapping( bytes32 => mapping( address => bool )) public txSigners;
    
    modifier onlyProxy() { if(address(proxy) == msg.sender) _; }

    function SharedController(address proxyAddress, address[] _userAddresses) {
        proxy = Proxy(proxyAddress);
        userAddresses = _userAddresses;
    }

    function forward(address destination, uint value, bytes data) {
        bytes32 txHash = sha3(destination, value, data);
        txSigners[txHash][msg.sender] = true;
        if (collectedSignatures(txHash) >= neededSignatures()){
            toProxy(destination, value, data);
            resetSignatures(txHash);
        }
    }
//vote=false to revoke
    function cheapSign(bytes32 txHash, bool vote) { txSigners[txHash][msg.sender] = vote; }
//settings
    function addUser(address newUser) onlyProxy{
        if(ArrayLib.findAddress(newUser, userAddresses) == -1){
            userAddresses.push(newUser);
        }
    }
    function removeUser(address oldUser) onlyProxy{
        uint lastIndex = userAddresses.length - 1;
        int i = ArrayLib.findAddress(oldUser, userAddresses);
        if(i != -1){ ArrayLib.removeAddress(uint(i), userAddresses); }
    }
    function changeController(address newController) onlyProxy{
        proxy.transfer(newController);
        suicide(newController);
    }
//read only
    function collectedSignatures(bytes32 txHash) returns (uint signatures){
        for(uint i = 0 ; i < userAddresses.length ; i++){
            if (txSigners[txHash][userAddresses[i]]){
                signatures++;
            }
        }
    }
    function neededSignatures() returns(uint){ return userAddresses.length/2 + 1; }
    function getUserAddresses() returns(address[]){return userAddresses;}
//private
    function toProxy(address destination, uint value, bytes data) private {
        proxy.forward(destination, value, data);
    }
    function resetSignatures(bytes32 txHash) private {
        for(uint i = 0 ; i < userAddresses.length ; i++){
            txSigners[txHash][userAddresses[i]] = false;
        }
    }
}
