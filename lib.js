const Contract = require('truffle-contract')
UportRegistry = Contract(require('./build/contracts/UportRegistry1.json'))
// ConvertLib = Contract(require('./build/contracts/ConvertLib.json'))
// Migrations = Contract(require('./build/contracts/Migrations.json'))

module.exports = { UportRegistry }
