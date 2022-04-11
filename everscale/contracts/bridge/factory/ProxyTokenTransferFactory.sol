pragma ton-solidity >= 0.39.0;


import './../../utils/TransferUtils.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "./../proxy/EthereumProxyTokenTransfer.sol";


contract ProxyTokenTransferFactory is TransferUtils, RandomNonce {
    TvmCell public proxyCode;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    constructor(TvmCell _proxyCode) public {
        tvm.accept();

        proxyCode = _proxyCode;
    }

    function deploy(address _owner, uint _randomNonce) external reserveMinBalance(MIN_CONTRACT_BALANCE) {
        new EthereumProxyTokenTransfer{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: proxyCode,
            pubkey: 0,
            varInit: {
                _randomNonce: _randomNonce
            }
        }(_owner);
    }

    function deriveProxyAddress(
        uint _randomNonce
    ) external view returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: EthereumProxyTokenTransfer,
            varInit: {
                _randomNonce: _randomNonce
            },
            pubkey: 0,
            code: proxyCode
        });

        return address(tvm.hash(stateInit));

    }
}