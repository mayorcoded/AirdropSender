const { expect } = require("chai");
const { BigNumber, utils } = require('ethers');
const { MerkleTree } = require('./helpers/merkleTree.js');
let recipients = require('./helpers/recipients.json');

describe("Airdrop tokens to a recipient", function() {
  let root;
  let token;
  let proofs;
  let merkleTree;
  let airdropSender;

  recipients = recipients.map((recipient) => ({
    account: utils.getAddress(recipient.account),
    amount: BigNumber.from(recipient.amount)
  }));

  before(async () => {
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    token = await ERC20Token.deploy("AirdropToken", "ADT", 1000000000);

    merkleTree = new MerkleTree(recipients);
    root = merkleTree.getHexRoot();

    proofs = recipients.map((recipient, index) =>
        merkleTree.getHexProof(index, recipient.account, recipient.amount)
    );

    const AirdropSender = await ethers.getContractFactory("AirdropSender");
    airdropSender = await AirdropSender.deploy(token.address, root) ;
    await token.setBalance(airdropSender.address, 1000);
    await airdropSender.deployed();
  });


  it('should return false for an unclaimed airdrop', async () => {
    const index = 0;
    expect(await airdropSender.isClaimed(index)).to.equal(false);
  });

  it('should revert when any of the send input is invalid', async() => {
    const index = 0;
    const proof = proofs[0];
    const recipient = recipients[0];

    const invalidAmount = 15;
    await expect(airdropSender.send(index, recipient.account, invalidAmount, proof))
        .to.be.revertedWith("AirdropSender: Invalid proof");

    const invalidAccount = recipients[1].account;
    await expect(airdropSender.send(index, invalidAccount, invalidAmount, proof))
        .to.be.revertedWith("AirdropSender: Invalid proof");

    const invalidIndex = 6;
    await expect(airdropSender.send(invalidIndex, recipient.account, recipient.amount.toNumber(), proof))
        .to.be.revertedWith("AirdropSender: Invalid proof");
  });

  it('should not air drop tokens from an invalid address', async() => {
    const invalidSigner = (await ethers.getSigners())[2];

    const index = 0;
    const recipient = recipients[0];
    const proof = proofs[0];
    expect(await airdropSender.isClaimed(index)).to.equal(false);

    await expect( airdropSender.connect(invalidSigner)
        .send(index, recipient.account, recipient.amount.toNumber(), proof
    )).to.be.revertedWith("Ownable: caller is not the owner");
  })

  it('should air drop tokens to a recipient', async() => {
    const index = 0;
    const recipient = recipients[0];
    const proof = proofs[0];
    expect(await airdropSender.isClaimed(index)).to.equal(false);

    expect(await airdropSender.send(index, recipient.account, recipient.amount.toNumber(), proof))
        .to
        .emit(airdropSender, 'AirdropSent')
        .withArgs(index, recipient.account, recipient.amount.toNumber());
  })

  it('should return true for a claimed airdrop', async () => {
    const index = 0;
    expect(await airdropSender.isClaimed(index)).to.equal(true);
  });

  it('should ensure that recipient received correct airdrop amount', async () => {
    const recipient = recipients[0];
    expect((await token.balanceOf(recipient.account)).toNumber()).to.equal(recipient.amount.toNumber());
  });
});

describe("Airdrop tokens to many recipients", function() {
  let root;
  let token;
  let proofs;
  let merkleTree;
  let airdropSender;

  recipients = recipients.map((recipient) => ({
    account: utils.getAddress(recipient.account),
    amount: BigNumber.from(recipient.amount)
  }));

  before(async () => {
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    token = await ERC20Token.deploy("AirdropToken", "ADT", 1000000000);

    merkleTree = new MerkleTree(recipients);
    root = merkleTree.getHexRoot();

    proofs = recipients.map((recipient, index) =>
        merkleTree.getHexProof(index, recipient.account, recipient.amount)
    );

    const AirdropSender = await ethers.getContractFactory("AirdropSender");
    airdropSender = await AirdropSender.deploy(token.address, root) ;
    await token.setBalance(airdropSender.address, 1000);
    await airdropSender.deployed();
  });

  it('should not airdrop tokens if total airdrop amount is greater than token balance', async() => {

    const accounts = recipients.map((recipient) => recipient.account);
    const amounts = recipients.map((recipient) => recipient.amount.toNumber() * 100);
    await expect(airdropSender.sendToMany(accounts, amounts, proofs))
        .to.be.revertedWith("total amount should not be greater than balance");
  });

  it('should not airdrop tokens if singer is invalid', async() => {
    const invalidSigner = (await ethers.getSigners())[2];

    const accounts = recipients.map((recipient) => recipient.account);
    const amounts = recipients.map((recipient) => recipient.amount.toNumber());
    await expect(airdropSender.connect(invalidSigner).sendToMany(accounts, amounts, proofs))
        .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it('should airdrop tokens to many recipients', async() => {
    const accounts = recipients.map((recipient) => recipient.account);
    const amounts = recipients.map((recipient) => recipient.amount.toNumber());
    expect(await airdropSender.sendToMany(accounts, amounts, proofs))
        .to
        .emit(airdropSender, 'AirdropSentToMany')
        .withArgs(accounts, amounts);
  });

  it('should not resent claimed airdrop tokens to many recipients', async() => {
    const accounts = recipients.map((recipient) => recipient.account);
    const amounts = recipients.map((recipient) => recipient.amount.toNumber());
    await expect(airdropSender.sendToMany(accounts, amounts, proofs))
        .to.be.revertedWith("AirdropSender: Drop already claimed");
  });
});