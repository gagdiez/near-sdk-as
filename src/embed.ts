/** Compile-time embedding helpers. */
export namespace embed {
  /**
   * Embeds a file as bytes. The near-as compiler replaces this call before
   * AssemblyScript compilation.
   */
  export function bytes(path: string): Uint8Array {
    throw new Error("embed.bytes() must be compiled with near-as");
  }

  /** @internal Copies an emitted static data segment into a managed array. */
  export function fromMemory(pointer: usize, length: i32): Uint8Array {
    const result = new Uint8Array(length);
    memory.copy(result.dataStart, pointer, length);
    return result;
  }
}
