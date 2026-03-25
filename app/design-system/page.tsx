"use client";

/**
 * Design System Mock-up
 * Two proposed design directions for the DnD DM App.
 *
 * Direction A – "Grimoire" : Refined evolution of the current parchment aesthetic
 * Direction B – "Obsidian" : Dark-first approach with gold accents, maximum density
 *
 * Visit /design-system to preview both directions side by side.
 */

import { useState } from "react";

// ─── Shared utilities ────────────────────────────────────────────────────────

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Grimoire tokens ─────────────────────────────────────────────────────────

const G = {
  // Backgrounds
  bg: "#F5EFE6",
  bgDark: "#0D0A07",
  surface: "#FBF5EA",
  surfaceDark: "#171109",
  surfaceStrong: "#EDE0CB",
  surfaceStrongDark: "#201810",

  // Foregrounds
  fg: "#1C1812",
  fgDark: "#F0E5D0",
  muted: "#6B5C4D",
  mutedDark: "#A89070",

  // Accent (deep amber → lighter on dark)
  accent: "#8B5220",
  accentDark: "#E8B060",
  accentStrong: "#5C3010",
  accentStrongDark: "#F5CC88",

  // Border
  border: "rgba(0,0,0,0.1)",
  borderDark: "rgba(255,255,255,0.08)",

  // HP states (same logic, adjusted saturation)
  hpFull: "#2D7A3A",
  hpFullBg: "#D4F0DA",
  hpMid: "#8A6200",
  hpMidBg: "#FDECC8",
  hpLow: "#B83030",
  hpLowBg: "#FCD8D8",

  // Condition
  condBg: "#EDD8BE",
  condFg: "#5C350A",
};

// ─── Obsidian tokens ─────────────────────────────────────────────────────────

const O = {
  // Backgrounds (deep charcoal, NOT pure black)
  bg: "#0E0E12",
  surface: "#16161C",
  surfaceStrong: "#1E1E26",
  surfaceRaised: "#252530",

  // Foregrounds
  fg: "#F0EBE0",
  fgSub: "#C8BFB0",
  muted: "#7A7060",

  // Accent = old gold
  accent: "#C9973A",
  accentGlow: "rgba(201,151,58,0.15)",
  accentStrong: "#E8BB60",

  // Semantic
  danger: "#DC4A4A",
  dangerBg: "rgba(220,74,74,0.12)",
  heal: "#4CAF7D",
  healBg: "rgba(76,175,125,0.12)",

  // Border
  border: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(201,151,58,0.3)",

  // HP
  hpFull: "#4CAF7D",
  hpFullBg: "rgba(76,175,125,0.15)",
  hpMid: "#D4A843",
  hpMidBg: "rgba(212,168,67,0.15)",
  hpLow: "#DC4A4A",
  hpLowBg: "rgba(220,74,74,0.15)",

  // Condition
  condBg: "rgba(201,151,58,0.15)",
  condFg: "#E8BB60",

  // Active combatant
  activeBg: "rgba(201,151,58,0.08)",
  activeBorder: "#C9973A",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function HpBarViz({
  pct,
  theme,
}: {
  pct: number;
  theme: "grimoire" | "obsidian";
}) {
  const t = theme === "grimoire" ? G : O;
  const fg =
    pct > 0.74 ? t.hpFull : pct > 0.25 ? t.hpMid : t.hpLow;
  const bg =
    pct > 0.74 ? t.hpFullBg : pct > 0.25 ? t.hpMidBg : t.hpLowBg;

  return (
    <div
      style={{
        background: bg,
        borderRadius: 999,
        height: 6,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          background: fg,
          width: `${pct * 100}%`,
          height: "100%",
          borderRadius: 999,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

// ─── Grimoire Direction ───────────────────────────────────────────────────────

function GrimoireSection({ dark }: { dark: boolean }) {
  const bg = dark ? G.bgDark : G.bg;
  const surface = dark ? G.surfaceDark : G.surface;
  const surfaceStrong = dark ? G.surfaceStrongDark : G.surfaceStrong;
  const fg = dark ? G.fgDark : G.fg;
  const muted = dark ? G.mutedDark : G.muted;
  const accent = dark ? G.accentDark : G.accent;
  const accentStrong = dark ? G.accentStrongDark : G.accentStrong;
  const border = dark ? G.borderDark : G.border;

  const card: React.CSSProperties = {
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: "16px 20px",
    boxShadow: dark
      ? "0 2px 12px rgba(0,0,0,0.5)"
      : "0 2px 8px rgba(0,0,0,0.05), 0 12px 30px rgba(0,0,0,0.08)",
  };

  const pill = (label: string, tone: "stat" | "accent" | "neutral" = "neutral"): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: tone === "stat" ? "JetBrains Mono, monospace" : "Alegreya Sans, serif",
    background:
      tone === "accent"
        ? accent
        : surfaceStrong,
    color:
      tone === "accent"
        ? dark ? G.bgDark : "#fff"
        : tone === "stat"
          ? fg
          : muted,
  });

  // Participant row data
  const participants = [
    { name: "Thornwick", kind: "PC", init: 18, ac: 16, hp: 32, maxHp: 32, conditions: ["Blessed"], active: true },
    { name: "Adult Red Dragon", kind: "MONSTER", init: 14, ac: 19, hp: 127, maxHp: 230, conditions: ["Frightened"], active: false },
    { name: "Mira Sablewood", kind: "PC", init: 12, ac: 14, hp: 8, maxHp: 28, conditions: [], active: false },
    { name: "Guard Captain", kind: "NPC", init: 10, ac: 15, hp: 45, maxHp: 45, conditions: [], active: false },
  ];

  return (
    <div style={{ background: bg, padding: 24, borderRadius: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, marginBottom: 4 }}>Direction A</p>
        <h2 style={{ fontFamily: "Marcellus, serif", fontSize: 26, color: fg, letterSpacing: "0.02em", margin: 0 }}>
          Grimoire — {dark ? "Dark" : "Light"}
        </h2>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 13, color: muted, marginTop: 4 }}>
          Refined parchment. Warmer hierarchy. Richer depth.
        </p>
      </div>

      {/* Color swatch row */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginBottom: 10 }}>Palette</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "bg", color: bg },
            { label: "surface", color: surface },
            { label: "surface-strong", color: surfaceStrong },
            { label: "accent", color: accent },
            { label: "accent-strong", color: accentStrong },
            { label: "muted", color: muted },
            { label: "hp-full", color: G.hpFull },
            { label: "hp-mid", color: G.hpMid },
            { label: "hp-low", color: G.hpLow },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: color, border: `1px solid ${border}` }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: muted, textAlign: "center" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginBottom: 12 }}>Typography</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontFamily: "Marcellus, serif", fontSize: 28, color: fg, margin: 0, lineHeight: 1.1 }}>The Dragon's Lair</p>
          <p style={{ fontFamily: "Marcellus, serif", fontSize: 18, color: fg, margin: 0, letterSpacing: "0.02em" }}>Encounter — Round 3</p>
          <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 14, color: fg, margin: 0, lineHeight: 1.6, maxWidth: 360 }}>
            The red dragon rises from the rubble, wings spread wide. Each player must make a DC 16 Wisdom saving throw.
          </p>
          <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 12, color: muted, margin: 0 }}>Secondary label — Alegreya Sans 12</p>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: accent, margin: 0 }}>+7 · 4d6+3 · AC 19 · HP 127/230</p>
        </div>
      </div>

      {/* Combat tracker */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontFamily: "Marcellus, serif", fontSize: 16, color: fg, margin: 0 }}>Combat Tracker</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.hpLow }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: dark ? G.accentDark : G.accent }}>ROUND 3 · LIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {participants.map((p) => {
            const rowBg = p.active
              ? dark ? "rgba(232,176,96,0.08)" : "rgba(139,82,32,0.06)"
              : "transparent";
            const rowBorder = p.active
              ? `1px solid ${dark ? "rgba(232,176,96,0.4)" : "rgba(139,82,32,0.3)"}`
              : `1px solid transparent`;
            const hpPct = p.hp / p.maxHp;

            return (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: rowBg,
                  border: rowBorder,
                  transition: "all 0.15s",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: surfaceStrong,
                  border: p.active ? `2px solid ${accent}` : `2px solid ${border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "Marcellus, serif",
                  fontSize: 12,
                  color: p.active ? accent : muted,
                  fontWeight: 700,
                }}>
                  {p.name[0]}
                </div>

                {/* Name + conditions */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 13, fontWeight: 700, color: p.active ? accent : fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
                    </span>
                    <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: muted }}>
                      {p.kind}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <HpBarViz pct={hpPct} theme="grimoire" />
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: muted, whiteSpace: "nowrap" }}>
                      {p.hp}/{p.maxHp}
                    </span>
                  </div>
                </div>

                {/* Conditions */}
                {p.conditions.length > 0 && (
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    {p.conditions.map((c) => (
                      <span key={c} style={{
                        fontFamily: "Alegreya Sans, serif",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: dark ? G.condBg.replace("EDD8BE", "2E1E08") : G.condBg,
                        color: dark ? G.accentDark : G.condFg,
                      }}>{c}</span>
                    ))}
                  </div>
                )}

                {/* Stat grid */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {[
                    { l: "INIT", v: p.init },
                    { l: "AC", v: p.ac },
                  ].map(({ l, v }) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: fg, lineHeight: 1 }}>{v}</div>
                      <div style={{ fontFamily: "Alegreya Sans, serif", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, marginTop: 1 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginBottom: 10 }}>Actions</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{
            background: accent,
            color: dark ? G.bgDark : "#fff",
            border: "none",
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}>Add Monster</button>
          <button style={{
            background: "transparent",
            color: fg,
            border: `1px solid ${border}`,
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 600,
            cursor: "pointer",
          }}>Roll Initiative</button>
          <button style={{
            background: dark ? G.surfaceStrongDark : G.surfaceStrong,
            color: G.hpLow,
            border: `1px solid ${G.hpLowBg}`,
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 600,
            cursor: "pointer",
          }}>− Damage</button>
          <button style={{
            background: dark ? "rgba(45,122,58,0.15)" : G.hpFullBg,
            color: G.hpFull,
            border: `1px solid ${G.hpFullBg}`,
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 600,
            cursor: "pointer",
          }}>+ Heal</button>
        </div>
      </div>

      {/* Inputs */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginBottom: 10 }}>Inputs</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, display: "block", marginBottom: 4 }}>Search Bestiary</label>
            <input
              readOnly
              defaultValue="Adult Red Dragon"
              style={{
                width: "100%",
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: surfaceStrong,
                color: fg,
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "Alegreya Sans, serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, display: "block", marginBottom: 4 }}>HP Delta</label>
              <input
                readOnly
                defaultValue="24"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: `1px solid ${dark ? "rgba(232,176,96,0.4)" : "rgba(139,82,32,0.3)"}`,
                  background: surfaceStrong,
                  color: fg,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: `0 0 0 2px ${dark ? "rgba(232,176,96,0.15)" : "rgba(139,82,32,0.12)"}`,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, display: "block", marginBottom: 4 }}>Initiative</label>
              <input
                readOnly
                defaultValue="18"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: surfaceStrong,
                  color: fg,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginBottom: 10 }}>Quick Stats</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { l: "STR", v: "18", mod: "+4" },
            { l: "DEX", v: "14", mod: "+2" },
            { l: "CON", v: "16", mod: "+3" },
            { l: "INT", v: "10", mod: "+0" },
          ].map(({ l, v, mod }) => (
            <div key={l} style={{ background: surfaceStrong, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${border}` }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: fg, lineHeight: 1 }}>{v}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: accent, marginTop: 2 }}>{mod}</div>
              <div style={{ fontFamily: "Alegreya Sans, serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Obsidian Direction ───────────────────────────────────────────────────────

function ObsidianSection() {
  const participants = [
    { name: "Thornwick", kind: "PC", init: 18, ac: 16, hp: 32, maxHp: 32, conditions: ["Blessed"], active: true },
    { name: "Adult Red Dragon", kind: "MONSTER", init: 14, ac: 19, hp: 127, maxHp: 230, conditions: ["Frightened"], active: false },
    { name: "Mira Sablewood", kind: "PC", init: 12, ac: 14, hp: 8, maxHp: 28, conditions: [], active: false },
    { name: "Guard Captain", kind: "NPC", init: 10, ac: 15, hp: 45, maxHp: 45, conditions: [], active: false },
  ];

  const card: React.CSSProperties = {
    background: O.surface,
    border: `1px solid ${O.border}`,
    borderRadius: 16,
    padding: "16px 20px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.6)",
  };

  return (
    <div style={{ background: O.bg, padding: 24, borderRadius: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: O.muted, marginBottom: 4 }}>Direction B</p>
        <h2 style={{ fontFamily: "Marcellus, serif", fontSize: 26, color: O.fg, letterSpacing: "0.02em", margin: 0 }}>
          Obsidian Forge
        </h2>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 13, color: O.muted, marginTop: 4 }}>
          Dark-first. Gold accent. Maximum density at the table.
        </p>
      </div>

      {/* Color palette */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginBottom: 10 }}>Palette</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "bg", color: O.bg },
            { label: "surface", color: O.surface },
            { label: "surface-strong", color: O.surfaceStrong },
            { label: "surface-raised", color: O.surfaceRaised },
            { label: "accent", color: O.accent },
            { label: "accent-strong", color: O.accentStrong },
            { label: "danger", color: O.danger },
            { label: "heal", color: O.heal },
            { label: "muted", color: O.muted },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: color, border: `1px solid ${O.border}` }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: O.muted, textAlign: "center" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginBottom: 12 }}>Typography</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontFamily: "Marcellus, serif", fontSize: 28, color: O.fg, margin: 0, lineHeight: 1.1 }}>The Dragon's Lair</p>
          <p style={{ fontFamily: "Marcellus, serif", fontSize: 18, color: O.accent, margin: 0, letterSpacing: "0.02em" }}>Encounter — Round 3</p>
          <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 14, color: O.fgSub, margin: 0, lineHeight: 1.6, maxWidth: 360 }}>
            The red dragon rises from the rubble, wings spread wide. Each player must make a DC 16 Wisdom saving throw.
          </p>
          <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 12, color: O.muted, margin: 0 }}>Secondary label — Alegreya Sans 12</p>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: O.accent, margin: 0 }}>+7 · 4d6+3 · AC 19 · HP 127/230</p>
        </div>
      </div>

      {/* Combat tracker */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontFamily: "Marcellus, serif", fontSize: 16, color: O.fg, margin: 0 }}>Combat Tracker</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: O.danger, boxShadow: `0 0 6px ${O.danger}` }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: O.accent, letterSpacing: "0.08em" }}>ROUND 3 · LIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {participants.map((p, i) => {
            const isActive = p.active;
            const hpPct = p.hp / p.maxHp;
            const hpColor = hpPct > 0.74 ? O.hpFull : hpPct > 0.25 ? O.hpMid : O.hpLow;
            const hpBg = hpPct > 0.74 ? O.hpFullBg : hpPct > 0.25 ? O.hpMidBg : O.hpLowBg;

            return (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: isActive ? O.activeBg : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                  border: isActive ? `1px solid ${O.activeBorder}` : `1px solid transparent`,
                  boxShadow: isActive ? `inset 0 0 0 1px ${O.accentGlow}` : undefined,
                  transition: "all 0.15s",
                }}
              >
                {/* Initiative badge */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: isActive ? O.accent : O.surfaceStrong,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive ? O.bg : O.fg,
                }}>
                  {p.init}
                </div>

                {/* Avatar circle */}
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: O.surfaceRaised,
                  border: isActive ? `2px solid ${O.accent}` : `2px solid ${O.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "Marcellus, serif",
                  fontSize: 11,
                  color: isActive ? O.accent : O.muted,
                }}>
                  {p.name[0]}
                </div>

                {/* Name + HP bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{
                      fontFamily: "Alegreya Sans, serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: isActive ? O.accentStrong : O.fg,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {p.name}
                    </span>
                    <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: O.muted, flexShrink: 0 }}>
                      {p.kind}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <div style={{ flex: 1, background: hpBg, borderRadius: 999, height: 5, overflow: "hidden" }}>
                      <div style={{ width: `${hpPct * 100}%`, height: "100%", background: hpColor, borderRadius: 999, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: hpColor, whiteSpace: "nowrap" }}>
                      {p.hp}/{p.maxHp}
                    </span>
                  </div>
                </div>

                {/* Conditions */}
                {p.conditions.length > 0 && (
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    {p.conditions.map((c) => (
                      <span key={c} style={{
                        fontFamily: "Alegreya Sans, serif",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: O.condBg,
                        color: O.condFg,
                        border: `1px solid ${O.borderAccent}`,
                      }}>{c}</span>
                    ))}
                  </div>
                )}

                {/* AC badge */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: O.surfaceStrong,
                  border: `1px solid ${O.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: O.fg, lineHeight: 1 }}>{p.ac}</span>
                  <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: O.muted }}>AC</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginBottom: 10 }}>Actions</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{
            background: O.accent,
            color: O.bg,
            border: "none",
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 0 12px ${O.accentGlow}`,
          }}>Add Monster</button>
          <button style={{
            background: "transparent",
            color: O.fgSub,
            border: `1px solid ${O.border}`,
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 600,
            cursor: "pointer",
          }}>Roll Initiative</button>
          <button style={{
            background: O.dangerBg,
            color: O.danger,
            border: `1px solid rgba(220,74,74,0.2)`,
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 600,
            cursor: "pointer",
          }}>− Damage</button>
          <button style={{
            background: O.healBg,
            color: O.heal,
            border: `1px solid rgba(76,175,125,0.2)`,
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 13,
            fontFamily: "Alegreya Sans, serif",
            fontWeight: 600,
            cursor: "pointer",
          }}>+ Heal</button>
        </div>
      </div>

      {/* Inputs */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginBottom: 10 }}>Inputs</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: O.muted, display: "block", marginBottom: 4 }}>Search Bestiary</label>
            <input
              readOnly
              defaultValue="Adult Red Dragon"
              style={{
                width: "100%",
                borderRadius: 10,
                border: `1px solid ${O.border}`,
                background: O.surfaceStrong,
                color: O.fg,
                padding: "9px 12px",
                fontSize: 13,
                fontFamily: "Alegreya Sans, serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: O.muted, display: "block", marginBottom: 4 }}>HP Delta</label>
              <input
                readOnly
                defaultValue="24"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: `1px solid ${O.accentStrong}`,
                  background: O.surfaceStrong,
                  color: O.fg,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: `0 0 0 2px ${O.accentGlow}`,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: O.muted, display: "block", marginBottom: 4 }}>Initiative</label>
              <input
                readOnly
                defaultValue="18"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: `1px solid ${O.border}`,
                  background: O.surfaceStrong,
                  color: O.fg,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginBottom: 10 }}>Quick Stats</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { l: "STR", v: "18", mod: "+4" },
            { l: "DEX", v: "14", mod: "+2" },
            { l: "CON", v: "16", mod: "+3" },
            { l: "INT", v: "10", mod: "+0" },
          ].map(({ l, v, mod }) => (
            <div key={l} style={{
              background: O.surfaceStrong,
              borderRadius: 12,
              padding: "12px 8px",
              textAlign: "center",
              border: `1px solid ${O.border}`,
            }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: O.fg, lineHeight: 1 }}>{v}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: O.accent, marginTop: 2 }}>{mod}</div>
              <div style={{ fontFamily: "Alegreya Sans, serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* New token: Difficulty badge */}
      <div style={card}>
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: O.muted, marginBottom: 10 }}>Semantic Badges</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "Easy", bg: "rgba(76,175,125,0.12)", fg: O.heal, border: "rgba(76,175,125,0.25)" },
            { label: "Medium", bg: "rgba(212,168,67,0.12)", fg: O.hpMid, border: "rgba(212,168,67,0.25)" },
            { label: "Hard", bg: "rgba(220,74,74,0.12)", fg: O.danger, border: "rgba(220,74,74,0.25)" },
            { label: "Deadly", bg: "rgba(160,40,40,0.2)", fg: "#FF6060", border: "rgba(160,40,40,0.4)" },
            { label: "Frightened", bg: O.condBg, fg: O.condFg, border: O.borderAccent },
            { label: "Blessed", bg: "rgba(94,106,210,0.12)", fg: "#8B9FE8", border: "rgba(94,106,210,0.25)" },
          ].map(({ label, bg: bBg, fg: bFg, border: bBorder }) => (
            <span key={label} style={{
              fontFamily: "Alegreya Sans, serif",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: bBg,
              color: bFg,
              border: `1px solid ${bBorder}`,
            }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Design Notes Panel ───────────────────────────────────────────────────────

function DesignNotes({ theme }: { theme: "grimoire" | "obsidian" }) {
  const isG = theme === "grimoire";
  const bg = isG ? "#F5EFE6" : O.bg;
  const surface = isG ? G.surface : O.surface;
  const fg = isG ? G.fg : O.fg;
  const muted = isG ? G.muted : O.muted;
  const accent = isG ? G.accent : O.accent;
  const border = isG ? G.border : O.border;

  const notes = isG
    ? [
        ["Identity", "Evolved version of the existing parchment aesthetic. Familiar to anyone who has used the app."],
        ["Warmth", "Deeper amber tones with more saturation on the accent. Warmer surfaceStrong for better depth."],
        ["Typography", "Marcellus stays as display font. Alegreya Sans body. HP numbers render larger in JetBrains Mono."],
        ["Combat row", "Active combatant gets a warm amber tint + left border accent. No layout shift on activation."],
        ["Buttons", "Rounded (pill shape) for all actions. Damage/Heal get semantic tints, not just color."],
        ["Radius", "All cards at 16px. Inputs at 12px. Slight tightening from current 16/xl."],
        ["Migration", "Incremental — update CSS custom properties only. No component rewrites needed."],
      ]
    : [
        ["Identity", "Bold, high-contrast dark theme designed to be legible at a dim table with 6 players."],
        ["Gold accent", "#C9973A — warm old gold that works as interactive affordance without feeling tech-y."],
        ["Initiative badge", "Square badge (not circle avatar) makes INIT the first thing you read in a row."],
        ["Danger/Heal", "Semantic red/green used only for HP actions. Never used decoratively."],
        ["Radius", "Cards at 16px, buttons at 10px (slightly squared — more serious, tool-like feel)."],
        ["Glow effects", "Subtle accent glow on primary buttons and active rows only. Never decorative."],
        ["Typography", "Same font stack. Obsidian accent color shifts to gold on dark = instant recognition."],
        ["Migration", "Requires new CSS custom properties. Some component updates for border-radius changes."],
      ];

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 20px" }}>
      <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, marginBottom: 12 }}>Design Notes</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map(([title, body]) => (
          <div key={title} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8 }}>
            <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 11, fontWeight: 700, color: accent, paddingTop: 1 }}>{title}</span>
            <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 12, color: fg, lineHeight: 1.5 }}>{body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const [grimoireMode, setGrimoireMode] = useState<"light" | "dark">("light");

  return (
    <div style={{ minHeight: "100vh", background: "#111", padding: "32px 24px", boxSizing: "border-box" }}>
      {/* Page header */}
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px" }}>
            /design-system
          </p>
          <h1 style={{ fontFamily: "Marcellus, serif", fontSize: 36, color: "#F0E5D0", margin: "0 0 8px", letterSpacing: "0.02em" }}>
            DnD DM App — Design System Mock-up
          </h1>
          <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 15, color: "#888", margin: 0, maxWidth: 600 }}>
            Two design directions. Same font stack and token structure. Pick one or blend elements from both.
          </p>
        </div>

        {/* Direction labels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "Marcellus, serif", fontSize: 15, color: "#C8A060", letterSpacing: "0.04em" }}>A — Grimoire</span>
            <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 12, color: "#555" }}>Warm parchment, evolved</span>
            <button
              onClick={() => setGrimoireMode(m => m === "light" ? "dark" : "light")}
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.05)",
                color: "#888",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                fontFamily: "Alegreya Sans, serif",
                cursor: "pointer",
              }}
            >
              Toggle {grimoireMode === "light" ? "dark" : "light"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "Marcellus, serif", fontSize: 15, color: "#C9973A", letterSpacing: "0.04em" }}>B — Obsidian</span>
            <span style={{ fontFamily: "Alegreya Sans, serif", fontSize: 12, color: "#555" }}>Dark-first, gold accent</span>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Grimoire */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <GrimoireSection dark={grimoireMode === "dark"} />
            <DesignNotes theme="grimoire" />
          </div>

          {/* Obsidian */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ObsidianSection />
            <DesignNotes theme="obsidian" />
          </div>
        </div>

        {/* Token comparison */}
        <div style={{ marginTop: 24, background: "#16161C", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
          <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#555", marginBottom: 16 }}>CSS Token Comparison</p>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: "6px 16px" }}>
            {/* Header */}
            {["Token", "Grimoire Light → Dark", "Obsidian"].map(h => (
              <span key={h} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{h}</span>
            ))}
            {/* Rows */}
            {[
              ["--background", `#F5EFE6 → #0D0A07`, "#0E0E12"],
              ["--surface", `#FBF5EA → #171109`, "#16161C"],
              ["--surface-strong", `#EDE0CB → #201810`, "#1E1E26"],
              ["--accent", `#8B5220 → #E8B060`, "#C9973A"],
              ["--accent-strong", `#5C3010 → #F5CC88`, "#E8BB60"],
              ["--foreground", `#1C1812 → #F0E5D0`, "#F0EBE0"],
              ["--muted", `#6B5C4D → #A89070`, "#7A7060"],
              ["--hp-full", `#2D7A3A (same)`, "#4CAF7D"],
              ["--hp-mid", `#8A6200 (same)`, "#D4A843"],
              ["--hp-low", `#B83030 (same)`, "#DC4A4A"],
              ["--border", `rgba(0,0,0,0.10)`, "rgba(255,255,255,0.07)"],
              ["--radius-card", `16px`, "16px"],
              ["--radius-btn", `999px (pill)`, "10px (squared)"],
            ].map(([token, grim, obs]) => (
              <>
                <span key={token + "t"} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#C9973A" }}>{token}</span>
                <span key={token + "g"} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#C8BFB0" }}>{grim}</span>
                <span key={token + "o"} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#C8BFB0" }}>{obs}</span>
              </>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ fontFamily: "Alegreya Sans, serif", fontSize: 12, color: "#444", textAlign: "center", marginTop: 24 }}>
          Both directions keep Marcellus · Alegreya Sans · JetBrains Mono — no font changes required.
          All combat logic, state, and interaction patterns are unchanged.
        </p>
      </div>
    </div>
  );
}
