// mainnet: 0x5bfa4582b0c48cb375b9e8322b57ac025965c148
// ropsten: 0x957eb298a72167367fa210fc1aa3faba1d2b629c
pragma solidity ^0.4.8;
library ArrayLib{
  function findAddress(address a, address[] storage arry) returns (int){
    for (uint i = 0 ; i < arry.length ; i++){
      if(arry[i] == a){return int(i);}
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
