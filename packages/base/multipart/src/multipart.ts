import { split } from "./split";

const MAX_HEADER_SIZE = 8 * 1024;
const MAX_HEADER_COUNT = 32;
const MAX_PARTS = 1024;

export { parsePartHeaders as parseMultipart };

async function* parsePartHeaders(
  input: AsyncIterable<Uint8Array>,
  boundaryText: string,
): AsyncIterable<Headers | Uint8Array> {
  let totalParts = 0;
  let state: "header" | "body" = "header";
  let crLfState: "none" | "cr" | "cr-lf" | "cr-lf-cr" = "none";

  let headers = new Headers();
  let headerCount = 0;
  const lastHeader = new Uint8Array(MAX_HEADER_SIZE);
  let lastHeaderOffset = 0;

  const stack: Uint8Array[] = [];
  const parts = trimTrailingCrLf(input, boundaryText)[Symbol.asyncIterator]();

  for (;;) {
    let part: Uint8Array | "part-boundary";
    if (stack.length) {
      part = stack.pop()!;
    } else {
      const next = await parts.next();
      if (next.done) {
        break;
      }
      part = next.value;
    }

    if (part === "part-boundary") {
      totalParts++;
      if (totalParts > MAX_PARTS) {
        throw new Error("Too many parts");
      }

      if (state === "header") {
        yield headers;
        headers = new Headers();
        headerCount = 0;
        lastHeaderOffset = 0;

        crLfState = "none";
      } else {
        state = "header";
      }
    } else if (state === "header") {
      loop: for (let i = 0; i < part.length; i++) {
        const byte = part[i];

        switch (crLfState) {
          case "none":
            if (byte === 13) {
              crLfState = "cr";
            }
            break;
          case "cr":
            if (byte === 10) {
              crLfState = "cr-lf";
              const lastHeaderText = new TextDecoder().decode(
                lastHeader.subarray(0, lastHeaderOffset - 1),
              );
              const [name, value] = lastHeaderText.split(": ", 2);
              headers.append(name, value.trim());
              headerCount++;
              if (headerCount >= MAX_HEADER_COUNT) {
                throw new Error("Too many headers");
              }
              lastHeaderOffset = 0;
              continue;
            } else {
              crLfState = "none";
            }
            break;
          case "cr-lf":
            if (byte === 13) {
              crLfState = "cr-lf-cr";
            } else {
              crLfState = "none";
            }
            break;
          case "cr-lf-cr":
            if (byte === 10) {
              yield headers;
              crLfState = "none";
              state = "body";
              headers = new Headers();
              headerCount = 0;
              lastHeaderOffset = 0;

              if (i + 1 < part.length) {
                stack.push(part.subarray(i + 1));
              }
              break loop;
            }
        }

        lastHeader[lastHeaderOffset++] = byte;
        if (lastHeaderOffset === lastHeader.length) {
          throw new Error("Header too long");
        }
      }
    } else if (part.length) {
      yield part;
    }
  }
}

export async function* trimTrailingCrLf(
  input: AsyncIterable<Uint8Array>,
  boundaryText: string,
): AsyncIterable<Uint8Array | "part-boundary"> {
  const buffered: Uint8Array[] = [];
  let state: "cr" | "crlf" | "none" = "none";

  for await (const chunk of splitMultipart(input, boundaryText)) {
    if (chunk !== "part-boundary") {
      if (!chunk.length) {
        continue;
      }

      if (chunk.length === 1) {
        if (chunk[0] === 13) {
          for (const oldChunk of buffered) {
            yield oldChunk;
          }
          state = "cr";
          buffered.length = 0;
          buffered.push(chunk);
        } else if (state === "cr" && chunk[0] === 10) {
          state = "crlf";
          buffered.push(chunk);
        } else {
          for (const oldChunk of buffered) {
            yield oldChunk;
          }
          yield chunk;
          state = "none";
          buffered.length = 0;
        }
      } else {
        if (chunk[chunk.length - 1] === 13) {
          state = "cr";
          buffered.push(chunk);
        } else if (
          chunk[chunk.length - 1] === 10 &&
          chunk[chunk.length - 2] === 13
        ) {
          state = "crlf";
          buffered.push(chunk);
        } else {
          for (const oldChunk of buffered) {
            yield oldChunk;
          }
          yield chunk;
          buffered.length = 0;
          state = "none";
        }
      }
    } else {
      if (state === "crlf") {
        if (buffered[buffered.length - 1].length === 1) {
          buffered.pop();
          if (buffered[buffered.length - 1].length === 1) {
            buffered.pop();
          } else {
            buffered[buffered.length - 1] = buffered[
              buffered.length - 1
            ].subarray(0, buffered[buffered.length - 1].length - 1);
          }
        } else {
          buffered[buffered.length - 1] = buffered[
            buffered.length - 1
          ].subarray(0, buffered[buffered.length - 1].length - 2);
        }

        for (const oldChunk of buffered) {
          yield oldChunk;
        }
      }
      yield "part-boundary";
      state = "none";
      buffered.length = 0;
    }
  }
}

async function* splitMultipart(
  input: AsyncIterable<Uint8Array>,
  boundaryText: string,
): AsyncIterable<Uint8Array | "part-boundary"> {
  const boundary = new TextEncoder().encode("--" + boundaryText);
  let partNo = 0;
  let state: "none" | "skip-space" | "skip-cr" | "skip-lf" | "dash1" = "none";

  for await (const part of split(input, boundary, "part-boundary" as const)) {
    let start = 0;
    if (partNo === 0 && part !== "part-boundary") {
      // Preamble, skip
      continue;
    } else if (part === "part-boundary") {
      if (partNo) yield "part-boundary";
      partNo++;
      state = "skip-space";
      continue;
    }

    if (state === "skip-space") {
      if (start < part.length && part[start] === 45) {
        state = "dash1";
        start++;
      } else {
        while (
          start < part.length &&
          (part[start] === 32 || part[start] === 9)
        ) {
          start++;
        }

        if (start < part.length) {
          state = "skip-cr";
        }
      }
    }

    if (state === "dash1") {
      if (part[start] === 45) {
        return;
      }

      if (start === part.length) {
        continue;
      }

      yield new Uint8Array([45]);
      state = "none";
    }

    if (state === "skip-cr") {
      if (start < part.length && part[start] === 13) {
        start++;
        state = "skip-lf";
      } else if (start < part.length) {
        state = "none";
      }
    }

    if (state === "skip-lf") {
      if (start < part.length && part[start] === 10) {
        start++;
        state = "none";
      } else if (start < part.length) {
        state = "none";
      }
    }

    if (state === "none") {
      yield part.subarray(start);
    }
  }
}
