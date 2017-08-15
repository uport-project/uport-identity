# TxRelay
TxRelay is a contract that provides the uPort contract system with meta transactions. Meta-tx are a way for a user to sign some data, and then another person/service to relay this data to the Ethereum network. This has the benefit of allowing “unfunded” keys to exist and transact on the Ethereum network without the difficulty of funding them. Instead the person/service relaying the transaction will pay for the gas cost.

## Requirements
* User should be able to send tx without having ether to pay for gas
* Relayer can be chosen by the user
* Minimal overhead
* Similar security to regular transaction
    * Atomic
    * As non-replayable as possible

## Design
The TxRelay contract has one main function, called `relayMetaTx`, that takes in a signature, destination, and data as parameters. This function checks that the signature is valid, then calls the destination address with the data parameter. The destination address must be a contract that is compatible with the TxRelay contract. The relayer can be chosen by the user and is part of the signature described below.

### Signed data
Currently, a user is required to sign the following data: relay_address :: nonce :: destination :: data :: relayer_address

Rationale:
1. relay_address: if the txRelay is ever upgraded, these transactions cannot be replayed.
2. nonce: prevents replay attacks. 
3. destination: necessary to know where tx is going :)
4. data: necessary to know what the user is trying to do. 
5. relayer_address: prevents a not-really-feasible-but-maybe attack, where someone could front run, but not send enough gas when they do for the meta-tx to be processed, and then try and trick the user to convince them the transaction just failed, other than the meta-tx. They can then relay the transaction later. Assuming an honest relayer, this is not an issue. 

### Using TxRelay in a contract
If you want a contract to support meta-tx there some changes that needs to be made. Refer to the [MetaIdentityManager](./metaIdentityManager.md) contract for an example.

1. Add sender param sender to all functions and modifiers that include a reference to msg.sender
    a. This param should be the first param of the function call
2. All references to msg.sender should be changed to sender
3. Add a modifier `onlyAuthorized` to all functions changed in this manner
    a. Allows the relay contract to call these functions. Otherwise, anyone could claim to be whomever they wanted to be
    b. Also allows users to call these functions themselves without meta-tx with the use of checkMessageData function

## Attacks
Replay attacks are a subset of censorship attacks. Here is a brief summary of both:

* Censorship: A relayer promises to relay a transaction. They do not relay the transaction, but they tell the user that they did relay the transaction, maybe reporting some false outcome to make the user act in some way. They also may choose to relay this contract at a later point in time. 
* Replay: A relayer promises to relay a transaction. They send the transaction, but with not enough gas to make it though the signature verification.

Question: Why would anyone choose to replay as compared to censoring?
Answer: The transaction will appear on the blockchain (just as a failed transaction), and thus, to someone not paying attention, it may look like the relayer has not been compromised.

In our system we choose to trust the relayer since it is controlled by us. If a user don't want to trust the relayer they will still have the option of sending regular transactions, or use a different relayer.
