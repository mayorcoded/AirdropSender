// test/helpers/merkleTree.js
// SPDX-License-Identifier: MIT
/**
 * Adopted from OpenZeppelin test helpers and modified to suit the purpose of this test
 * More specifically, creating merkle tree nodes from {index, address, amount},
 * As opposed to just {index}
 * This ensures the the airdrop amount and address data cannot be manipulated.
 */
const { utils } = require('ethers')
const { keccak256, bufferToHex } = require('ethereumjs-util');

class MerkleTree {
    constructor (elements) {
        // Filter empty strings and hash elements
        elements = elements.map(({ account, amount }, index) => {
            return this.toNode(index, account, amount)
        })

        this.elements = elements //elements.filter(el => el).map(el => keccak256(el));

        // Sort elements
        this.elements.sort(Buffer.compare);
        // Deduplicate elements
        this.elements = this.bufDedup(this.elements);

        // Create layers
        this.layers = this.getLayers(this.elements);
    }

    getLayers (elements) {
        if (elements.length === 0) {
            return [['']];
        }

        const layers = [];
        layers.push(elements);

        // Get next layer until we reach the root
        while (layers[layers.length - 1].length > 1) {
            layers.push(this.getNextLayer(layers[layers.length - 1]));
        }

        return layers;
    }

    getNextLayer (elements) {
        return elements.reduce((layer, el, idx, arr) => {
            if (idx % 2 === 0) {
                // Hash the current element with its pair element
                layer.push(this.combinedHash(el, arr[idx + 1]));
            }

            return layer;
        }, []);
    }

    combinedHash (first, second) {
        if (!first) { return second; }
        if (!second) { return first; }

        return keccak256(this.sortAndConcat(first, second));
    }

    getRoot () {
        return this.layers[this.layers.length - 1][0];
    }

    getHexRoot () {
        return bufferToHex(this.getRoot());
    }

    getProof (index, account, amount) {
        const el = this.toNode(index, account, amount);
        let idx = this.bufIndexOf(el, this.elements);

        if (idx === -1) {
            throw new Error('Element does not exist in Merkle tree');
        }

        return this.layers.reduce((proof, layer) => {
            const pairElement = this.getPairElement(idx, layer);

            if (pairElement) {
                proof.push(pairElement);
            }

            idx = Math.floor(idx / 2);

            return proof;
        }, []);
    }

    getHexProof (index, account, amount) {
        const proof = this.getProof(index, account, amount);

        return this.bufArrToHexArr(proof);
    }

    getPairElement (idx, layer) {
        const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

        if (pairIdx < layer.length) {
            return layer[pairIdx];
        } else {
            return null;
        }
    }

    bufIndexOf (el, arr) {
        let hash;

        // Convert element to 32 byte hash if it is not one already
        if (el.length !== 32 || !Buffer.isBuffer(el)) {
            hash = keccak256(el);
        } else {
            hash = el;
        }

        for (let i = 0; i < arr.length; i++) {
            if (hash.equals(arr[i])) {
                return i;
            }
        }

        return -1;
    }

    bufDedup (elements) {
        return elements.filter((el, idx) => {
            return idx === 0 || !elements[idx - 1].equals(el);
        });
    }

    bufArrToHexArr (arr) {
        if (arr.some(el => !Buffer.isBuffer(el))) {
            throw new Error('Array is not an array of buffers');
        }

        return arr.map(el => '0x' + el.toString('hex'));
    }

    sortAndConcat (...args) {
        return Buffer.concat([...args].sort(Buffer.compare));
    }

    toNode(index , account, amount) {
        return Buffer.from(
            utils.solidityKeccak256(['uint256', 'address', 'uint256'], [index, account, amount]).substr(2),
            'hex'
        )
    }
}

module.exports = {
    MerkleTree,
};