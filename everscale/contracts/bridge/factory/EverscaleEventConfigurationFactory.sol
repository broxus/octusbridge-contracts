pragma ton-solidity >= 0.39.0;


import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import './../../utils/TransferUtils.sol';
import "./../event-configuration-contracts/EverscaleEventConfiguration.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleEventConfiguration.sol";


contract EverscaleEventConfigurationFactory is TransferUtils, RandomNonce {
    TvmCell public configurationCode;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    constructor(TvmCell _configurationCode) public {
        tvm.accept();

        configurationCode = _configurationCode;
    }

    function deploy(
        address _owner,
        IEverscaleEventConfiguration.BasicConfiguration basicConfiguration,
        IEverscaleEventConfiguration.EverscaleEventConfiguration networkConfiguration
    ) external view reserveAtLeastTargetBalance {
        TvmCell _meta;

        new EverscaleEventConfiguration{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: configurationCode,
            pubkey: 0,
            varInit: {
                basicConfiguration: basicConfiguration,
                networkConfiguration: networkConfiguration
            }
        }(_owner, _meta);
    }

    function deriveConfigurationAddress(
        IEverscaleEventConfiguration.BasicConfiguration basicConfiguration,
        IEverscaleEventConfiguration.EverscaleEventConfiguration networkConfiguration
    ) external view returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: EverscaleEventConfiguration,
            varInit: {
                basicConfiguration: basicConfiguration,
                networkConfiguration: networkConfiguration
            },
            pubkey: 0,
            code: configurationCode
        });

        return address(tvm.hash(stateInit));
    }
}
