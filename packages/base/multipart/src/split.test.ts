import { expect, it } from "vitest";
import { split } from "./split";
import { mergeChunks } from "./utils";

it("should split simple chunk", async () => {
  const parts = makeAsync(
    new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 5, 6, 10, 11]),
  );
  const boundary = new Uint8Array([5, 6]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));
  expect(output).toEqual([
    new Uint8Array([0, 1, 2, 3, 4]),
    new Uint8Array([7, 8, 9]),
    new Uint8Array([10, 11]),
  ]);
});

it("should split accross chunks", async () => {
  const parts = makeAsync(
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([6, 7, 8, 9]),
  );
  const boundary = new Uint8Array([5, 6]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([
    new Uint8Array([0, 1, 2, 3, 4]),
    new Uint8Array([7, 8, 9]),
  ]);
});

it("should split when boundary is larger than chunk", async () => {
  const parts = makeAsync(
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([6, 7]),
    new Uint8Array([8, 9, 10, 11]),
  );
  const boundary = new Uint8Array([5, 6, 7, 8]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([
    new Uint8Array([0, 1, 2, 3, 4]),
    new Uint8Array([9, 10, 11]),
  ]);
});

it("should split when boundary is larger than chunk to the right", async () => {
  const parts = makeAsync(
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([6, 7]),
    new Uint8Array([8, 9, 10, 11]),
  );
  const boundary = new Uint8Array([6, 7, 8]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([9, 10, 11]),
  ]);
});

it("should split when the whole chunk is a boundary", async () => {
  const parts = makeAsync(
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([6, 7]),
    new Uint8Array([8, 9, 10, 11]),
  );
  const boundary = new Uint8Array([6, 7]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([8, 9, 10, 11]),
  ]);
});

it("should cope with false leftovers", async () => {
  const parts = makeAsync(
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array([7, 8, 9]),
  );

  const boundary = new Uint8Array([5, 6]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([new Uint8Array([0, 1, 2, 3, 4, 5, 7, 8, 9])]);
});

it("should split at the end", async () => {
  const parts = makeAsync(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const boundary = new Uint8Array([7, 8, 9]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([new Uint8Array([0, 1, 2, 3, 4, 5, 6])]);
});

it("should split at the start", async () => {
  const parts = makeAsync(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const boundary = new Uint8Array([0, 1]);
  const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

  expect(output).toEqual([new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9])]);
});

async function* makeAsync<T>(...iterable: T[]): AsyncIterable<T> {
  for (const item of iterable) {
    yield item;
  }
}

async function toArray<T>(asyncIterator: AsyncIterable<T>) {
  const result = [];
  for await (const i of asyncIterator) result.push(i);
  return result;
}
