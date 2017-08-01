#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const artifacts = require('../index.js')

const TEMPLATE = 'readme-template.md'
const README = 'README.md'

let lines = readline.createInterface({
  input: fs.createReadStream(__dirname + '/../' + TEMPLATE)
})
let outStream = fs.createWriteStream(__dirname + '/../' + README)


lines.on('line', line => {
  if (line === '<contract-deployments>') {
    outStream.write('## Contract Deployments\n')
    outStream.write('### Mainnet (id: 1)\n')
    writeContractInfo(1)
    outStream.write('### Ropsten testnet (id: 3)\n')
    writeContractInfo(3)
    outStream.write('### Rinkeby testnet (id: 4)\n')
    writeContractInfo(4)
    outStream.write('### Kovan testnet (id: 42)\n')
    writeContractInfo(42)
  } else {
    outStream.write(line + '\n')
  }
})

function writeContractInfo(id) {
  outStream.write('|Contract|Address|\n')
  outStream.write('| --|--|\n')
  outStream.write(createContractString(artifacts.ArrayLib, id))
  outStream.write(createContractString(artifacts.IdentityFactory, id))
  outStream.write(createContractString(artifacts.IdentityFactoryWithRecoveryKey, id))
  outStream.write(createContractString(artifacts.IdentityManager, id))
  outStream.write('\n')
}

function createContractString(artifact, id) {
  let wrapAddr = '(not deployed)'
  if (artifact.networks[id]) {
    let address = artifact.networks[id].address
    let netPrefix = ''
    if (id === 3) {
      netPrefix = 'ropsten.'
    } else if (id === 4) {
      netPrefix = 'rinkeby.'
    } else if (id === 42) {
      netPrefix = 'kovan.'
    }
    wrapAddr = '[' + address +'](https://' + netPrefix + 'etherscan.io/address/' + address + ')'
  }
  return '|' + artifact.contract_name + '|' + wrapAddr + '|\n'
}
