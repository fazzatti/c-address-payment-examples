import {
  getTypeArg,
  getTypeText,
  TransferTypes,
} from "./utils/get-type-arg.ts";
import chalk from "chalk";
import { transferHorizon } from "./core/horizon-transaction.ts";
import { assembleTransferOperation } from "./core/assemble-transfer-operation.ts";

//
// Identify the selected configuration for sending the transfer
// based on the cmd args provided when invoking this script.
//
const supported: TransferTypes[] = ["g2g", "g2m", "g2c"];
const sendType = getTypeArg(supported);
console.log(
  chalk.bgGreen.bold(
    "\nSending Payment via Horizon: ",
    chalk.blue(getTypeText(sendType))
  )
);

// Given the cmd arg provided a transfer invocation operation is
// assembled and returned along with the source keys. This assembling
// process is the same for both RPC and Horizon sending methods.
//
// Here the only difference is that we also return additional detais
// of the transfer to help assembling the SorobanTransactionData
// when sending via Horizon, during the next step.
const { operation, sourceKeys, contractId, from, to } =
  await assembleTransferOperation(sendType, true);

// Now the transfer is assembled into a transaction and sent via Horizon
await transferHorizon(operation, sourceKeys, contractId, from, to).catch(
  (error: Error) => {
    console.error("Error during transfer:", chalk.red(error.message), error);
    Deno.exit(1);
  }
);
