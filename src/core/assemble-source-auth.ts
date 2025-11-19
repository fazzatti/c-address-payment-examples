import { Address, nativeToScVal, xdr } from "stellar-sdk";

/**
 * Assembles an authorization entry for the source account.
 * When using RPC, this is automatically handled as a result
 * of the transaction simulation.
 *
 * For Horizon, this process needs to be done manually as there
 * isn't a simulation endpoint available.
 */
export const assembleSourceAuthEntry = (
  from: string,
  to: string,
  amount: bigint,
  assetContractId: string
): xdr.SorobanAuthorizationEntry => {
  const scValAccount = nativeToScVal(from, { type: "address" });
  const assetContractAddress = new Address(assetContractId);
  const authEntry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: assetContractAddress.toScAddress(),
            functionName: "transfer",
            args: [
              scValAccount,
              nativeToScVal(to, { type: "address" }),
              nativeToScVal(amount.toString(), { type: "i128" }),
            ],
          })
        ),
      subInvocations: [],
    }),
  });

  return authEntry;
};
