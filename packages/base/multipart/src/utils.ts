export async function* mergeChunks<T extends string>(
  iterable: AsyncIterable<Uint8Array | T>,
): AsyncIterable<Uint8Array> {
  let chunks: Uint8Array[] = [];
  for await (const chunk of iterable) {
    if (typeof chunk !== "string") {
      chunks.push(chunk);
    } else {
      if (chunks.length) {
        yield concat(...chunks);
      }
      chunks = [];
    }
  }

  if (chunks.length) {
    yield concat(...chunks);
  }
}

export function concat(...arrays: Uint8Array[]) {
  const length = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}
