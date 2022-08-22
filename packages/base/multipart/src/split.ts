// TODO: This function needs to be optimized.
export async function* split<T>(
  input: AsyncIterable<Uint8Array>,
  boundary: Uint8Array,
  boundaryRep: T,
): AsyncIterable<Uint8Array | T> {
  let leftovers = 0;
  main: for await (const chunk of input) {
    let afterBoundary = leftovers ? boundary.length - leftovers : 0;
    if (leftovers) {
      for (let i = 0; i < boundary.length - leftovers; i++) {
        if (i >= chunk.length) {
          leftovers += i;
          continue main;
        }
        if (chunk[i] !== boundary[leftovers + i]) {
          afterBoundary = 0;
          break;
        }
      }

      if (afterBoundary) {
        yield boundaryRep;
      } else {
        yield boundary.subarray(0, leftovers);
      }
      leftovers = 0;
    }

    while (afterBoundary < chunk.length) {
      const index = findPartial(chunk, boundary, afterBoundary);
      if (index >= 0 && index <= chunk.length - boundary.length) {
        if (index > 0) {
          yield chunk.subarray(afterBoundary, index);
        }
        yield boundaryRep;
        afterBoundary = index + boundary.length;
      } else if (index >= 0) {
        leftovers = chunk.length - index;
        yield chunk.subarray(afterBoundary, chunk.length - leftovers);
        break;
      } else {
        yield chunk.subarray(afterBoundary);
        break;
      }
    }
  }
}

function findPartial(
  array: Uint8Array,
  subarray: Uint8Array,
  offset: number,
): number {
  outer: for (let i = offset; i < array.length; i++) {
    for (let j = 0; j < subarray.length; j++) {
      const value = array[i + j];
      if (value === undefined) {
        return i;
      } else if (value !== subarray[j]) {
        continue outer;
      }
    }

    return i;
  }

  return -1;
}
