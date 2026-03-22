/**
 * NPZ (NumPy ZIP archive) reader.
 * Loads KittenTTS voice embeddings from .npz files.
 * Each entry is a .npy file inside a standard ZIP archive.
 */

function parseNpyHeader(bytes) {
    // NPY magic: \x93NUMPY
    const magic = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];
    for (let i = 0; i < magic.length; i++) {
        if (bytes[i] !== magic[i]) throw new Error('Not a valid .npy file');
    }
    const majorVer = bytes[6];
    let headerLen;
    let dataOffset;
    if (majorVer === 1) {
        // v1: 2-byte little-endian header length at offset 8
        headerLen = bytes[8] | (bytes[9] << 8);
        dataOffset = 10 + headerLen;
    } else {
        // v2: 4-byte little-endian header length at offset 8
        headerLen = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);
        dataOffset = 12 + headerLen;
    }
    const headerBytes = bytes.slice(10 + (majorVer === 1 ? 0 : 2), dataOffset);
    const header = new TextDecoder().decode(headerBytes);
    const descrMatch = header.match(/'descr':\s*'([^']+)'/);
    const shapeMatch = header.match(/'shape':\s*\(([^)]*)\)/);
    const descr = descrMatch ? descrMatch[1] : '<f4';
    const shape = shapeMatch
        ? shapeMatch[1].split(',').map(s => s.trim()).filter(Boolean).map(Number)
        : [];
    return { descr, shape, dataOffset };
}

function npyToFloat32(bytes) {
    const { descr, shape, dataOffset } = parseNpyHeader(bytes);
    const raw = bytes.slice(dataOffset);
    let data;
    if (descr === '<f4' || descr === 'float32') {
        data = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    } else if (descr === '<f8' || descr === 'float64') {
        const f64 = new Float64Array(raw.buffer, raw.byteOffset, raw.byteLength / 8);
        data = new Float32Array(f64.length);
        for (let i = 0; i < f64.length; i++) data[i] = f64[i];
    } else {
        throw new Error(`Unsupported dtype: ${descr}`);
    }
    return { data, shape };
}

function extractZipEntries(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const entries = {};

    // Find End of Central Directory (EOCD) signature: 0x06054b50
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
        if (
            bytes[i] === 0x50 &&
            bytes[i + 1] === 0x4b &&
            bytes[i + 2] === 0x05 &&
            bytes[i + 3] === 0x06
        ) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) throw new Error('Invalid ZIP: no EOCD signature');

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdCount = view.getUint16(eocdOffset + 8, true);

    let pos = cdOffset;
    for (let i = 0; i < cdCount; i++) {
        // Central directory file header signature: 0x02014b50
        if (view.getUint32(pos, true) !== 0x02014b50) {
            throw new Error('Invalid ZIP: bad central directory header');
        }
        const compressionMethod = view.getUint16(pos + 10, true);
        const compressedSize = view.getUint32(pos + 20, true);
        const uncompressedSize = view.getUint32(pos + 24, true);
        const fileNameLen = view.getUint16(pos + 28, true);
        const extraLen = view.getUint16(pos + 30, true);
        const commentLen = view.getUint16(pos + 32, true);
        const localHeaderOffset = view.getUint32(pos + 42, true);
        const fileName = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + fileNameLen));
        pos += 46 + fileNameLen + extraLen + commentLen;

        // Read local file header to get actual data offset
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const localFileNameLen = view.getUint16(localHeaderOffset + 26, true);
        const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

        let data;
        if (compressionMethod === 0) {
            // Stored
            data = bytes.slice(dataOffset, dataOffset + uncompressedSize);
        } else if (compressionMethod === 8) {
            // Deflated — use DecompressionStream if available
            const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
            // We'll return a promise-based entry that callers must await
            entries[fileName] = { compressed, uncompressedSize, deflated: true };
            continue;
        } else {
            throw new Error(`Unsupported compression method: ${compressionMethod}`);
        }
        entries[fileName] = { data, deflated: false };
    }
    return entries;
}

async function decompressDeflate(compressed) {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressed);
    writer.close();
    const chunks = [];
    const reader = ds.readable.getReader();
    let totalLen = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLen += value.length;
    }
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

/**
 * Load all voice embeddings from a .npz URL.
 * Returns Record<voiceName, { data: Float32Array, shape: number[] }>
 */
export async function loadVoices(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch voices: ${response.status} ${url}`);
    const buffer = await response.arrayBuffer();
    const rawEntries = extractZipEntries(buffer);

    const voices = {};
    for (const [filename, entry] of Object.entries(rawEntries)) {
        if (!filename.endsWith('.npy')) continue;
        const voiceName = filename.replace(/\.npy$/, '');
        let data;
        if (entry.deflated) {
            data = await decompressDeflate(entry.compressed);
        } else {
            data = entry.data;
        }
        voices[voiceName] = npyToFloat32(data);
    }
    return voices;
}
