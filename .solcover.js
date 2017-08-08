module.exports = {
  port: 8555,
  testCommand: 'sleep 5 && ../node_modules/.bin/truffle test --network coverage',
  accounts: 25,
  skipFiles: ['misc/Migrations.sol']
};
