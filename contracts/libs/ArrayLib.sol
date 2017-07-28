pragma solidity ^0.4.11;


library ArrayLib {
    function findAddress(address a, address[] storage arry) returns (int){
        for (uint i = 0 ; i < arry.length ; i++){
            if (arry[i] == a) {
                return int(i);
            }
        }
        return -1;
    }

    function removeAddress(uint i, address[] storage arry){
        uint lengthMinusOne = arry.length - 1;
        arry[i] = arry[lengthMinusOne];
        delete arry[lengthMinusOne];
        arry.length = lengthMinusOne;
    }
}
