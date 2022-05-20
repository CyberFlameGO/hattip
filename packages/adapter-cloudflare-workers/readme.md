# `@hattip/adapter-cloudflare-workers`

HatTip adapter for [Cloudflare Workers](https://workers.cloudflare.com).

> This is a low level package, we recommend using `@hattip/cloudflare-workers` for most use cases.

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-cloudflare-workers`](../bundler-cloudflare-workers) or your favorite bundler to bundle it:

```js
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./handler.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
```

We use the modern [modules format](https://blog.cloudflare.com/workers-javascript-modules) instead of the older service worker format.
