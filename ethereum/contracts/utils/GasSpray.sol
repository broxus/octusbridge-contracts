// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "../multivault/interfaces/multivault/IMultiVaultFacetSettings.sol"; 


contract GasSpray {
    address public multivault;
    address[] public spenders;

    constructor(
        address _multivault,
        address[] memory _spenders
    ) {
        multivault = _multivault;
        spenders = _spenders;
    }

    function setSpenders(
        address[] memory _spenders
    ) external {
        address governance = IMultiVaultFacetSettings(multivault).governance(); 
 
        require(msg.sender == governance); 

        spenders = _spenders;
    }

    function spray() external payable {
        uint amount = address(this).balance / spenders.length;

        for (uint i = 0; i < spenders.length; i++) {
            (bool success,) = spenders[i].call{value: amount}("");
        }
    }

    receive() external payable {
        if (spenders.length == 0) return;

        uint pointer = uint(blockhash(block.number)) % spenders.length;

        address spender = spenders[pointer];

        (bool success,) = spender.call{value: address(this).balance}("");
    }
}