import { Horizon } from "stellar-sdk";
import { HorizonPaymentRecord } from "../core/types.ts";

export const isPaymentOpRecord = (
  payment: HorizonPaymentRecord
): payment is Horizon.ServerApi.PaymentOperationRecord => {
  return payment.type_i === Horizon.HorizonApi.OperationResponseTypeI.payment;
};
