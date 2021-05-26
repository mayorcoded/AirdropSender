# AirdropSender
A  Token Airdrop smart contract that uses merkle trees to airdrop tokens to thousands of addresses.

### Setup
* Install dependencies: `yarn`
* Run tests: `npx hardhat test`


### Features
* Airdrop to a recipient: 
```solidity
function send(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
```

* Airdrop to many recipients:
```solidity
function sendToMany(address[] memory accounts, uint256[] memory amounts, bytes32[][] calldata merkleProofs)
```

For more examples, please check the tests.

### Tools
- Hardhat
- Node.js (v >= 10)
- Ethers 
- Waffle (Mocha and Chai) for testing.
- Solidity