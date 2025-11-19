import { Address, xdr } from "stellar-sdk";
import { config } from "./config/env.ts";
import { Api } from "stellar-sdk/rpc";
import { Settings } from "./config/settings.types.ts";
import { readFromJsonFile } from "./utils/io.ts";
import { LocalSigner } from "@colibri/core";
import chalk from "chalk";

const { rpc, assetContractId, ioConfig } = config;

const settings = await readFromJsonFile<Settings>(ioConfig.settings);
const gAccountSigner = LocalSigner.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = LocalSigner.fromSecret(settings.mAccountSecretKey);
const smartWalletContractId = settings.smartWalletContractId;

// The address we want to monitor for incoming payments
const monitoredAddresses = [
  new Address(gAccountSigner.publicKey()),
  new Address(mAccountSigner.publicKey()),
  new Address(smartWalletContractId),
];

// Paging state for event polling (similar to useSubscription hook)
let lastLedgerStart: number | undefined;
let pagingToken: string | undefined;

const eventsChecked: string[] = [];

console.log(chalk.bgBlue.bold("=== STARTING RPC EVENT INGESTION ==="));

async function pollForTransfers() {
  // Set starting ledger if not set (get the latest ledger as starting point)
  if (!lastLedgerStart) {
    const latestLedger = await rpc.getLatestLedger();
    lastLedgerStart = latestLedger.sequence;
  }
  console.log(
    `> Monitoring transfers for ledger: ${chalk.blueBright(lastLedgerStart)}`
  );

  // Build request based on pagination state
  const filters = [
    {
      contractIds: [assetContractId],
      // Filter for transfer events to the monitored address
      // Using wildcards (*) to match any sender and asset
      // Event structure: ["transfer", fromAddress, toAddress, assetName]
      topics: [
        [xdr.ScVal.scvSymbol("transfer").toXDR("base64"), "*", "*", "*"],
      ],
      type: "contract" as const,
    },
  ];

  // Get events for "transfer" topic from the native asset contract
  let response;
  if (pagingToken) {
    response = await rpc.getEvents({ cursor: pagingToken, filters, limit: 10 });
  } else {
    // Get latest ledger to use as endLedger
    const latestLedger = await rpc.getLatestLedger();
    response = await rpc.getEvents({
      startLedger: lastLedgerStart,
      endLedger: latestLedger.sequence,
      filters,
      limit: 10,
    });
  }

  // Update paging tokens for next poll
  if (response.latestLedger) {
    lastLedgerStart = response.latestLedger;
  }

  // Process events and check for payments to our monitored address
  if (response.events && response.events.length > 0) {
    response.events.forEach((event) => {
      try {
        if (!eventsChecked.includes(event.id)) parseEvent(event);
      } catch (error) {
        console.error("Error processing event:", error);
      }
    });

    // Update cursor from the response for next poll
    if (response.cursor) {
      pagingToken = response.cursor;
    }
  } else {
    // No events found, reset paging token
    pagingToken = undefined;
  }

  // Continue polling after 5 seconds
  setTimeout(pollForTransfers, 5000);
}

/**
 *  Parses an event and checks if it's a payment to the monitored address.
 *  If so, processes the payment record.
 */
const parseEvent = (event: Api.EventResponse) => {
  const topics = event.topic;

  eventsChecked.push(event.id);
  if (topics && topics.length >= 3) {
    // Extract recipient address from event topics
    const toAddress = Address.fromScAddress(topics[2].address()).toString();

    // Check if the payment is to our monitored address
    if (monitoredAddresses.some((addr) => toAddress === addr.toString())) {
      console.log(chalk.blue("\n> SAC EVENT RECEIVED!"));

      const isMuxed = event.value.switch().name === xdr.ScValType.scvMap().name;

      let amount: string = "";
      let muxedId: string | undefined;

      //
      // When the receiver is a muxed account, the event value
      // is a map containing both the amount and the muxed ID.
      //
      // Otherwise, the event value is just the amount as i128.
      //
      if (isMuxed) {
        event.value
          .map()
          ?.entries()
          .forEach(([_key, entry]) => {
            if (entry.val().switch().name === xdr.ScValType.scvI128().name) {
              amount = `${entry.val().i128().lo().toBigInt()}`;
              return;
            }
            if (entry.val().switch().name === xdr.ScValType.scvU64().name) {
              muxedId = `${entry.val().u64().toBigInt()}`;
              return;
            }
            throw new Error("Unexpected map entry in muxed payment event");
          });
      } else {
        amount = `${event.value.i128().lo().toBigInt()}`;
      }

      processEvent({
        ledger: event.ledger.toString(),
        from: Address.fromScAddress(topics[1].address()).toString(),
        to: Address.fromScAddress(topics[2].address()).toString(),
        amount: amount,
        muxedId: muxedId,
      });
    }
  }
};

/**
 *  Here the payment record would be processed. In this example,
 *  we just log the details to the console.
 */
const processEvent = ({
  ledger,
  from,
  to,
  amount,
  muxedId,
}: {
  ledger: string;
  from: string;
  to: string;
  amount: string;
  muxedId?: string;
}) => {
  const code = "XLM"; // We are only monitoring the XLM contract id

  console.log(chalk.blue(` Ledger: ${chalk.green(ledger)}`));
  console.log(chalk.blue(` From: ${chalk.green(from)}`));
  console.log(chalk.blue(` To: ${chalk.green(to)}`));
  console.log(chalk.blue(` Amount: ${chalk.green(amount)} ${code}`));
  // Handle muxed accounts
  if (muxedId !== undefined) {
    console.log(chalk.blue(` Muxed ID: ${muxedId}`));
  }
  console.log(chalk.cyan("\nWaiting for new payments..."));
};

// Start monitoring for payment events
console.log(
  `Monitoring for payments involving: ${chalk.green(
    "\n.   - " +
      monitoredAddresses.map((addr) => addr.toString()).join("\n.   - ")
  )}`
);
pollForTransfers();
