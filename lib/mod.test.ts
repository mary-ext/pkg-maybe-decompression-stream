import { assertEquals } from '@std/assert';

import { MaybeDecompressionStream } from './mod.ts';

Deno.test({
	name: 'decompresses a gzip stream',
	async fn() {
		const { readable, writable } = new MaybeDecompressionStream();

		{
			const writer = writable.getWriter();

			// deno-fmt-ignore
			writer.write(
				Uint8Array.from([
					31, 139, 8, 0, 0, 0, 0, 0, 0, 255, 242, 72, 205, 201, 201, 215, 81,
					40, 207, 47, 202, 73, 81, 4, 0, 0, 0, 255, 255, 3, 0, 230, 198, 230, 
					235, 13, 0, 0, 0,
				]),
			);

			writer.close();
		}

		{
			const result = await toUint8Array(readable);
			const decoded = new TextDecoder().decode(result);

			assertEquals(decoded, 'Hello, world!');
		}
	},
});

Deno.test({
	name: 'passthroughs a non-gzip stream',
	async fn() {
		const { readable, writable } = new MaybeDecompressionStream();

		const input = Uint8Array.from([1, 2, 3, 4, 5]);

		{
			const writer = writable.getWriter();
			writer.write(input);
			writer.close();
		}

		{
			const result = await toUint8Array(readable);
			assertEquals(result, input);
		}
	},
});

async function toUint8Array(source: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
	let buffer: Uint8Array | undefined;

	for await (const value of source) {
		if (buffer === undefined) {
			buffer = value;
		} else {
			const concat = new Uint8Array(buffer.length + value.length);
			concat.set(buffer);
			concat.set(value, buffer.length);
			buffer = concat;
		}
	}

	return buffer ?? new Uint8Array(0);
}
