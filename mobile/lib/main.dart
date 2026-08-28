import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';

import 'theme.dart';

const ackPhrase = 'This tool alters perception, not meaning.';

void main() {
  runApp(const CodeLockApp());
}

class CodeLockApp extends StatelessWidget {
  const CodeLockApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CodeLock',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const CodeLockPage(),
    );
  }
}

class CodeLockPage extends StatefulWidget {
  const CodeLockPage({super.key});

  @override
  State<CodeLockPage> createState() => _CodeLockPageState();
}

class _CodeLockPageState extends State<CodeLockPage> {
  final _source = TextEditingController(
    text: 'def greet(name):\n    return f"hello {name}"\n',
  );
  final _ack = TextEditingController();
  bool _codelock = false;
  bool _gateOpen = false;
  String? _gateError;
  final int _seed = 7;

  @override
  void dispose() {
    _source.dispose();
    _ack.dispose();
    super.dispose();
  }

  void _openGate() {
    if (_ack.text.trim() != ackPhrase) {
      setState(() {
        _gateError =
            'Opening the gate requires the exact phrase: "$ackPhrase"';
        _gateOpen = false;
        _codelock = false;
      });
      return;
    }
    setState(() {
      _gateOpen = true;
      _gateError = null;
    });
  }

  void _closeGate() {
    setState(() {
      _gateOpen = false;
      _codelock = false;
      _gateError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CodeLock')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(ackPhrase, style: const TextStyle(color: kGold, fontSize: 16)),
          const SizedBox(height: 8),
          const Text(
            'This tool alters perception, not meaning. Not encryption. '
            'Plain text is canonical. Rendered views never mutate source.',
            style: TextStyle(color: kIvory),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _source,
            maxLines: 8,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
            decoration: const InputDecoration(
              labelText: 'Paste source (canonical)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          if (!_gateOpen) ...[
            TextField(
              controller: _ack,
              decoration: const InputDecoration(
                labelText: 'Acknowledge gate phrase to enable CodeLock',
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(onPressed: _openGate, child: const Text('Open gate')),
          ] else
            OutlinedButton(onPressed: _closeGate, child: const Text('Close gate')),
          if (_gateError != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_gateError!, style: const TextStyle(color: Color(0xFFB54A4A))),
            ),
          const SizedBox(height: 12),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Normalize')),
              ButtonSegment(value: true, label: Text('CodeLock')),
            ],
            selected: {_codelock},
            onSelectionChanged: (s) {
              final want = s.first;
              if (want && !_gateOpen) {
                setState(() {
                  _gateError =
                      'CodeLock Mode is disabled while the gate is Closed. Normalize remains available.';
                });
                return;
              }
              setState(() {
                _codelock = want;
                _gateError = null;
              });
            },
          ),
          const SizedBox(height: 16),
          Text(
            _codelock ? 'NON-CANONICAL visual artifact — not a substitute for source.' : 'Canonical view (Normalize). Fixed-size monospace. Zero transforms.',
            style: TextStyle(color: _codelock ? const Color(0xFFB54A4A) : kGoldDim),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: _codelock
                  ? _CodeLockView(source: _source.text, seed: _seed)
                  : SelectableText(
                      _source.text,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 14,
                        height: 1.45,
                        letterSpacing: 0,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeLockView extends StatelessWidget {
  const _CodeLockView({required this.source, required this.seed});
  final String source;
  final int seed;

  @override
  Widget build(BuildContext context) {
    final tokens = tokenize(source);
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.end,
      children: [
        for (var i = 0; i < tokens.length; i++) _token(tokens[i], i),
      ],
    );
  }

  Widget _token(String tok, int index) {
    if (tok.trim().isEmpty) {
      return Text(tok, style: const TextStyle(fontFamily: 'monospace', fontSize: 14));
    }
    final d = _digest(seed, index, tok);
    final size = 11.0 + (d[0] % 12);
    final hue = ((d[4] << 8) | d[5]) % 360;
    final rot = (d[1] / 255.0) * 8.0 - 4.0;
    return Transform.rotate(
      angle: rot * pi / 180,
      child: Text(
        tok,
        style: TextStyle(
          fontFamily: 'monospace',
          fontSize: size,
          color: hsl(hue, 0.70, 0.55),
        ),
      ),
    );
  }
}

List<int> _digest(int seed, int index, String token) {
  final h = sha256.convert(utf8.encode('$seed\u0000$index\u0000$token'));
  return h.bytes;
}

List<String> tokenize(String source) {
  if (source.isEmpty) return const [];
  final re = RegExp(r'(\s+|[A-Za-z_]\w*|\d+(?:\.\d+)?|.)', dotAll: true);
  return [for (final m in re.allMatches(source)) m.group(0)!];
}

Color hsl(int h, double s, double l) {
  final c = (1 - (2 * l - 1).abs()) * s;
  final x = c * (1 - (((h / 60) % 2) - 1).abs());
  final m = l - c / 2;
  late final double r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return Color.fromARGB(255, ((r + m) * 255).round(), ((g + m) * 255).round(), ((b + m) * 255).round());
}
