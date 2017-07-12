#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const artifacts = require('../index.js')
const exec = require('child_process').exec

const TEMPLATE = 'readme-template.md'
const README = 'README.md'

let outStream = fs.createWriteStream(__dirname + '/../' + README)

// get coverage
exec('grep -m 1 -o ">.\\{1,5\\}%" ./docs/coverage/index.html', (error, stdout, stderr) => {
  var coverage = stdout.slice(1).replace('\n', '')

  let lines = readline.createInterface({
    input: fs.createReadStream(__dirname + '/../' + TEMPLATE)
  })
  lines.on('line', line => {
    if (line === '<coverage>') {
      outStream.write('[![solidity-coverage](https://img.shields.io/badge/coverage-' +
        coverage + '25-green.svg)](https://uport-project.github.io/uport-identity/coverage)\n\n')
    } else if (line === '<contract-deployments>') {
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
})


function writeContractInfo(id) {
  outStream.write('|Contract|Address|\n')
  outStream.write('| --|--|\n')
  outStream.write(createContractString(artifacts.ArrayLib, id))
  outStream.write(createContractString(artifacts.IdentityFactory, id))
  outStream.write(createContractString(artifacts.IdentityFactoryWithRecoveryKey, id))
  outStream.write(createContractString(artifacts.IdentityManager, id))
  outStream.write(createContractString(artifacts.TxRelay, id))
  outStream.write(createContractString(artifacts.MetaIdentityManager, id))
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
