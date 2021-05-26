// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0;
pragma experimental ABIEncoderV2;

// Allows anyone to claim a token if they exist in a merkle root.
interface IAirdropSender{
    // Returns the address of the token distributed by this contract.
    function token() external view returns (address);

    // Returns the merkle root of the merkle tree containing account balances available to claim.
    function merkleRoot() external view returns (bytes32);

    // Returns true if the index has been marked claimed.
    function isClaimed(uint256 index) external view returns (bool);

    // Send the given amount of the token to the given address. Reverts if the inputs are invalid.
    function _send(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external;

    //Send airdrops to many addresses. Reverts if the inputs are invalid.
    function _sendToMany(address[] memory accounts, uint256[] memory amounts, bytes32[][] calldata merkleProofs) external;

    // This event is triggered whenever a call to #send succeeds.
    event AirdropSent(uint256 index, address account, uint256 amount);

    // This event is triggered whenever a call to #sendToMany succeeds.
    event AirdropSentToMany(address[]  accounts, uint256[]  amounts);
}