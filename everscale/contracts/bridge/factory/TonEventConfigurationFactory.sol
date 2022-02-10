pragma ton-solidity >= 0.39.0;


import './../../utils/TransferUtils.sol';
import "./../event-configuration-contracts/EverscaleEventConfiguration.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleEventConfiguration.sol";


contract EverscaleEventConfigurationFactory is TransferUtils {
    TvmCell public configurationCode;

    constructor(TvmCell _configurationCode) public {
        tvm.accept();

        configurationCode = _configurationCode;
    }

    function deploy(
        address _owner,
        IEverscaleEventConfiguration.BasicConfiguration basicConfiguration,
        IEverscaleEventConfiguration.EverscaleEventConfiguration networkConfiguration
    ) external reserveBalance {
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