/** Progress redraws with `\r`, which only makes sense in a terminal, not in a log. */
export function writeProgress(text: string): void {
  if (process.stdout.isTTY) {
    process.stdout.write(text);
  }
}
