//pragma ton-solidity >= 0.39.0;
//
//import './TestWallet.sol';
//import "./../staking/interfaces/IRootTokenContract.sol";
//import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
//
//
//
//contract WalletFabric {
//    uint public static nonce;
//    TvmCell public wallet_code;
//    uint wallet_nonce = 0;
//
//    event WalletsCreated(address[] wallets);
//
//    constructor(TvmCell _wallet_code) public {
//        tvm.accept();
//
//        wallet_code = _wallet_code;
//    }
//
//    function deployWallets(uint[] owners, uint128 initial_balance) public {
//        address[] wallets = new address[](owners.length);
//
//        for (uint i = 0; i < owners.length; i++) {
//            TvmCell _init_data = tvm.buildStateInit({
//                contr: TestWallet,
//                varInit: {_randomNonce: wallet_nonce, fabric: address(this)},
//                pubkey: 0,
//                code: wallet_code
//            });
//            wallets[i] = new TestWallet{
//                stateInit: _init_data,
//                value: initial_balance,
//                flag: 0
//            }(owners[i]);
//            wallet_nonce += 1;
//        }
//        emit WalletsCreated(wallets);
//    }
//
//    function deployTokenWallets(address token_root, address[] owners, uint128 amount) public {
//        for (uint i = 0; i < owners.length; i++) {
//            IRootTokenContract(token_root).deployWallet{value: 2 ton}(amount, 1 ton, 0, owners[i], owners[i]);
//        }
//    }
//}
