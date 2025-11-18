export const getArgs = (nOfArgs: number, optional?: boolean): string[] => {
  const args = Deno.args;

  if (!optional && (!args || args.length < nOfArgs)) {
    throw new Error(`Expected at least ${nOfArgs} arguments`);
  }

  return args;
};
