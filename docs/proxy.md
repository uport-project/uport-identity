# Proxy
The Proxy contract acts as a permanent identifier for a uport user. When interacting with other smart contracts on the blockchain the address of the proxy contract will be `msg.sender` for the user.

## Requirements
The Proxy should be able to preform the following actions:
* Transaction forwarding
    - Forward any type of transaction that a user would want to send (except contract creation)
    - Send value transactions with ether stored in the proxy contract
* Changing the owner of the proxy contract

## Design
The `forward` function can take any data and send it to any address, it can also send ether in the same call. The Proxy is owned by one single owner that can be changed at any point.
