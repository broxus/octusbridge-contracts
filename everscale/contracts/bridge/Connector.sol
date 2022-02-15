pragma ton-solidity >= 0.39.0;

import "./../utils/ErrorCodes.sol";
import "./interfaces/IConnector.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';

/**
    @title Connector contract is used for connecting event configurations to the
    basic Bridge contract.
*/
contract Connector is IConnector, InternalOwner {
    address static bridge;
    uint64 static id;

    address public eventConfiguration;
    bool public enabled;

    constructor(
        address _eventConfiguration,
        address _owner
    ) public {
        require(bridge == msg.sender, ErrorCodes.DEPLOYER_NOT_BRIDGE);

        eventConfiguration = _eventConfiguration;
        enabled = false;

        setOwnership(_owner);
    }

    /**
        @dev Enable event configuration
    */
    function enable() external override onlyOwner {
        enabled = true;

        emit Enabled();
    }

    /**
        @dev Get connector details
        @return _id Connector id
        @return _eventConfiguration Corresponding event configuration address
        @return _enabled Event configuration status
    */
    function getDetails() external view returns(
        uint64 _id,
        address _eventConfiguration,
        bool _enabled
    ) {
        return (
            id,
            eventConfiguration,
            enabled
        );
    }
}
