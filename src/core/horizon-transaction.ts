import { config } from "../config/env.ts";
import { Keypair, TransactionBuilder, xdr } from "stellar-sdk";
import chalk from "chalk";

export const transferHorizon = async (
  operation: xdr.Operation,
  sourceKeys: Keypair
) => {
  const { networkConfig, horizon } = config;

  const sourceAccount = await horizon.loadAccount(sourceKeys.publicKey());

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase: networkConfig.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(45)
    .build();

  tx.sign(sourceKeys);

  const res = await horizon.submitTransaction(tx);

  console.log("Transfer successfull:", chalk.green(res.hash));
};
