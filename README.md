## MerkleTokenVesting

MerkleTokenVesting, is a vesting contract that allows configuring periodic vesting with start tokens and cliff time. Users can initialize their vestings at any time, and periods are based on a 30-day timeframe as an equivalent of a month. The contract owner can add vesting schedules and Merkle roots and deposit vested tokens.

The contract is a combination of two existing contracts: TokenVesting and MerkleDistributor. TokenVesting is a contract for vesting tokens over time with a start date, cliff period, and duration. MerkleDistributor is a contract for validation of token distribution according to a Merkle tree.

The contract uses the OpenZeppelin libraries for ERC20 tokens and access control.

## Tools

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/EthWorks/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Solcover](https://github.com/sc-forks/solidity-coverage) code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

## Usage

### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

### Deploy

Deploy:

```sh
$ yarn deploy network
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```
