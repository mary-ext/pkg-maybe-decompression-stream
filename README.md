# maybe-decompression-stream

decompresses a stream of data if it is compressed with gzip, otherwise it passes the data through.

```ts
const response = await fetch('resource.tgz');

const stream = response.body.pipeThrough(new MaybeDecompressionStream());

for await (const chunk of stream) {
	// ...
}
```
