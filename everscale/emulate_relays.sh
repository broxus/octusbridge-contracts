for (( i=0; i < 10000; i+=1 ))
do
  npx locklift run --script scripts/transfers/1-process-ever-evm-native.ts --network devnet1 --disable-build
  npx locklift run --script scripts/transfers/2-process-evm-ever-native.ts --network devnet1 --disable-build
  npx locklift run --script scripts/transfers/3-process-evm-ever-alien.ts --network devnet1 --disable-build
  npx locklift run --script scripts/transfers/4-process-ever-evm-alien.ts --network devnet1 --disable-build
done
