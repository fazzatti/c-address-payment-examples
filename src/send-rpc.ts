import {
  getTypeArg,
  getTypeText,
  TransferTypes,
} from "./utils/get-type-arg.ts";
import chalk from "chalk";
import { assembleTransferOperation } from "./core/assemble-transfer-operation.ts";
import { transferRPC } from "./core/rpc-transaction.ts";

//
// Identify the selected configuration for sending the transfer
// based on the cmd args provided when invoking this script.
//
const supported: TransferTypes[] = ["g2g", "g2m", "g2c", "c2c", "c2g", "c2m"];
const sendType = getTypeArg(supported);
console.log(
  chalk.bgBlue.bold(
    "\nSending Payment via RPC: ",
    chalk.blue(getTypeText(sendType))
  )
);

// Given the cmd arg provided a transfer invocation operation is
// assembled and returned along with the source keys. This assembling
// process is the same for both RPC and Horizon sending methods.
const { operation, sourceKeys } = await assembleTransferOperation(
  sendType,
  false
);

// Now the transfer is assembled into a transaction and sent via RPC
await transferRPC(operation, sourceKeys).catch((error: Error) => {
  console.error("Error during transfer:", chalk.red(error.message), error);
  Deno.exit(1);
});
