import { Keypair } from "stellar-sdk";
import { config } from "./config/env.ts";
import { Settings } from "./config/settings.types.ts";
import { readFromJsonFile } from "./utils/io.ts";
import { handlePaymentRecord } from "./core/handle-horizon-payment-record.ts";
import chalk from "chalk";

const { horizon, ioConfig } = config;

const settings = await readFromJsonFile<Settings>(ioConfig.settings);

const gAccountSigner = Keypair.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = Keypair.fromSecret(settings.mAccountSecretKey);

// The address we want to monitor for incoming payments.
// The records will only be processed if these addresses
// are the receiver end of the payment.
const monitoredAddresses = [
  gAccountSigner.publicKey(),
  mAccountSigner.publicKey(),
];

console.log(chalk.bgBlue.bold("=== STARTING HORIZON PAYMENT INGESTION ==="));
const monitorPayments = async (): Promise<void> => {
  console.log(
    `Monitoring for payments to: ${chalk.green(
      "\n  - " + monitoredAddresses.join("\n  - ")
    )}\n`
  );

  // Monitor payments for each address
  for (const address of monitoredAddresses) {
    console.log(chalk.gray(`Starting stream for ${address}...`));

    // Set up the payment stream for the address
    await horizon
      .payments()
      .forAccount(address)
      .cursor("now")
      .stream({
        onmessage: (payment) => {
          handlePaymentRecord(payment, address);
        },
        onerror: (error) => {
          console.error(chalk.red(`Stream error for ${address}:`), error);
          console.log(chalk.yellow("Reconnecting..."));
        },
      });

    console.log(chalk.green(`Stream active for ${address}`));
  }
  console.log(chalk.cyan("\nWaiting for new payments..."));
};

// Start monitoring
monitorPayments().catch((error) => {
  console.error(chalk.red("Failed to start payment monitoring:"), error);
});
