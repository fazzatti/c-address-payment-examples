import { getTypeArg, getTypeText } from "./utils/get-type-arg.ts";
import chalk from "chalk";
import { transferHorizon } from "./core/horizon-transaction.ts";
import { assembleTransferOperation } from "./core/assemble-transfer-operation.ts";

const sendType = getTypeArg();

console.log(
  chalk.bgGreen.bold(
    "\nSending Payment via Horizon: ",
    chalk.blue(getTypeText(sendType))
  )
);

const { operation, sourceKeys } = await assembleTransferOperation(
  sendType,
  true
);

await transferHorizon(operation, sourceKeys).catch((error: Error) => {
  console.error("Error during transfer:", chalk.red(error.message));

  console.error(error);

  Deno.exit(1);
});
