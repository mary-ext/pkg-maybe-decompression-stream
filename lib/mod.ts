const enum CompressionState {
	Undetermined,
	Compressed,
	Passthrough,
}

type State =
	| { status: CompressionState.Undetermined; buffer: Uint8Array | undefined }
	| { status: CompressionState.Compressed; writer: WritableStreamDefaultWriter<Uint8Array> }
	| { status: CompressionState.Passthrough };

/**
 * decompresses a stream of data if it is compressed with gzip, otherwise it passes the data through.
 */
export class MaybeDecompressionStream extends TransformStream<Uint8Array, Uint8Array> {
	constructor() {
		let state: State = { status: CompressionState.Undetermined, buffer: undefined };

		super({
			transform(chunk, controller) {
				switch (state.status) {
					case CompressionState.Passthrough: {
						controller.enqueue(chunk);
						return;
					}
					case CompressionState.Compressed: {
						state.writer.write(chunk);
						return;
					}
					case CompressionState.Undetermined: {
						let buffer = state.buffer;

						if (buffer === undefined) {
							buffer = chunk;
						} else {
							const concat = new Uint8Array(buffer.length + chunk.length);
							concat.set(buffer);
							concat.set(chunk, buffer.length);
							buffer = concat;
						}

						if (buffer.length < 2) {
							state.buffer = buffer;
							return;
						}

						const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;

						if (isGzip) {
							const { readable, writable } = new DecompressionStream('gzip');

							const writer = writable.getWriter();
							writer.write(buffer);

							readable.pipeTo(
								new WritableStream({
									write(chunk) {
										controller.enqueue(chunk);
									},
									close() {
										controller.terminate();
									},
									abort(err) {
										controller.error(err);
									},
								}),
							);

							state = { status: CompressionState.Compressed, writer };
						} else {
							controller.enqueue(buffer);

							state = { status: CompressionState.Passthrough };
						}

						return;
					}
				}
			},
			async flush(controller) {
				if (state.status === CompressionState.Undetermined) {
					if (state.buffer) {
						controller.enqueue(state.buffer);
					}
				}

				if (state.status === CompressionState.Compressed) {
					await state.writer.close();
				}
			},
			async cancel(reason) {
				if (state.status === CompressionState.Compressed) {
					await state.writer.abort(reason);
				}
			},
		});
	}
}
