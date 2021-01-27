// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;


/*
    Handy contract for remembering already used nonces.
*/
contract Nonce {
    mapping(uint16 => bool) public nonce;

    event NonceUsed(uint16 _nonce);

    function nonceNotUsed(uint16 _nonce) public view returns(bool) {
        return !nonce[_nonce];
    }

    function rememberNonce(uint16 _nonce) internal {
        nonce[_nonce] = true;

        emit NonceUsed(_nonce);
    }
}
