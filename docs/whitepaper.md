# CodeLock

**A gate-tethered cognitive rendering tool**

Aziel Eliab  
July 2026  
License: Apache-2.0

> This tool alters perception, not meaning.

## Abstract

CodeLock is a standalone, gate-tethered cognitive rendering tool. It applies
reversible, non-destructive rendering transformations at the **view layer**
to show how visual presentation changes human comprehension of identical
source text.

It does **not** hide, encrypt, obfuscate, or protect secrets. It does **not**
prevent copying. It does **not** replace encryption. Plain text remains the
single source of truth. Rendered views never mutate source. Normalize mode
is always available. Every non-standard rendering is labeled non-canonical.
Cognitive-altering modes require explicit user acknowledgment of the exact
phrase:

```
This tool alters perception, not meaning.
```

This document is the specification implemented by the `codelock` Python
package. Forks are welcome and always allowed.

---

## 1. Motivation

Humans do not read glyphs in isolation. Font size, hue, rotation, and
spacing change which tokens the eye lands on, how groups form, and how
confident a reader feels about a fragment of source. Two people can be
shown the same bytes and walk away with different pictures of what the
program *does*, because the *presentation* was different.

That effect is usually accidental: an editor theme, a printer, a projector.
CodeLock makes it deliberate and inspectable. A deterministic seed drives
token-level variance (Rosetta Render / CodeLock Mode) so the same source
can be viewed as a family of presentations. The point is not decoration.
The point is to put a named, reversible instrument under a phenomenon
that already happens whenever code is shown on a screen.

If presentation can change comprehension of identical text, then any
serious review process needs:

- a canonical viewing state with zero transforms (Normalize);
- a way to *leave* that state only on purpose;
- exports that cannot be confused with source.

CodeLock is that instrument.

## 2. Design principles

These principles are implemented in the library, not only written here.

1. **Single source of truth.** Plain text is always canonical. Rendered
   views never mutate source. A `CodeLockSession` holds the input string
   immutably; HTML and style lists are derived, not written back.
2. **Full reversibility.** Normalize mode is always available, including
   when the gate is Closed. There is no irreversible state. Closing the
   gate returns the operator to canonical viewing. Opening it does not
   alter the bytes.
3. **Explicit representation.** All non-standard renderings are labeled
   non-canonical. Exports distinguish source (Export Normal, verbatim
   `.txt`) from artifact (Export CodeLock, HTML stamped
   `data-canonical="false"` with a banner and an HTML comment).
4. **Gate tethering.** Cognitive-altering modes require explicit user
   acknowledgment of the exact phrase `This tool alters perception, not
   meaning.` The `Gate` object and `gate_open` flag are visible and
   enforceable. CodeLock render and Export CodeLock raise
   `GateClosedError` while Closed.
5. **Audit safety.** No evasion of inspection, scaling, copying, or
   review. All outputs are inspectable with standard tools. The HTML
   artifact embeds the original source in a
   `<script type="text/plain" id="codelock-source">` element (and a
   readable textarea). The artifact does not encrypt. It does not
   minify source to evade reading. It opens as a local file: inline CSS,
   no CDN.

## 3. Operational modes

### Normalize

Fixed-size monospace, zero transforms. This is the canonical viewing
state. It is **always** available, regardless of gate. Normalize HTML
uses a single monospace face and a single font size. It does not apply
per-token size, rotation, hue, or spacing variance.

### CodeLock / Rosetta Render

Token-level font-size variance, optional hue spectrum, micro-rotation,
and spacing transforms, using a **deterministic seed**.

The tokenizer splits source into identifiers, keywords, punctuation,
whitespace, comments, and strings. It is language-agnostic-ish: a regex
tokenizer over generic source text. Whitespace is preserved so that
`"".join(tokens) == original`.

Per-token styles are derived from

```
SHA-256(seed || token_index || token)
```

Typical ranges used by this implementation:

- font size 11–22 px
- rotation ±4 degrees
- letter-spacing and word-spacing ±0.08 em
- hue 0–359 degrees when the hue flag is on; `None` (no color/hsl)
  when the hue flag is off

The same seed and the same source produce the same style list and the
same HTML. A different seed produces different styles. CodeLock Mode is
**disabled when the gate is Closed**.

## 4. Gate tethering

The gate has two states.

- **Closed.** CodeLock Mode is disabled. Normalize and Export Normal
  still work. Attempts to produce a CodeLock view or Export CodeLock
  raise `GateClosedError` with a clear message.
- **Open.** Full functionality. Opening requires acknowledging the
  exact sentence `This tool alters perception, not meaning.`

The library exposes a `Gate` object and a `gate_open` flag.
`CodeLockSession.open_gate(acknowledgment)` is the only supported way
to move from Closed to Open. A wrong phrase fails; the exact phrase
opens. The CLI gate is per-invocation: pass `--ack` or set the
environment variable `CODELOCK_ACK` to the same phrase. The default is
Closed. Normalize and export-normal never need `--ack`.

The gate exists because a cognitive-altering view is easy to mistake
for the thing itself. The sentence is the contract. If you will not
say it, you stay in Normalize.

## 5. Export model

Two exports. They are not interchangeable.

### Export Normal

Plain `.txt` containing the verbatim source, encoded UTF-8, byte-identical
to the input string. This is the canonical artifact. It is always
available.

### Export CodeLock

A self-contained `.html` visual artifact, **explicitly marked
non-canonical**:

- a visible banner stating that the document is a non-canonical visual
  artifact;
- an HTML comment to the same effect;
- `data-canonical="false"` on the document.

The original source is stored inspectably in
`<script type="text/plain" id="codelock-source">` (and a textarea).
Each non-whitespace token is a styled `<span>`. The file does not
encrypt. It works opened as a file: inline CSS, no CDN required.

## 6. What this is not

CodeLock is not:

- encryption, a cipher, or a substitute for one;
- obfuscation, minification, or packing meant to evade reading;
- a copy-protection scheme, DRM, or a watermark;
- a way to hide secrets, credentials, or source from inspection;
- a requirement that a web server host the HTML artifact.

Audit safety is a design constraint. Scaling, copying, grepping, and
reviewing must remain possible with ordinary tools. Forks that add
obfuscation, encryption, or evasion are outside this spec.

## 7. This release

A complete, inspectable implementation of the design above: a small
Python library (`codelock.session.CodeLockSession`), a CLI (`codelock`),
synthetic tests with no network and no GUI, and a Cloudflare Worker
that counts downloads across branches and forks. Core code is stdlib
only (`hashlib`, `html`, `re`, `argparse`). pytest is a development
extra.

| Spec | Code |
|------|------|
| Library entry | `codelock.session.CodeLockSession` |
| Gate / ACK_PHRASE / GateClosedError | `codelock.gate` |
| Tokenizer | `codelock.tokenize` |
| Rosetta styles + HTML | `codelock.render` |
| CLI | `codelock` (`gate-status`, `open-gate`, `render`, `export`, `version`) |

Forks are welcome and always allowed.

This tool alters perception, not meaning.

---

This tool alters perception, not meaning.

Signed,

Aziel  
July 2026
