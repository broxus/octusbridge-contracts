pragma ton-solidity >= 0.39.0;


import './../../utils/TransferUtils.sol';
import "./../event-configuration-contracts/TonEventConfiguration.sol";
import "./../interfaces/event-configuration-contracts/ITonEventConfiguration.sol";


contract TonEventConfigurationFactory is TransferUtils {
    TvmCell public configurationCode;

    constructor(TvmCell _configurationCode) public {
        tvm.accept();

        configurationCode = _configurationCode;
    }

    function deploy(
        address _owner,
        ITonEventConfiguration.BasicConfiguration basicConfiguration,
        ITonEventConfiguration.TonEventConfiguration networkConfiguration
    ) external reserveBalance {
        TvmCell _meta;

        new TonEventConfiguration{
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
        ITonEventConfiguration.BasicConfiguration basicConfiguration,
        ITonEventConfiguration.TonEventConfiguration networkConfiguration
    ) external view returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: TonEventConfiguration,
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