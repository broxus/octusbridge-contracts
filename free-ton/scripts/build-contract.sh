source ./../env/freeton.env;

echo "> Compile TON contracts using solc";

cd ./build/ || exit;

compile_contract_by_name() {
  echo ">> Compile $1.sol";
  solc-ton ./../contracts/$1.sol;

  echo ">> Link $1.sol";
  res_log=`tvm_linker compile ./$1.code --lib $TVM_STDLIB_SOL_PATH`;
  [[ $res_log =~ [[:space:]]*([a-z0-9]+\.tvc) ]] && tvc_file=${BASH_REMATCH[1]};

  echo ">> TVC file: $tvc_file";

  echo ">> Encode $1 tvc into base64";
  base64 < $tvc_file > $1.base64

  echo "";
}

compile_contract_by_name "Bridge";
compile_contract_by_name "TargetExample";
compile_contract_by_name "EventProxyExample";
compile_contract_by_name "TonToEthEvent";
compile_contract_by_name "EthToTonEvent";
compile_contract_by_name "EventRoot";
compile_contract_by_name "VotingForChangeConfig";
compile_contract_by_name "VotingForAddEventType";
compile_contract_by_name "VotingForRemoveEventType";
compile_contract_by_name "Giver";
