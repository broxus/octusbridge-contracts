pragma ton-solidity >= 0.39.0;


import './../../utils/TransferUtils.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "./../event-configuration-contracts/EthereumEventConfiguration.sol";
import "./../interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol";


contract EthereumEventConfigurationFactory is TransferUtils, RandomNonce {
    TvmCell public configurationCode;

    constructor(TvmCell _configurationCode) public {
        tvm.accept();

        configurationCode = _configurationCode;
    }

    function deploy(
        address _owner,
        IEthereumEventConfiguration.BasicConfiguration basicConfiguration,
        IEthereumEventConfiguration.EthereumEventConfiguration networkConfiguration
    ) external view reserveAtLeastTargetBalance {
        TvmCell _meta;

        new EthereumEventConfiguration{
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
        IEthereumEventConfiguration.BasicConfiguration basicConfiguration,
        IEthereumEventConfiguration.EthereumEventConfiguration networkConfiguration
    ) external view returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: EthereumEventConfiguration,
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
