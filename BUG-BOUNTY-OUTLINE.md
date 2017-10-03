# uPort Bug Bounty Program

// TODO: This the initial outline, and will transition to being formalized, mainly timelines, values and additional details needed. Bug bounty modeled after Ethereum's bug bounty.

uPort is building critical identity infrastructure on Ethereum. We value contributions from the entire community which help us work towards increasing the stability and security of this infrastructure. To reflect this we are offering the following bug bounty program.

Review all the details below before starting your bug hunt! If you've already read this information and have found a bug you'd like to submit to the uPort team for review, please use this form: //TODO [Submit a Bug](..).

You can develop an high level understanding of the contract infrastructure by reviewing the docs contained in this repo. Many of the contracts have documentation in the docs folder. You can find additional details about uPort and references to our other work and applications on our [website](https://www.uport.me)

## Rules

Please have a look at the bullets below before starting:

* Issues that have already been submitted by another user or are already known to the uPort team are not eligible for bounty rewards.
* // TODO Encourage bug hunting on private chains or public deployed contracts? main net / test nets?
* // TODO consensys scope / eligibility
* Contracts listed in Targets is the only code included in this bounty. All other's parts of uPort's infrastructure, applications and websites are not part of this bounty.
* Determinations of eligibility, award, and all terms related to an award are at the sole and final discretion of uPort

## Rewards

The value of rewards paid out in ether and will vary depending on Severity. The severity is calculated according to the OWASP risk rating model based on Impact and Likelihood

![Severity Chart](https://raw.githubusercontent.com/weifund/weifund-contracts/master/assets/severity.png)

Reward sizes are guided by the categorizations below, but are in the end, determined at the sole discretion of the uPort team.

* Critical: Up to 50x
* High: 30x
* Medium: 20x
* Low: 4x
* Note: x

In addition to Severity, other variables are also considered when the uPort team decides the score, including (but not limited to):

* Quality of Description, Attack Scenario & Components: Clear and well-written descriptions will receive higher rewards.
* Quality of Reproduction: Include test code, scripts and detailed instructions. The easier it is for us to reproduce and verify the vulnerability, the higher the reward.
* Quality of Fix: Higher rewards are paid for submissions with clear instructions to fix the vulnerability.

## Targets

### Code in scope:

The following contracts are included in the scope of this bug bounty.

* [MetaIdentityManager](https://github.com/uport-project/uport-identity/blob/develop/contracts/MetaIdentityManager.sol)
* [TxRelay](https://github.com/uport-project/uport-identity/blob/develop/contracts/TxRelay.sol)
* [Owned](https://github.com/uport-project/uport-identity/blob/develop/contracts/libs/Owned.sol)
* [Proxy](https://github.com/uport-project/uport-identity/blob/develop/contracts/Proxy.sol)


### Deployed Contracts in Scope:

//TODO networks? all contracts? or only proxy?

* __Proxy__: 0x0a6794fb....
* __TxRelay__: 0xb1d393bbf102e60b62f53de35a9a107d9cb06b74
* __Owned__: 0x850b2ecd566748c04b51d7effd3d27a8155b5879
* __Proxy__: 0x850b2ecd566748c04b51d7effd3d27a8155b5879

## FAQ

### What should a good vulnerability submission look like?

A good vulnerability submissoin will include the following sections.

**Description**: Summarize the vulnerability

**Attack Scenario**: Describe the attack.

**Components**: List contracts which are effected and/or reference specific functions.

**Reproduction**: Describe the set of methods to reproduce the vulnerability

**Details**: Add any other details not covered. Can also contain links to GitHub Gists, repos containing code samples, etc.

**Fix**: Optionally proposed a way to fix the vulnerability.

### Is the bug bounty program time limited?

// TODO timeline

### Where do I submit bugs?

//TODO

### How are bounties paid out?

//TODO Rewards are paid out in ether after the submission has been validated. Local laws may require us to ask for proof of your identity. In addition, we will need your ether address.

### I reported an issue / vulnerability but have not received a response?

// TODO We review and respond to submissions as fast as possible. Please email us **** if you have not received a response within three business days.

### I have further questions?

//TODO

## Legal

//TODO

## Mailing List

//TODO Need Communication channels for bounty updates, can be other channels
