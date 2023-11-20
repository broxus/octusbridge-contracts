// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "./facets/DiamondCutFacet.sol";
import "./facets/DiamondLoupeFacet.sol";
import "./facets/DiamondOwnershipFacet.sol";

import "./storage/DiamondStorage.sol";


contract Diamond {
    // No collision with MultiVaultFacetSettings.initialize because of the different parameters
    function initialize(address _contractOwner) external {
        DiamondStorage.enforceNotInitialized();

        DiamondStorage.setContractOwner(_contractOwner);
        DiamondStorage.addDiamondFunctions(
            address(new DiamondCutFacet()),
            address(new DiamondLoupeFacet()),
            address(new DiamondOwnershipFacet())
        );
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        DiamondStorage.Storage storage ds;
        bytes32 position = DiamondStorage.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {
        revert();
    }
}
