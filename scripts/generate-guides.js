#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const artifacts = require('../artifact-index.js')
const exec = require('child_process').exec

let outStream = fs.createWriteStream(__dirname + '/../docs/guides/index.md')

let lines = readline.createInterface({
  input: fs.createReadStream(__dirname + '/../docs/guides/_template.md')
})

lines.on('line', line => {
  if (line === '<contract-deployments>') {
    outStream.write('## Contract Deployments\n')
    outStream.write('### Mainnet (id: 1)\n')
    writeContractInfo(1)
    outStream.write('### Rinkeby testnet (id: 4)\n')
    writeContractInfo(4)
    outStream.write('### Kovan testnet (id: 42)\n')
    writeContractInfo(42)
    outStream.write('### Ropsten testnet (id: 3)\n')
    writeContractInfo(3)
  } else {
    outStream.write(line + '\n')
  }
})

function writeContractInfo(id) {
  outStream.write('|Contract|Address|\n')
  outStream.write('| --|--|\n')
  //outStream.write(createContractString(artifacts.ArrayLib, id))
  //outStream.write(createContractString(artifacts.IdentityFactory, id))
  //outStream.write(createContractString(artifacts.IdentityFactoryWithRecoveryKey, id))
  outStream.write(createContractString(artifacts.IdentityManager, id))
  outStream.write(createContractString(artifacts.TxRelay, id))
  outStream.write(createContractString(artifacts.MetaIdentityManager, id))
  outStream.write('\n')
}

function createContractString(artifact, id) {
  let wrapAddr = '(not deployed)'
  let version = artifact.latestVersion
  let artifactObj = artifact[version]
  if (artifactObj.networks[id]) {
    let address = artifactObj.networks[id].address
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
  return '|' + artifactObj.contract_name + '|' + wrapAddr + '|\n'
}
