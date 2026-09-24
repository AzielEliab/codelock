import 'package:flutter/material.dart';

/// Paper / charcoal surfaces with an Aziel gold focus. No analytics.
const Color kMatteBlack = Color(0xFF12110E);
const Color kSurface = Color(0xFF1C1B17);
const Color kGold = Color(0xFFC9A227);
const Color kGoldDim = Color(0xFF8A7219);
const Color kIvory = Color(0xFFF4EFE6);
const Color kPaper = Color(0xFFF4F0E6);
const Color kInk = Color(0xFF1A1814);

ThemeData buildLightTheme() => _theme(Brightness.light);

ThemeData buildDarkTheme() => _theme(Brightness.dark);

ThemeData _theme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: kGold,
    onPrimary: kInk,
    secondary: kGoldDim,
    onSecondary: dark ? kIvory : kInk,
    surface: dark ? kSurface : const Color(0xFFFFFCF6),
    onSurface: dark ? kIvory : kInk,
    error: const Color(0xFF8F2D2D),
    onError: kIvory,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? kMatteBlack : kPaper,
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? kMatteBlack : kPaper,
      foregroundColor: dark ? kIvory : kInk,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: scheme.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: dark ? const Color(0xFF3D382E) : const Color(0xFFE0D6C4)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF14130F) : const Color(0xFFFFFCF6),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kGold, width: 2),
      ),
    ),
    focusColor: kGold,
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        foregroundColor: WidgetStateProperty.resolveWith((s) {
          return s.contains(WidgetState.selected) ? kInk : scheme.onSurface;
        }),
        backgroundColor: WidgetStateProperty.resolveWith((s) {
          return s.contains(WidgetState.selected) ? kGold : scheme.surface;
        }),
      ),
    ),
  );
}
