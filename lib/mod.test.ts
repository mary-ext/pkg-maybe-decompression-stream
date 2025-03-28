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
				new Uint8Array([
					31, 139, 8, 0, 0, 0, 0, 0, 0, 255, 242, 72, 205, 201, 201, 215, 81,
					40, 207, 47, 202, 73, 81, 4, 0, 0, 0, 255, 255, 3, 0, 230, 198, 230, 
					235, 13, 0, 0, 0,
				]),
			);

			writer.close();
		}

		{
			let buffer = new Uint8Array(0);
			for await (const chunk of readable) {
				const concat = new Uint8Array(buffer.length + chunk.length);
				concat.set(buffer);
				concat.set(chunk, buffer.length);
				buffer = concat;
			}

			const decoded = new TextDecoder().decode(buffer);

			assertEquals(decoded, 'Hello, world!');
		}
	},
});

Deno.test({
	name: 'passthroughs a non-gzip stream',
	async fn() {
		const { readable, writable } = new MaybeDecompressionStream();

		const input = new Uint8Array([1, 2, 3, 4, 5]);

		{
			const writer = writable.getWriter();
			writer.write(input);
			writer.close();
		}

		{
			let buffer = new Uint8Array(0);
			for await (const chunk of readable) {
				const concat = new Uint8Array(buffer.length + chunk.length);
				concat.set(buffer);
				concat.set(chunk, buffer.length);
				buffer = concat;
			}

			assertEquals(buffer, input);
		}
	},
});
