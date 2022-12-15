pragma ton-solidity >= 0.39.0;

pragma AbiHeader expire;

import '@broxus/contracts/contracts/access/ExternalOwner.sol';
import "@broxus/contracts/contracts/utils/RandomNonce.sol";

import "./../interfaces/event-contracts/IEthereumEvent.sol";
import "./../interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol";


contract EventDeployer is ExternalOwner, RandomNonce {
    address public guardian;

    constructor(
        address _guardian,
        uint _owner
    ) public {
        tvm.accept();

        guardian = _guardian;
        setOwnership(_owner);
    }

    struct DeployRequest {
        address configuration;
        IEthereumEvent.EthereumEventVoteData[] eventsVoteData;
        uint128[] values;
        uint128 value;
    }

    modifier onlyGuardian() {
        require(msg.sender == guardian);

        _;
    }

    function drain(
        address receiver,
        uint128 value
    ) external onlyGuardian {
        receiver.transfer({
            value: value,
            flag: 0,
            bounce: true
        });
    }

    function deployEvents(
        DeployRequest[] requests
    ) external onlyOwner {
        for (DeployRequest request: requests) {
            IEthereumEventConfiguration(request.configuration).deployEvents{
                value: request.value,
                bounce: true,
                flag: 0
            }(request.eventsVoteData, request.values);
        }
    }
}
