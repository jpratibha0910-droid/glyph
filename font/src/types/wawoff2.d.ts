declare module 'wawoff2' {
  export function compress(buffer: Uint8Array | Buffer): Promise<Uint8Array>;
  export function decompress(buffer: Uint8Array | Buffer): Promise<Uint8Array>;
  const wawoff2: {
    compress(buffer: Uint8Array | Buffer): Promise<Uint8Array>;
    decompress(buffer: Uint8Array | Buffer): Promise<Uint8Array>;
  };
  export default wawoff2;
}
