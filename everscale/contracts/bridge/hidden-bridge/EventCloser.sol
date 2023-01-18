pragma ton-solidity >= 0.39.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/access/ExternalOwner.sol';
import "@broxus/contracts/contracts/utils/RandomNonce.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

import "./../../utils/TransferUtils.sol";

import "./../event-contracts/base/EverscaleBaseEvent.sol";


contract EventCloser is ExternalOwner, RandomNonce, TransferUtils {
    address public guardian;
    address public deployer;

    constructor(
        address _guardian,
        uint _owner,
        address _deployer
    ) public {
        tvm.accept();

        guardian = _guardian;
        setOwnership(_owner);
        deployer = _deployer;
    }

    function _targetBalance() internal pure override returns (uint128) {
        return 10 ton;
    }

    function close(
        address[] events
    ) external onlyOwner {
        tvm.accept();

        for (address e: events) {
            EverscaleBaseEvent(e).close{
                bounce: true,
                flag: 0,
                value: 0.1 ton
            }();
        }
    }

    receive() external reserveTargetBalance {
        deployer.transfer({
            bounce: false,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        });
    }
}
