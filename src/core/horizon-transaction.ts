import { config } from "../config/env.ts";
import { Keypair, TransactionBuilder, xdr } from "stellar-sdk";
import chalk from "chalk";
import { getSorobanData } from "./get-sorobandata.ts";

/**
 * Given a fully configured operation, source keys,
 * and transfer details, assembles and sends the
 * transaction via Horizon.
 */
export const transferHorizon = async (
  operation: xdr.Operation,
  sourceKeys: Keypair,
  contractId: string,
  from: string,
  to: string
) => {
  const { networkConfig, horizon } = config;

  // Load the provided source account from the Horizon API
  // to be used as the transaction source.
  //
  // This step ensures the account sequence number is up to date.
  const sourceAccount = await horizon.loadAccount(sourceKeys.publicKey());

  // When sending a smart contract transaction via Horizon,
  // you need to manually assemble and include the SorobanTransactionData
  // in the transaction. This is normally handled automatically based on the
  // output of the simulateTransaction endpoint from the RPC server.
  const sorobanData = getSorobanData(contractId, from, to);

  // Assemble the transaction with the provided operation
  // and the manually assembled SorobanTransactionData.
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase: networkConfig.networkPassphrase,
    sorobanData: sorobanData,
  })
    .addOperation(operation)
    .setTimeout(45)
    .build();

  // Sign the transaction envelope with the source account keys
  tx.sign(sourceKeys);

  // Send the signed transaction via the Horizon API
  // and waits for it to resolve with a final status.
  const res = await horizon.submitTransaction(tx);

  console.log("Transfer successfull:", chalk.green(res.hash));
};
