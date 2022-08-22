import { expect, it } from "vitest";
import { concat } from "./utils";
import { Headers } from "node-fetch-native";

globalThis.Headers = globalThis.Headers || Headers;

const { parseMultipart } = await import("./multipart");

it.each([1, 2, 3, 38, 1024])(
  "should work with a buffer size of %d",
  async (bufferSize) => {
    const parts = await recombine(
      parseMultipart(
        iterator(EXAMPLE_MUlTIPART_CONTENT, bufferSize),
        "----WebKitFormBoundaryQyLZBECf520GwHez",
      ),
    );

    for (const [i, part] of parts.entries()) {
      const headers = Array.from(part.headers.entries());
      const body = new TextDecoder().decode(part.body);

      expect(headers).toEqual(EXPECTED[i].headers);
      expect(body).toEqual(EXPECTED[i].body);
    }
  },
);

async function recombine(input: AsyncIterable<Headers | Uint8Array>) {
  const parts: Array<{ headers: Headers; body: Uint8Array }> = [];
  for await (const chunk of input) {
    if (chunk instanceof Headers) {
      parts.push({ headers: chunk, body: new Uint8Array(0) });
    } else {
      parts[parts.length - 1].body = concat(
        parts[parts.length - 1].body,
        chunk,
      );
    }
  }

  return parts;
}

async function* iterator(
  value: string,
  bufferSize: number,
): AsyncIterable<Uint8Array> {
  const buffer = new TextEncoder().encode(value);
  // Split every n bytes
  for (let i = 0; i < buffer.length; i += bufferSize) {
    yield buffer.subarray(i, i + bufferSize);
  }
}

const EXAMPLE_MUlTIPART_CONTENT =
  "------WebKitFormBoundaryQyLZBECf520GwHez\r\n" +
  'Content-Disposition: form-data; name="field1"\r\n\r\nvalue 1\r\n' +
  "------WebKitFormBoundaryQyLZBECf520GwHez\r\n" +
  'Content-Disposition: form-data; name="field2"\r\n\r\nvalue 2\r\n' +
  "------WebKitFormBoundaryQyLZBECf520GwHez\r\n" +
  'Content-Disposition: form-data; name="file"; filename="my-file.txt"\r\n' +
  "Content-Type: text/plain\r\n\r\n" +
  "This is a file!\r\n" +
  "------WebKitFormBoundaryQyLZBECf520GwHez--\r\n";

const EXPECTED = [
  {
    headers: [["content-disposition", 'form-data; name="field1"']],
    body: "value 1",
  },
  {
    headers: [["content-disposition", 'form-data; name="field2"']],
    body: "value 2",
  },
  {
    headers: [
      ["content-disposition", 'form-data; name="file"; filename="my-file.txt"'],
      ["content-type", "text/plain"],
    ],
    body: "This is a file!",
  },
];
