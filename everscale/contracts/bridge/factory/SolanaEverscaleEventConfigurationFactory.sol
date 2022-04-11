pragma ton-solidity >= 0.39.0;


import './../../utils/TransferUtils.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "./../event-configuration-contracts/SolanaEverscaleEventConfiguration.sol";
import "./../interfaces/event-configuration-contracts/ISolanaEverscaleEventConfiguration.sol";


contract SolanaEverscaleEventConfigurationFactory is TransferUtils, RandomNonce {
    TvmCell public configurationCode;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    constructor(TvmCell _configurationCode) public {
        tvm.accept();

        configurationCode = _configurationCode;
    }

    function deploy(
        address _owner,
        ISolanaEverscaleEventConfiguration.BasicConfiguration basicConfiguration,
        ISolanaEverscaleEventConfiguration.SolanaEverscaleEventConfiguration networkConfiguration
    ) external view reserveMinBalance(MIN_CONTRACT_BALANCE) {
        TvmCell _meta;

        new SolanaEverscaleEventConfiguration{
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
        ISolanaEverscaleEventConfiguration.BasicConfiguration basicConfiguration,
        ISolanaEverscaleEventConfiguration.SolanaEverscaleEventConfiguration networkConfiguration
    ) external view returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: SolanaEverscaleEventConfiguration,
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