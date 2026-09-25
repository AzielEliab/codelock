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
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: ThemeMode.system,
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
    text: '',
  );
  final _ack = TextEditingController();
  final _seedField = TextEditingController(text: '7');
  bool _codelock = false;
  bool _gateOpen = false;
  bool _shown = false;
  String? _notice;

  @override
  void dispose() {
    _source.dispose();
    _ack.dispose();
    _seedField.dispose();
    super.dispose();
  }

  int get _seed => int.tryParse(_seedField.text.trim()) ?? 7;

  void _openGate() {
    if (_ack.text.trim() != ackPhrase) {
      setState(() {
        _notice = 'That acknowledgment does not match. Enter: $ackPhrase';
        _gateOpen = false;
        _codelock = false;
      });
      return;
    }
    setState(() {
      _gateOpen = true;
      _codelock = true;
      _notice = 'Gate open for this session. Press Show view.';
    });
  }

  void _showView() {
    if (_codelock && !_gateOpen) {
      setState(() {
        _shown = true;
        _codelock = false;
        _notice =
            'CodeLock mode is closed. Open Advanced, enter the acknowledgment, then Show view again. Showing the plain view.';
      });
      return;
    }
    setState(() {
      _shown = true;
      _notice = _codelock
          ? 'CodeLock view. Same words, with size, color, and rotation.'
          : 'Plain view. Fixed-size monospace.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('CodeLock'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: Center(child: Text('Aziel Eliab')),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Paste a snippet and press Show view. The plain view is always available.',
            style: TextStyle(color: scheme.onSurface, fontSize: 16, height: 1.4),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _source,
            maxLines: 8,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
            decoration: const InputDecoration(
              labelText: 'Source',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _showView,
              child: const Text('Show view'),
            ),
          ),
          if (_notice != null) ...[
            const SizedBox(height: 12),
            Text(_notice!, style: TextStyle(color: scheme.onSurface)),
          ],
          const SizedBox(height: 16),
          if (_shown)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: _codelock && _gateOpen
                    ? _CodeLockView(source: _source.text, seed: _seed)
                    : SelectableText(
                        _source.text.isEmpty ? 'Paste source, then Show view.' : _source.text,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 14,
                          height: 1.45,
                          color: scheme.onSurface,
                        ),
                      ),
              ),
            ),
          const SizedBox(height: 8),
          ExpansionTile(
            title: const Text('Advanced'),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            children: [
              TextField(
                controller: _ack,
                decoration: const InputDecoration(
                  labelText: 'Acknowledgment',
                  helperText: ackPhrase,
                ),
              ),
              const SizedBox(height: 8),
              if (!_gateOpen)
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.tonal(
                    onPressed: _openGate,
                    child: const Text('Open gate'),
                  ),
                )
              else
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _gateOpen = false;
                        _codelock = false;
                        _notice = 'Gate closed. The plain view stays available.';
                      });
                    },
                    child: const Text('Close gate'),
                  ),
                ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('CodeLock view'),
                subtitle: Text(
                  _gateOpen
                      ? 'Show size, color, and rotation.'
                      : 'Open the gate with the acknowledgment first.',
                ),
                value: _codelock && _gateOpen,
                onChanged: (want) {
                  if (want && !_gateOpen) {
                    setState(() {
                      _notice =
                          'CodeLock mode is closed. Enter the acknowledgment, then try again.';
                    });
                    return;
                  }
                  setState(() => _codelock = want);
                },
              ),
              TextField(
                controller: _seedField,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Seed',
                  helperText: 'Same seed, same CodeLock view. Default 7.',
                ),
              ),
            ],
          ),
          ExpansionTile(
            title: const Text('About'),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: const [
              Text(
                'CodeLock shows one source as a plain view and as a CodeLock view. '
                'The source text stays the same. Size, color, and rotation are presentation.',
              ),
              SizedBox(height: 8),
              Text('Acknowledgment: $ackPhrase'),
              SizedBox(height: 8),
              Text('Author: Aziel Eliab · July 2026 · Offline'),
            ],
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
    if (tokens.isEmpty) {
      return Text(
        'Paste source, then Show view.',
        style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
      );
    }
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
