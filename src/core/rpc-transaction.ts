import { config } from "../config/env.ts";
import { Keypair, TransactionBuilder, xdr } from "stellar-sdk";
import { sendTransaction } from "../utils/send-transaction-fn.ts";

/**
 * Given a fully configured operation and source keys,
 * assembles and sends the transaction via RPC.
 */
export const transferRPC = async (
  operation: xdr.Operation,
  sourceKeys: Keypair
) => {
  const { networkConfig, rpc } = config;

  // Load the provided source account from the RPC server
  // to be used as the transaction source.
  //
  // This step ensures the account sequence number is up to date.
  const sourceAccount = await rpc.getAccount(sourceKeys.publicKey());

  // Assemble the transaction with the provided operation
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase: networkConfig.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(45)
    .build();

  // Prepare the transaction via the RPC server
  //
  // This step triggers a simulation of the transaction
  // execution on the RPC server. Based on the output of
  // the simulation, the SDK automatically updates the
  // transaction with the resources, footprint and
  // resource fee needed for a successful execution.
  //
  // While this step is autoamtically handled by this
  // SDK method, when using the Horizon API, it would
  // be necessary to manually assemble these parameters.
  //
  // See the 'transferHorizon' function for more details.
  const preparedTx = await rpc.prepareTransaction(tx);

  // Sign the transaction envelope with the source account keys
  preparedTx.sign(sourceKeys);

  // Send the signed transaction via the RPC server
  // and monitor its status by polling.
  await sendTransaction(preparedTx);
};
