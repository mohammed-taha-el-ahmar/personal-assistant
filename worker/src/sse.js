// Minimal server-sent-events writer over a TransformStream.
export function sseStream() {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  let closed = false;
  return {
    readable,
    send(event, data) {
      if (closed) return Promise.resolve();
      return writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    },
    close() {
      if (closed) return Promise.resolve();
      closed = true;
      return writer.close();
    },
  };
}
