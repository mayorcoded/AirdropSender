// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "./interfaces/IAirdropSender.sol";

contract AirdropSender is Ownable, IAirdropSender {
    address public immutable override token;
    bytes32 public immutable override merkleRoot;

    mapping(uint256 => uint256) private claimedBitMap;

    constructor(address token_, bytes32 merkleRoot_) public {
        token = token_;
        merkleRoot = merkleRoot_;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function _send(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
    external override {
        require(!isClaimed(index), 'AirdropSender: Drop already claimed.');

        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), 'AirdropSender: Invalid proof.');

        _setClaimed(index);
        require(IERC20(token).transfer(account, amount), 'AirdropSender: Transfer failed.');

        emit AirdropSent(index, account, amount);
    }

    function _sendToMany(address[] memory accounts, uint256[] memory amounts, bytes32[][] calldata merkleProofs)
    external override{
        uint256 totalAmount;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount = totalAmount + amounts[i];
        }

        IERC20 token = IERC20(token);
        require(totalAmount <= token.balanceOf(address(this)),
            "AirdropSender: total amount should not be greater than balance");

        for(uint256 i = 0; i < amounts.length; i++){
            this._send(i, accounts[i], amounts[i], merkleProofs[i]);
        }
    }

    function send(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
    onlyOwner()
    public {
        this._send(index, account, amount, merkleProof);
        emit AirdropSent(index, account, amount);
    }

    function sendToMany(address[] memory accounts, uint256[] memory amounts, bytes32[][] calldata merkleProofs)
    onlyOwner()
    public {
        this._sendToMany(accounts, amounts, merkleProofs);
        emit AirdropSentToMany(accounts, amounts);
    }
}
