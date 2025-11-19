import { Horizon } from "stellar-sdk";
import { HorizonPaymentRecord } from "../core/types.ts";

export const isSACPaymentRecord = (
  payment: HorizonPaymentRecord
): payment is Horizon.ServerApi.InvokeHostFunctionOperationRecord => {
  return (
    payment.type_i ===
    Horizon.HorizonApi.OperationResponseTypeI.invokeHostFunction
  );
};
