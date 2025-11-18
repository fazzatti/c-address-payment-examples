import { getArgs } from "./get-args.ts";

export const transferTypes = [
  "g2g",
  "g2m",
  "g2c",
  "c2g",
  "c2m",
  "c2c",
] as const;
export type TransferTypes = (typeof transferTypes)[number];

export const getTypeArg = (): TransferTypes => {
  const cmdArgs = getArgs(1);

  if (cmdArgs && cmdArgs.length && cmdArgs.length === 1) {
    const normalizedArg = cmdArgs[0].toLowerCase();
    if (transferTypes.includes(normalizedArg as TransferTypes)) {
      return normalizedArg as TransferTypes;
    } else {
      throw new Error(
        `Invalid type argument: ${
          cmdArgs[0]
        }. Must be one of: ${transferTypes.join(", ")}`
      );
    }
  } else
    throw new Error(
      `Invalid command line arguments. Provide the address type as one fo the following: ${transferTypes.join(
        ", "
      )}`
    );
};

export const getTypeText = (type: TransferTypes): string => {
  const typeMap: { [key: string]: string } = {
    g: "G-Account",
    m: "Muxed Account",
    c: "Smart Wallet",
    "2": "to",
  };

  return type
    .split("")
    .map((char) => typeMap[char])
    .join(" ");
};
