// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

library ECDSA {

    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            // ecrecover takes the signature parameters, and the only way to get them
            // currently is to use assembly.
            /// @solidity memory-safe-assembly
            assembly {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
                return (address(0));
            }

            // If the signature is valid (and not malleable), return the signer address
            address signer = ecrecover(hash, v, r, s);
            if (signer == address(0)) {
                return (address(0));
            }

            return (signer);
        } else {
            return (address(0));
        }
    }

    /**
      * toBytesPrefixed
      * @dev prefix a bytes32 value with "\x19Ethereum Signed Message:"
      * and hash the result
      */
    function toBytesPrefixed(bytes32 hash)
    internal
    pure
    returns (bytes32)
    {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
    }
}
