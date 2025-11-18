import { getArgs } from "./get-args.ts";

export const getAddressArg = (): "muxed" | "native" => {
  const cmdArgs = getArgs(1);
  let addressType: "muxed" | "native";
  if (cmdArgs && cmdArgs.length && cmdArgs.length === 1) {
    switch (cmdArgs[0]) {
      case "muxed":
        addressType = "muxed";
        break;
      case "native":
        addressType = "native";
        break;
      default:
        throw new Error(
          `Invalid address type: ${cmdArgs[0]}. Supported types are 'muxed' and 'native'.`
        );
    }
  } else
    throw new Error(
      "Invalid command line arguments. Provide the address type: 'muxed' or 'native'."
    );

  return addressType;
};
