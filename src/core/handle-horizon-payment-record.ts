import { Horizon } from "stellar-sdk";
import chalk from "chalk";
import { HorizonPaymentRecord } from "./types.ts";
import { isPaymentOpRecord } from "../utils/is-payment-op-record.ts";
import { isSACPaymentRecord } from "../utils/is-sac-payment-record.ts";

/**
 * Separate between the different payment types that can
 * be received from this Horizon endpoint and handle them
 * accordingly.
 *
 * Here we're focusing on native payment operations and
 * SAC (Soroban Asset Contract) payments via InvokeHostFunction.
 */
export const handlePaymentRecord = (
  payment: HorizonPaymentRecord,
  monitoredAddr: string
) => {
  if (isPaymentOpRecord(payment)) handleNativePayment(payment, monitoredAddr);

  if (isSACPaymentRecord(payment)) handleSACPayment(payment, monitoredAddr);
};

/**
 * Native payment operations are simpler to handle.
 * We just check the related fields and process accordingly.
 */
const handleNativePayment = (
  payment: Horizon.ServerApi.PaymentOperationRecord,
  monitoredAddr: string
) => {
  // Only process if this is an incoming payment
  if (payment.to !== monitoredAddr) {
    return;
  }
  console.log(chalk.blue("\nPAYMENT OPERATION RECEIVED!"));

  processPaymentRecord({
    from: payment.from,
    to: payment.to,
    amount: payment.amount,
    assetCode: payment.asset_code,
    muxedId: payment.to_muxed_id,
  });
};

/**
 * Handles the SAC payment record by verifying the
 * balance changes and processing incoming payments.
 */
const handleSACPayment = (
  payment: Horizon.ServerApi.InvokeHostFunctionOperationRecord,
  monitoredAddr: string
) => {
  for (const balanceChange of payment.asset_balance_changes) {
    // Only process if this is an incoming payment
    if (balanceChange.to !== monitoredAddr) {
      return;
    }

    console.log(chalk.blue("\n> SAC PAYMENT RECEIVED!"));

    processPaymentRecord({
      from: balanceChange.from,
      to: balanceChange.to,
      amount: balanceChange.amount,
      assetCode: balanceChange.asset_code,
      muxedId: balanceChange.destination_muxed_id,
    });
  }
};

/**
 *  Here the payment record would be processed. In this example,
 *  we just log the details to the console.
 */
const processPaymentRecord = ({
  from,
  to,
  amount,
  assetCode,
  muxedId,
}: {
  from: string;
  to: string;
  amount: string;
  assetCode?: string;
  muxedId?: string;
}) => {
  const code = assetCode !== undefined ? assetCode : "XLM";

  console.log(chalk.blue(` From: ${chalk.green(from)}`));
  console.log(chalk.blue(` To: ${chalk.green(to)}`));
  console.log(chalk.blue(` Amount: ${chalk.green(amount)} ${code}`));
  // Handle muxed accounts
  if (muxedId !== undefined) {
    console.log(chalk.blue(` Muxed ID: ${muxedId}`));
    console.log(chalk.cyan("\nWaiting for new payments..."));
  }
};
