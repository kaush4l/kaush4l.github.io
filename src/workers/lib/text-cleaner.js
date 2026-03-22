/**
 * TextCleaner — maps IPA phoneme characters to integer token IDs.
 * Direct port of KittenTTS Python TextCleaner class.
 * https://github.com/KittenML/KittenTTS
 */

const _pad = '$';
const _punctuation = ';:,.!?¡¿—…"«»"" ';
const _letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const _letters_ipa =
    'ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘\'̩\'ᵻ';

const symbols = [_pad, ..._punctuation, ..._letters, ..._letters_ipa];

const charToIndex = {};
for (let i = 0; i < symbols.length; i++) {
    charToIndex[symbols[i]] = i;
}

export function cleanText(text) {
    const indexes = [];
    for (const char of text) {
        const idx = charToIndex[char];
        if (idx !== undefined) indexes.push(idx);
    }
    return indexes;
}

export function tokenize(phonemes) {
    const tokens = cleanText(phonemes);
    // Start token 0, end token 10, end token 0 — matching Python logic
    tokens.unshift(0);
    tokens.push(10);
    tokens.push(0);
    return tokens;
}
