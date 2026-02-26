"""Generate SVG token portraits for all SRD monsters."""
import pathlib, textwrap

OUT = pathlib.Path(__file__).parent

def tok(bg1, bg2, body):
    """Wrap body SVG in a standard circular token frame."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">'
        f'<circle cx="100" cy="100" r="100" fill="{bg1}"/>'
        f'<circle cx="100" cy="100" r="96" fill="{bg2}"/>'
        f'{body}'
        f'</svg>'
    )

def eyes(lx, rx, y, r=6, iris="#d4a000", pupil="#111"):
    return (
        f'<ellipse cx="{lx}" cy="{y}" rx="{r}" ry="{int(r*0.85)}" fill="#111"/>'
        f'<ellipse cx="{rx}" cy="{y}" rx="{r}" ry="{int(r*0.85)}" fill="#111"/>'
        f'<ellipse cx="{lx}" cy="{y}" rx="{int(r*0.6)}" ry="{int(r*0.6)}" fill="{iris}"/>'
        f'<ellipse cx="{rx}" cy="{y}" rx="{int(r*0.6)}" ry="{int(r*0.6)}" fill="{iris}"/>'
        f'<ellipse cx="{lx}" cy="{y}" rx="{int(r*0.3)}" ry="{int(r*0.45)}" fill="{pupil}"/>'
        f'<ellipse cx="{rx}" cy="{y}" rx="{int(r*0.3)}" ry="{int(r*0.45)}" fill="{pupil}"/>'
    )

def glow_eyes(lx, rx, y, r=7, color="#ff4444"):
    return (
        f'<ellipse cx="{lx}" cy="{y}" rx="{r+3}" ry="{r+3}" fill="{color}" opacity="0.3"/>'
        f'<ellipse cx="{rx}" cy="{y}" rx="{r+3}" ry="{r+3}" fill="{color}" opacity="0.3"/>'
        f'<ellipse cx="{lx}" cy="{y}" rx="{r}" ry="{r}" fill="{color}"/>'
        f'<ellipse cx="{rx}" cy="{y}" rx="{r}" ry="{r}" fill="{color}"/>'
    )

def empty_eye_sockets(lx, rx, y, r=9):
    return (
        f'<ellipse cx="{lx}" cy="{y}" rx="{r}" ry="{int(r*0.75)}" fill="#0d0d0d"/>'
        f'<ellipse cx="{rx}" cy="{y}" rx="{r}" ry="{int(r*0.75)}" fill="#0d0d0d"/>'
    )

MONSTERS = {}

# ── Orc ──────────────────────────────────────────────────────────────────────
MONSTERS["orc"] = tok("#2a1a05", "#3d2508",
    # head
    '<ellipse cx="100" cy="108" rx="48" ry="50" fill="#7a9c42"/>'
    # brow
    '<ellipse cx="100" cy="82" rx="40" ry="10" fill="#5e7e30"/>'
    # frown lines
    '<path d="M75 88 Q84 80 93 88" stroke="#3d5218" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<path d="M125 88 Q116 80 107 88" stroke="#3d5218" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + eyes(83, 117, 96, r=7, iris="#d46000")
    # nose
    + '<ellipse cx="100" cy="112" rx="10" ry="7" fill="#5e7e30"/>'
    '<circle cx="94" cy="113" r="4" fill="#3d5218"/>'
    '<circle cx="106" cy="113" r="4" fill="#3d5218"/>'
    # tusks
    + '<path d="M85 138 L80 128 L90 130 Z" fill="#f0e8c0"/>'
    '<path d="M115 138 L120 128 L110 130 Z" fill="#f0e8c0"/>'
    # mouth
    + '<path d="M80 132 Q100 144 120 132" stroke="#2a1a05" stroke-width="2.5" fill="#2a1a05"/>'
    # ears
    + '<ellipse cx="51" cy="100" rx="9" ry="14" fill="#7a9c42" transform="rotate(-15 51 100)"/>'
    '<ellipse cx="149" cy="100" rx="9" ry="14" fill="#7a9c42" transform="rotate(15 149 100)"/>'
)

# ── Wolf ──────────────────────────────────────────────────────────────────────
MONSTERS["wolf"] = tok("#1a1a1a", "#2c2c2c",
    # ears
    '<path d="M64 68 L54 40 L84 62 Z" fill="#5a5a5a"/>'
    '<path d="M136 68 L146 40 L116 62 Z" fill="#5a5a5a"/>'
    '<path d="M67 67 L60 48 L80 64 Z" fill="#3a3030"/>'
    '<path d="M133 67 L140 48 L120 64 Z" fill="#3a3030"/>'
    # head
    + '<ellipse cx="100" cy="105" rx="50" ry="48" fill="#6e6e6e"/>'
    # snout
    + '<ellipse cx="100" cy="125" rx="28" ry="20" fill="#5a5a5a"/>'
    '<ellipse cx="100" cy="117" rx="25" ry="14" fill="#aaaaaa"/>'
    # nose
    + '<ellipse cx="100" cy="112" rx="12" ry="8" fill="#1a1a1a"/>'
    '<ellipse cx="96" cy="110" rx="4" ry="3" fill="#444" opacity="0.5"/>'
    # mouth
    + '<path d="M80 126 Q100 138 120 126" stroke="#1a1a1a" stroke-width="2" fill="none"/>'
    '<path d="M100 126 L100 134" stroke="#1a1a1a" stroke-width="2"/>'
    + eyes(82, 118, 94, r=7, iris="#c8a800", pupil="#111")
    # forehead fur
    + '<path d="M70 85 Q100 78 130 85" stroke="#888" stroke-width="3" fill="none" stroke-linecap="round"/>'
)

# ── Kobold ────────────────────────────────────────────────────────────────────
MONSTERS["kobold"] = tok("#1a0505", "#2d0a0a",
    # head (triangular/lizard)
    '<polygon points="100,60 145,130 55,130" fill="#8b3a2a"/>'
    '<ellipse cx="100" cy="115" rx="38" ry="32" fill="#8b3a2a"/>'
    # snout
    + '<ellipse cx="100" cy="120" rx="20" ry="14" fill="#7a2e1e"/>'
    # nostrils
    + '<circle cx="94" cy="118" r="3" fill="#4a1a0e"/>'
    '<circle cx="106" cy="118" r="3" fill="#4a1a0e"/>'
    # horns
    + '<path d="M74 74 L64 42 L82 68" fill="#4a2418" stroke="#3a1a0a" stroke-width="1"/>'
    '<path d="M126 74 L136 42 L118 68" fill="#4a2418" stroke="#3a1a0a" stroke-width="1"/>'
    # eyes
    + eyes(82, 118, 100, r=8, iris="#e8b000", pupil="#1a0505")
    # slit pupils override
    + '<ellipse cx="82" cy="100" rx="2.5" ry="6" fill="#1a0505"/>'
    '<ellipse cx="118" cy="100" rx="2.5" ry="6" fill="#1a0505"/>'
    # teeth
    + '<path d="M86 130 L83 138 L90 134 Z" fill="#e0d8b0"/>'
    '<path d="M114 130 L117 138 L110 134 Z" fill="#e0d8b0"/>'
    '<path d="M93 132 L91 140 L97 136 Z" fill="#e0d8b0"/>'
    '<path d="M107 132 L109 140 L103 136 Z" fill="#e0d8b0"/>'
)

# ── Bandit ────────────────────────────────────────────────────────────────────
MONSTERS["bandit"] = tok("#1a0f0a", "#2a1810",
    # hood
    '<ellipse cx="100" cy="80" rx="52" ry="44" fill="#3a2a1a"/>'
    # face
    + '<ellipse cx="100" cy="108" rx="38" ry="40" fill="#c8956a"/>'
    # bandana across lower face
    + '<rect x="60" y="116" width="80" height="26" rx="4" fill="#8b1a1a"/>'
    # eyes peering out
    + eyes(83, 117, 100, r=7, iris="#4a6a2a", pupil="#111")
    + '<circle cx="87" cy="96" r="2" fill="white" opacity="0.6"/>'
    '<circle cx="121" cy="96" r="2" fill="white" opacity="0.6"/>'
    # scar
    + '<path d="M108 88 L118 106" stroke="#9a6040" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>'
    # hood shadow
    + '<path d="M56 80 Q60 55 100 52 Q140 55 144 80" fill="#2a1a0a" opacity="0.5"/>'
)

# ── Guard ─────────────────────────────────────────────────────────────────────
MONSTERS["guard"] = tok("#1a1a2a", "#252535",
    # helmet
    '<ellipse cx="100" cy="78" rx="48" ry="38" fill="#707080"/>'
    '<rect x="54" y="78" width="92" height="14" fill="#606070"/>'
    # nose guard
    + '<rect x="96" y="84" width="8" height="28" rx="3" fill="#555565"/>'
    # face
    + '<ellipse cx="100" cy="114" rx="34" ry="30" fill="#d4a070"/>'
    # cheek guards
    + '<rect x="58" y="92" width="20" height="30" rx="5" fill="#606070"/>'
    '<rect x="122" y="92" width="20" height="30" rx="5" fill="#606070"/>'
    # visor slot
    + '<rect x="68" y="90" width="64" height="16" rx="3" fill="#1a1a22"/>'
    + eyes(83, 117, 98, r=6, iris="#4a5a9a", pupil="#111")
    + '<circle cx="86" cy="94" r="1.5" fill="white" opacity="0.7"/>'
    '<circle cx="120" cy="94" r="1.5" fill="white" opacity="0.7"/>'
    # chin strap
    + '<path d="M70 118 Q100 130 130 118" stroke="#555" stroke-width="3" fill="none"/>'
)

# ── Skeleton ──────────────────────────────────────────────────────────────────
MONSTERS["skeleton"] = tok("#0a0a0a", "#151510",
    # skull
    '<ellipse cx="100" cy="100" rx="48" ry="50" fill="#e8e0c8"/>'
    '<ellipse cx="100" cy="115" rx="30" ry="18" fill="#d4ccb0"/>'
    # crack
    + '<path d="M100 65 L96 82 L104 90 L98 100" stroke="#b8b0a0" stroke-width="2" fill="none"/>'
    # eye sockets
    + empty_eye_sockets(80, 120, 95, r=11)
    + '<ellipse cx="80" cy="95" rx="7" ry="6" fill="#1a1a0a" opacity="0.3"/>'
    '<ellipse cx="120" cy="95" rx="7" ry="6" fill="#1a1a0a" opacity="0.3"/>'
    # nasal cavity
    + '<path d="M96 112 L100 106 L104 112 Q102 116 100 116 Q98 116 96 112 Z" fill="#1a1a12"/>'
    # teeth
    + '<rect x="76" y="124" width="8" height="12" rx="2" fill="#f0e8d0"/>'
    '<rect x="86" y="124" width="8" height="14" rx="2" fill="#f0e8d0"/>'
    '<rect x="96" y="124" width="8" height="14" rx="2" fill="#f0e8d0"/>'
    '<rect x="106" y="124" width="8" height="14" rx="2" fill="#f0e8d0"/>'
    '<rect x="116" y="124" width="8" height="12" rx="2" fill="#f0e8d0"/>'
    '<rect x="76" y="122" width="48" height="4" fill="#c8c0a8"/>'
    # temple holes
    + '<circle cx="52" cy="100" r="8" fill="#e8e0c8"/>'
    '<circle cx="148" cy="100" r="8" fill="#e8e0c8"/>'
)

# ── Zombie ────────────────────────────────────────────────────────────────────
MONSTERS["zombie"] = tok("#0a1a0a", "#0d200d",
    # head
    '<ellipse cx="100" cy="108" rx="46" ry="50" fill="#6a7a5a"/>'
    # patches of decay
    + '<ellipse cx="75" cy="90" rx="14" ry="10" fill="#4a5a3a" opacity="0.6"/>'
    '<ellipse cx="128" cy="105" rx="10" ry="8" fill="#3a4a2a" opacity="0.6"/>'
    '<ellipse cx="95" cy="130" rx="12" ry="8" fill="#4a5a3a" opacity="0.5"/>'
    # blood
    + '<path d="M78 86 Q82 92 80 100" stroke="#7a1a1a" stroke-width="3" fill="none" opacity="0.7"/>'
    # sunken eyes
    + '<ellipse cx="82" cy="97" rx="13" ry="10" fill="#3a4a2a"/>'
    '<ellipse cx="118" cy="97" rx="13" ry="10" fill="#3a4a2a"/>'
    + glow_eyes(82, 118, 97, r=6, color="#cc6600")
    # nose
    + '<ellipse cx="100" cy="114" rx="8" ry="6" fill="#5a6a4a"/>'
    '<circle cx="95" cy="114" r="3" fill="#3a4a2a"/>'
    '<circle cx="105" cy="114" r="3" fill="#3a4a2a"/>'
    # gaping mouth
    + '<path d="M72 130 Q100 148 128 130 Q118 140 100 142 Q82 140 72 130 Z" fill="#1a1a0a"/>'
    '<path d="M78 130 L82 140" stroke="#d4ccb0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M90 132 L92 144" stroke="#d4ccb0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M110 132 L108 144" stroke="#d4ccb0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M122 130 L118 140" stroke="#d4ccb0" stroke-width="3" stroke-linecap="round"/>'
)

# ── Giant Rat ──────────────────────────────────────────────────────────────────
MONSTERS["giant-rat"] = tok("#1a1008", "#2a1a0a",
    # ears
    '<circle cx="68" cy="68" r="18" fill="#8a6040"/>'
    '<circle cx="132" cy="68" r="18" fill="#8a6040"/>'
    '<circle cx="68" cy="68" r="12" fill="#c08090"/>'
    '<circle cx="132" cy="68" r="12" fill="#c08090"/>'
    # head
    + '<ellipse cx="100" cy="110" rx="46" ry="44" fill="#8a7050"/>'
    # snout
    + '<ellipse cx="100" cy="126" rx="26" ry="18" fill="#7a5e40"/>'
    '<ellipse cx="100" cy="120" rx="22" ry="12" fill="#b09070"/>'
    # nose
    + '<ellipse cx="100" cy="114" rx="10" ry="7" fill="#c06080"/>'
    '<circle cx="95" cy="113" r="3" fill="#9a3060"/>'
    '<circle cx="105" cy="113" r="3" fill="#9a3060"/>'
    # whiskers
    + '<path d="M73 118 L46 110" stroke="#d0c8b0" stroke-width="1.5" opacity="0.8"/>'
    '<path d="M73 122 L44 118" stroke="#d0c8b0" stroke-width="1.5" opacity="0.8"/>'
    '<path d="M127 118 L154 110" stroke="#d0c8b0" stroke-width="1.5" opacity="0.8"/>'
    '<path d="M127 122 L156 118" stroke="#d0c8b0" stroke-width="1.5" opacity="0.8"/>'
    + eyes(80, 120, 100, r=7, iris="#cc2200", pupil="#4a0000")
    # teeth
    + '<rect x="92" y="130" width="7" height="13" rx="2" fill="#f0e8d0"/>'
    '<rect x="101" y="130" width="7" height="13" rx="2" fill="#f0e8d0"/>'
)

# ── Giant Spider ──────────────────────────────────────────────────────────────
MONSTERS["giant-spider"] = tok("#080808", "#101010",
    # chelicerae / fangs
    '<path d="M82 130 L70 155 L88 135" fill="#1a1a1a" stroke="#333" stroke-width="1"/>'
    '<path d="M118 130 L130 155 L112 135" fill="#1a1a1a" stroke="#333" stroke-width="1"/>'
    '<ellipse cx="79" cy="145" rx="5" ry="3" fill="#aa4422" transform="rotate(-30 79 145)"/>'
    '<ellipse cx="121" cy="145" rx="5" ry="3" fill="#aa4422" transform="rotate(30 121 145)"/>'
    # body
    + '<ellipse cx="100" cy="108" rx="52" ry="50" fill="#1e1e1e"/>'
    # sheen
    + '<ellipse cx="88" cy="88" rx="20" ry="16" fill="#333" opacity="0.5"/>'
    # 8 eyes
    + '<circle cx="75" cy="88" r="7" fill="#111"/><circle cx="75" cy="88" r="5" fill="#cc0000"/><circle cx="74" cy="87" r="2" fill="white" opacity="0.5"/>'
    '<circle cx="91" cy="82" r="7" fill="#111"/><circle cx="91" cy="82" r="5" fill="#cc0000"/><circle cx="90" cy="81" r="2" fill="white" opacity="0.5"/>'
    '<circle cx="109" cy="82" r="7" fill="#111"/><circle cx="109" cy="82" r="5" fill="#cc0000"/><circle cx="108" cy="81" r="2" fill="white" opacity="0.5"/>'
    '<circle cx="125" cy="88" r="7" fill="#111"/><circle cx="125" cy="88" r="5" fill="#cc0000"/><circle cx="124" cy="87" r="2" fill="white" opacity="0.5"/>'
    '<circle cx="80" cy="104" r="5" fill="#111"/><circle cx="80" cy="104" r="3" fill="#880000"/>'
    '<circle cx="94" cy="100" r="5" fill="#111"/><circle cx="94" cy="100" r="3" fill="#880000"/>'
    '<circle cx="106" cy="100" r="5" fill="#111"/><circle cx="106" cy="100" r="3" fill="#880000"/>'
    '<circle cx="120" cy="104" r="5" fill="#111"/><circle cx="120" cy="104" r="3" fill="#880000"/>'
    # legs hint
    + '<path d="M50 95 L30 75" stroke="#222" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M50 108 L25 105" stroke="#222" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M150 95 L170 75" stroke="#222" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M150 108 L175 105" stroke="#222" stroke-width="5" stroke-linecap="round"/>'
)

# ── Brown Bear ────────────────────────────────────────────────────────────────
MONSTERS["brown-bear"] = tok("#1a0e05", "#2a1808",
    # ears
    '<circle cx="68" cy="68" r="20" fill="#6a4020"/>'
    '<circle cx="132" cy="68" r="20" fill="#6a4020"/>'
    '<circle cx="68" cy="68" r="12" fill="#4a2a10"/>'
    '<circle cx="132" cy="68" r="12" fill="#4a2a10"/>'
    # head
    + '<ellipse cx="100" cy="112" rx="54" ry="50" fill="#7a5030"/>'
    # muzzle
    + '<ellipse cx="100" cy="128" rx="32" ry="22" fill="#a07050"/>'
    '<ellipse cx="100" cy="122" rx="28" ry="16" fill="#b88060"/>'
    # nose
    + '<ellipse cx="100" cy="113" rx="14" ry="10" fill="#2a1808"/>'
    '<ellipse cx="95" cy="111" rx="5" ry="3" fill="#3a2010" opacity="0.5"/>'
    # mouth
    + '<path d="M84 127 Q92 134 100 130 Q108 134 116 127" stroke="#2a1808" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M100 130 L100 135" stroke="#2a1808" stroke-width="2"/>'
    + eyes(82, 118, 100, r=7, iris="#5a3000", pupil="#111")
    + '<circle cx="85" cy="96" r="2" fill="white" opacity="0.6"/>'
    '<circle cx="121" cy="96" r="2" fill="white" opacity="0.6"/>'
)

# ── Ghoul ─────────────────────────────────────────────────────────────────────
MONSTERS["ghoul"] = tok("#080d08", "#0d150d",
    # claws hint at top
    '<path d="M68 58 L58 38 M68 58 L56 48 M68 58 L52 60" stroke="#8a9a7a" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M132 58 L142 38 M132 58 L144 48 M132 58 L148 60" stroke="#8a9a7a" stroke-width="3" stroke-linecap="round"/>'
    # head
    + '<ellipse cx="100" cy="108" rx="48" ry="52" fill="#7a8a6a"/>'
    # sunken eyes deep
    + '<ellipse cx="80" cy="95" rx="16" ry="12" fill="#3a4a2a"/>'
    '<ellipse cx="120" cy="95" rx="16" ry="12" fill="#3a4a2a"/>'
    + glow_eyes(80, 120, 95, r=7, color="#88ff44")
    # nose: two slits
    + '<ellipse cx="96" cy="115" rx="4" ry="6" fill="#3a4a2a"/>'
    '<ellipse cx="104" cy="115" rx="4" ry="6" fill="#3a4a2a"/>'
    # wide gaping mouth
    + '<path d="M66 130 Q100 155 134 130 Q128 144 100 148 Q72 144 66 130 Z" fill="#1a1a0a"/>'
    # ragged teeth
    + '<path d="M72 130 L76 142" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M83 134 L86 148" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M100 136 L100 152" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M117 134 L114 148" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M128 130 L124 142" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    # upper teeth
    + '<path d="M74 130 L78 120" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M86 133 L89 122" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M100 134 L100 122" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M114 133 L111 122" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M126 130 L122 120" stroke="#c8c0a0" stroke-width="3" stroke-linecap="round"/>'
)

# ── Scout ─────────────────────────────────────────────────────────────────────
MONSTERS["scout"] = tok("#101808", "#182210",
    # hood / ranger cowl
    '<ellipse cx="100" cy="80" rx="52" ry="44" fill="#3a4a28"/>'
    '<path d="M52 82 Q56 50 100 46 Q144 50 148 82 Q130 74 100 72 Q70 74 52 82 Z" fill="#2d3a1e"/>'
    # face in shadow
    + '<ellipse cx="100" cy="112" rx="36" ry="36" fill="#c8906a"/>'
    # shadow from hood
    + '<path d="M60 90 Q100 96 140 90 Q134 106 100 104 Q66 106 60 90 Z" fill="#1a2210" opacity="0.5"/>'
    # keen eyes
    + eyes(83, 117, 102, r=6, iris="#2a5a2a", pupil="#111")
    + '<circle cx="86" cy="99" r="1.5" fill="white" opacity="0.7"/>'
    '<circle cx="120" cy="99" r="1.5" fill="white" opacity="0.7"/>'
    # determined expression
    + '<path d="M88 115 Q100 122 112 115" stroke="#9a6040" stroke-width="2" fill="none" stroke-linecap="round"/>'
    # quiver hint
    + '<rect x="142" y="70" width="8" height="40" rx="3" fill="#5a4020"/>'
    '<path d="M143 72 L149 72 M143 78 L149 78 M143 84 L149 84" stroke="#c8a050" stroke-width="1.5"/>'
)

# ── Thug ──────────────────────────────────────────────────────────────────────
MONSTERS["thug"] = tok("#100808", "#1a0e0e",
    # shaved/short hair
    '<ellipse cx="100" cy="74" rx="50" ry="38" fill="#3a2818"/>'
    # face
    + '<ellipse cx="100" cy="108" rx="44" ry="44" fill="#c8906a"/>'
    # scar on cheek
    + '<path d="M115 88 L122 108" stroke="#9a5030" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M116 88 L118 98" stroke="#b87050" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>'
    # broken nose
    + '<path d="M98 104 L100 110 L104 108" stroke="#a06040" stroke-width="3" fill="none" stroke-linecap="round"/>'
    # mean squinting eyes
    + '<path d="M72 95 L96 95" stroke="#3a2010" stroke-width="3.5" stroke-linecap="round"/>'
    '<path d="M104 95 L128 95" stroke="#3a2010" stroke-width="3.5" stroke-linecap="round"/>'
    + eyes(84, 116, 97, r=5, iris="#5a3a1a", pupil="#111")
    # stubble
    + '<ellipse cx="100" cy="124" rx="30" ry="14" fill="#b07860" opacity="0.3"/>'
    '<path d="M78 118 L78 124 M84 116 L84 124 M90 116 L90 124 M96 116 L96 124 M104 116 L104 124 M110 116 L110 124 M116 116 L116 124 M122 116 L122 124" stroke="#8a5830" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>'
    # frown
    + '<path d="M80 128 Q100 122 120 128" stroke="#8a5030" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
)

# ── Ape ───────────────────────────────────────────────────────────────────────
MONSTERS["ape"] = tok("#0a0a05", "#121208",
    # ears
    '<circle cx="54" cy="100" r="20" fill="#3a2818"/>'
    '<circle cx="146" cy="100" r="20" fill="#3a2818"/>'
    '<circle cx="54" cy="100" r="13" fill="#2a1810"/>'
    '<circle cx="146" cy="100" r="13" fill="#2a1810"/>'
    # head
    + '<ellipse cx="100" cy="104" rx="52" ry="50" fill="#2e2418"/>'
    # prominent brow ridge
    + '<ellipse cx="100" cy="85" rx="44" ry="12" fill="#1e1810"/>'
    '<path d="M58 88 Q100 78 142 88" fill="#1e1810"/>'
    # nostrils/flat nose
    + '<ellipse cx="100" cy="116" rx="18" ry="12" fill="#3a2818"/>'
    '<circle cx="93" cy="115" r="6" fill="#1a1008"/>'
    '<circle cx="107" cy="115" r="6" fill="#1a1008"/>'
    # muzzle
    + '<ellipse cx="100" cy="128" rx="28" ry="16" fill="#4a3428"/>'
    '<path d="M80 128 Q100 136 120 128" stroke="#1a1008" stroke-width="2" fill="none"/>'
    # deep-set eyes under brow
    + eyes(82, 118, 96, r=7, iris="#5a3a10", pupil="#111")
    + '<circle cx="85" cy="92" r="2" fill="white" opacity="0.5"/>'
    '<circle cx="121" cy="92" r="2" fill="white" opacity="0.5"/>'
)

# ── Dire Wolf ──────────────────────────────────────────────────────────────────
MONSTERS["dire-wolf"] = tok("#080808", "#121212",
    # large ears
    '<path d="M60 70 L48 36 L82 60 Z" fill="#2a2a2a"/>'
    '<path d="M140 70 L152 36 L118 60 Z" fill="#2a2a2a"/>'
    '<path d="M63 68 L55 44 L78 62 Z" fill="#1a1010"/>'
    '<path d="M137 68 L145 44 L122 62 Z" fill="#1a1010"/>'
    # head larger and darker than wolf
    + '<ellipse cx="100" cy="106" rx="54" ry="52" fill="#3a3030"/>'
    # snout
    + '<ellipse cx="100" cy="126" rx="32" ry="22" fill="#2a2020"/>'
    '<ellipse cx="100" cy="118" rx="28" ry="15" fill="#5a5050"/>'
    # nose
    + '<ellipse cx="100" cy="112" rx="14" ry="9" fill="#0a0808"/>'
    # menacing mouth / fang drip
    + '<path d="M76 128 Q100 142 124 128" stroke="#0a0808" stroke-width="2.5" fill="#0a0808"/>'
    '<path d="M82 128 L78 144 L86 136 Z" fill="#f0e8e0"/>'
    '<path d="M118 128 L122 144 L114 136 Z" fill="#f0e8e0"/>'
    + eyes(82, 118, 93, r=8, iris="#cc8800", pupil="#111")
    + '<circle cx="85" cy="89" r="2.5" fill="white" opacity="0.7"/>'
    '<circle cx="121" cy="89" r="2.5" fill="white" opacity="0.7"/>'
    # battle scars
    + '<path d="M62 86 L72 100" stroke="#6a5040" stroke-width="2" opacity="0.6"/>'
)

# ── Bugbear ───────────────────────────────────────────────────────────────────
MONSTERS["bugbear"] = tok("#1a1005", "#241808",
    # massive shaggy head
    '<ellipse cx="100" cy="100" rx="58" ry="56" fill="#6a5030"/>'
    '<ellipse cx="100" cy="80" rx="52" ry="32" fill="#4a3818"/>'
    # shaggy fur overlay
    + '<path d="M44 90 Q52 70 68 78 Q62 60 80 68 Q72 48 96 58 Q88 40 104 50 Q98 36 114 48 Q108 38 122 52 Q134 44 130 64 Q148 58 140 76 Q156 72 150 92" fill="#4a3010" opacity="0.5"/>'
    # face
    + '<ellipse cx="100" cy="112" rx="42" ry="38" fill="#8a7040"/>'
    # squashed nose
    + '<ellipse cx="100" cy="114" rx="14" ry="10" fill="#6a5030"/>'
    '<circle cx="93" cy="112" r="5" fill="#4a3818"/>'
    '<circle cx="107" cy="112" r="5" fill="#4a3818"/>'
    # small mean eyes
    + eyes(82, 118, 97, r=7, iris="#8a6020", pupil="#111")
    # frown
    + '<path d="M82 130 Q100 122 118 130" stroke="#3a2808" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M84 130 L80 142 L88 138 Z" fill="#d8d0a8"/>'
    '<path d="M116 130 L120 142 L112 138 Z" fill="#d8d0a8"/>'
)

# ── Hobgoblin ──────────────────────────────────────────────────────────────────
MONSTERS["hobgoblin"] = tok("#1a0505", "#280808",
    # military helm
    '<ellipse cx="100" cy="74" rx="50" ry="38" fill="#555560"/>'
    '<rect x="52" y="72" width="96" height="12" fill="#444450"/>'
    '<path d="M88 64 L100 40 L112 64" fill="#cc2222"/>'
    # face - red skin
    + '<ellipse cx="100" cy="112" rx="40" ry="36" fill="#cc4444"/>'
    # strong jaw / sneering
    + '<path d="M75 87 L84 80 L93 89" stroke="#882222" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M125 87 L116 80 L107 89" stroke="#882222" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + eyes(83, 117, 97, r=6, iris="#cc8800", pupil="#111")
    # flat nose
    + '<ellipse cx="100" cy="114" rx="9" ry="7" fill="#aa3030"/>'
    '<circle cx="95" cy="113" r="3" fill="#882020"/>'
    '<circle cx="105" cy="113" r="3" fill="#882020"/>'
    # stern mouth
    + '<path d="M82 127 L118 127" stroke="#882222" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    '<path d="M82 130 L84 138 L90 130" fill="#d8d0a8"/>'
    '<path d="M118 130 L116 138 L110 130" fill="#d8d0a8"/>'
    # chin strap
    + '<path d="M66 116 Q100 128 134 116" stroke="#444450" stroke-width="4" fill="none"/>'
)

# ── Gnoll ──────────────────────────────────────────────────────────────────────
MONSTERS["gnoll"] = tok("#1a1205", "#241808",
    # hyena-like ears
    '<path d="M64 72 L52 42 L80 68 Z" fill="#8a7040"/>'
    '<path d="M136 72 L148 42 L120 68 Z" fill="#8a7040"/>'
    '<path d="M66 70 L58 50 L78 66 Z" fill="#c09870"/>'
    '<path d="M134 70 L142 50 L122 66 Z" fill="#c09870"/>'
    # head
    + '<ellipse cx="100" cy="108" rx="50" ry="48" fill="#aa8850"/>'
    # snout / muzzle
    + '<ellipse cx="100" cy="125" rx="30" ry="22" fill="#8a6830"/>'
    '<ellipse cx="100" cy="118" rx="26" ry="14" fill="#c8a878"/>'
    # spots
    + '<circle cx="78" cy="100" r="6" fill="#7a5830" opacity="0.5"/>'
    '<circle cx="126" cy="96" r="5" fill="#7a5830" opacity="0.5"/>'
    '<circle cx="86" cy="118" r="5" fill="#7a5830" opacity="0.4"/>'
    '<circle cx="116" cy="115" r="4" fill="#7a5830" opacity="0.4"/>'
    # nose
    + '<ellipse cx="100" cy="114" rx="11" ry="8" fill="#3a2808"/>'
    # snarling mouth
    + '<path d="M76 128 Q100 142 124 128" stroke="#3a2808" stroke-width="2" fill="#3a2808"/>'
    '<path d="M82 128 L78 140 L86 134 Z" fill="#e0d8c0"/>'
    '<path d="M118 128 L122 140 L114 134 Z" fill="#e0d8c0"/>'
    + eyes(82, 118, 96, r=7, iris="#cc8800", pupil="#111")
)

# ── Ogre ──────────────────────────────────────────────────────────────────────
MONSTERS["ogre"] = tok("#1a0e05", "#281408",
    # huge lumpy head
    '<ellipse cx="100" cy="108" rx="58" ry="56" fill="#8a7050"/>'
    # warts
    + '<circle cx="70" cy="90" r="6" fill="#7a6040"/>'
    '<circle cx="78" cy="80" r="4" fill="#7a6040"/>'
    '<circle cx="130" cy="88" r="5" fill="#7a6040"/>'
    '<circle cx="115" cy="76" r="4" fill="#7a6040"/>'
    '<circle cx="92" cy="78" r="3" fill="#7a6040"/>'
    # dumb heavy brow
    + '<ellipse cx="100" cy="84" rx="50" ry="14" fill="#6a5030"/>'
    # tiny stupid eyes
    + eyes(82, 118, 93, r=6, iris="#5a3a10", pupil="#111")
    # big flat nose
    + '<ellipse cx="100" cy="116" rx="18" ry="14" fill="#7a5830"/>'
    '<circle cx="91" cy="115" r="7" fill="#5a3818"/>'
    '<circle cx="109" cy="115" r="7" fill="#5a3818"/>'
    # open dumb mouth
    + '<path d="M70 132 Q100 152 130 132 Q124 148 100 152 Q76 148 70 132 Z" fill="#2a1808"/>'
    # few big teeth
    + '<path d="M80 132 L78 144 L86 138 Z" fill="#e8e0c0"/>'
    '<path d="M95 134 L94 148 L100 142 L106 148 L105 134 Z" fill="#e8e0c0"/>'
    '<path d="M120 132 L122 144 L114 138 Z" fill="#e8e0c0"/>'
    # ears
    + '<ellipse cx="42" cy="104" rx="12" ry="18" fill="#8a7050"/>'
    '<ellipse cx="158" cy="104" rx="12" ry="18" fill="#8a7050"/>'
)

# ── Ankheg ────────────────────────────────────────────────────────────────────
MONSTERS["ankheg"] = tok("#1a1205", "#22180a",
    # segmented chitinous body segments
    '<ellipse cx="100" cy="135" rx="52" ry="20" fill="#7a8a3a"/>'
    '<ellipse cx="100" cy="118" rx="46" ry="20" fill="#8a9a44"/>'
    '<ellipse cx="100" cy="100" rx="52" ry="26" fill="#9aaa54"/>'
    # head (front-facing insect)
    + '<ellipse cx="100" cy="88" rx="44" ry="28" fill="#7a8a3a"/>'
    # compound eyes
    + '<ellipse cx="76" cy="80" rx="14" ry="12" fill="#2a2a1a"/>'
    '<ellipse cx="124" cy="80" rx="14" ry="12" fill="#2a2a1a"/>'
    '<ellipse cx="76" cy="80" rx="10" ry="9" fill="#4a8a1a"/>'
    '<ellipse cx="124" cy="80" rx="10" ry="9" fill="#4a8a1a"/>'
    '<circle cx="76" cy="80" r="5" fill="#2a5a0a" opacity="0.7"/>'
    '<circle cx="124" cy="80" r="5" fill="#2a5a0a" opacity="0.7"/>'
    # mandibles
    + '<path d="M72 100 L52 120 L66 106 Z" fill="#5a6a2a" stroke="#3a4a1a" stroke-width="1"/>'
    '<path d="M128 100 L148 120 L134 106 Z" fill="#5a6a2a" stroke="#3a4a1a" stroke-width="1"/>'
    '<path d="M76 102 L60 115" stroke="#4a5a1a" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M124 102 L140 115" stroke="#4a5a1a" stroke-width="3" stroke-linecap="round"/>'
    # antennae
    + '<path d="M82 72 Q70 52 60 38" stroke="#5a6a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    '<path d="M118 72 Q130 52 140 38" stroke="#5a6a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    # segment lines
    + '<path d="M52 118 Q100 110 148 118" stroke="#6a7a2a" stroke-width="1.5" fill="none"/>'
    '<path d="M56 135 Q100 126 144 135" stroke="#6a7a2a" stroke-width="1.5" fill="none"/>'
)

# ── Mimic ──────────────────────────────────────────────────────────────────────
MONSTERS["mimic"] = tok("#1a0e05", "#281808",
    # chest body
    '<rect x="30" y="80" width="140" height="90" rx="10" fill="#8b6030"/>'
    '<rect x="30" y="80" width="140" height="20" rx="8" fill="#7a5028"/>'
    # lock hasp
    + '<rect x="88" y="84" width="24" height="18" rx="4" fill="#c8a840"/>'
    '<circle cx="100" cy="93" r="5" fill="#a88830"/>'
    # lid hinges
    + '<rect x="44" y="90" width="10" height="8" rx="2" fill="#a88830"/>'
    '<rect x="146" y="90" width="10" height="8" rx="2" fill="#a88830"/>'
    # wood grain
    + '<path d="M40 106 Q100 102 160 106" stroke="#6a4018" stroke-width="1.5" fill="none" opacity="0.6"/>'
    '<path d="M38 118 Q100 114 162 118" stroke="#6a4018" stroke-width="1.5" fill="none" opacity="0.6"/>'
    '<path d="M38 130 Q100 126 162 130" stroke="#6a4018" stroke-width="1.5" fill="none" opacity="0.6"/>'
    # the MOUTH opening (the lid gap)
    + '<path d="M30 100 Q100 108 170 100" stroke="#1a0808" stroke-width="3" fill="none"/>'
    # EYES on the surface
    + '<circle cx="72" cy="88" r="12" fill="#f0e8c0"/>'
    '<circle cx="128" cy="88" r="12" fill="#f0e8c0"/>'
    + eyes(72, 128, 88, r=8, iris="#cc4400", pupil="#111")
    + '<circle cx="75" cy="85" r="2.5" fill="white" opacity="0.7"/>'
    '<circle cx="131" cy="85" r="2.5" fill="white" opacity="0.7"/>'
    # teeth in the gap
    + '<path d="M46 100 L50 112 L56 102 L62 114 L68 102 L74 114 L80 102 L86 112 L92 102 L98 110 L104 102 L110 112 L116 102 L122 114 L128 102 L134 114 L140 102 L146 112 L152 102 L156 100" fill="#e8e0c8"/>'
    '<path d="M46 100 L50 90 L56 100 L62 88 L68 100 L74 88 L80 100 L86 90 L92 100 L98 92 L104 100 L110 90 L116 100 L122 88 L128 100 L134 90 L140 100 L146 90 L152 100 L156 100" fill="#e8e0c8"/>'
)

# ── Wight ──────────────────────────────────────────────────────────────────────
MONSTERS["wight"] = tok("#050508", "#0a0a10",
    # armored helm
    '<ellipse cx="100" cy="76" rx="50" ry="40" fill="#383848"/>'
    '<rect x="54" y="74" width="92" height="16" fill="#2a2a38"/>'
    '<path d="M78 60 L100 44 L122 60" fill="#484858"/>'
    # visor slot
    + '<rect x="64" y="86" width="72" height="16" rx="3" fill="#080810"/>'
    # decayed face visible through visor
    + '<ellipse cx="100" cy="94" rx="30" ry="12" fill="#b0b8a0" opacity="0.8"/>'
    + glow_eyes(82, 118, 94, r=6, color="#cc4400")
    # skeletal visible lower face
    + '<ellipse cx="100" cy="118" rx="36" ry="30" fill="#b0b8a0"/>'
    # decay patches
    + '<ellipse cx="82" cy="114" rx="10" ry="8" fill="#8a9278" opacity="0.5"/>'
    '<ellipse cx="120" cy="120" rx="8" ry="6" fill="#8a9278" opacity="0.5"/>'
    # cheekbones visible
    + '<path d="M68 108 Q82 104 80 118" stroke="#7a8260" stroke-width="2" fill="none"/>'
    '<path d="M132 108 Q118 104 120 118" stroke="#7a8260" stroke-width="2" fill="none"/>'
    # grim mouth
    + '<path d="M78 128 L122 128" stroke="#2a2a18" stroke-width="3" fill="none"/>'
    '<rect x="82" y="122" width="5" height="10" rx="1" fill="#d0d8c0"/>'
    '<rect x="90" y="122" width="5" height="12" rx="1" fill="#d0d8c0"/>'
    '<rect x="98" y="122" width="5" height="12" rx="1" fill="#d0d8c0"/>'
    '<rect x="106" y="122" width="5" height="12" rx="1" fill="#d0d8c0"/>'
    '<rect x="114" y="122" width="5" height="10" rx="1" fill="#d0d8c0"/>'
    # armor rivets
    + '<circle cx="60" cy="80" r="3" fill="#585870"/>'
    '<circle cx="140" cy="80" r="3" fill="#585870"/>'
)

# ── Werewolf ───────────────────────────────────────────────────────────────────
MONSTERS["werewolf"] = tok("#0a0808", "#141010",
    # large pointed ears
    '<path d="M60 72 L46 36 L82 66 Z" fill="#5a4030"/>'
    '<path d="M140 72 L154 36 L118 66 Z" fill="#5a4030"/>'
    '<path d="M63 70 L52 44 L78 65 Z" fill="#3a2a18"/>'
    '<path d="M137 70 L148 44 L122 65 Z" fill="#3a2a18"/>'
    # head - half-wolf transformation
    + '<ellipse cx="100" cy="108" rx="52" ry="50" fill="#6a5040"/>'
    # elongated muzzle
    + '<ellipse cx="100" cy="125" rx="30" ry="22" fill="#5a4030"/>'
    '<ellipse cx="100" cy="118" rx="25" ry="15" fill="#9a7860"/>'
    # nose
    + '<ellipse cx="100" cy="112" rx="12" ry="8" fill="#1a1010"/>'
    # snarl
    + '<path d="M74 128 Q100 144 126 128" stroke="#1a1010" stroke-width="2.5" fill="#1a1010"/>'
    '<path d="M80 128 L76 144 L86 136 Z" fill="#f0e8e0"/>'
    '<path d="M120 128 L124 144 L114 136 Z" fill="#f0e8e0"/>'
    '<path d="M90 130 L88 146 L95 138 Z" fill="#f0e8e0"/>'
    '<path d="M110 130 L112 146 L105 138 Z" fill="#f0e8e0"/>'
    + glow_eyes(82, 118, 95, r=7, color="#ffcc00")
    # fur texture
    + '<path d="M56 86 Q64 76 72 86 Q72 76 80 82" stroke="#4a3820" stroke-width="2" fill="none" opacity="0.7"/>'
    '<path d="M128 86 Q136 76 144 82" stroke="#4a3820" stroke-width="2" fill="none" opacity="0.7"/>'
    # moon
    + '<circle cx="160" cy="46" r="14" fill="#f0e8c0" opacity="0.6"/>'
)

# ── Veteran ────────────────────────────────────────────────────────────────────
MONSTERS["veteran"] = tok("#0e0e12", "#181820",
    # battle-worn helm
    '<ellipse cx="100" cy="76" rx="48" ry="40" fill="#707880"/>'
    '<rect x="56" y="72" width="88" height="18" fill="#606870"/>'
    # face  
    + '<ellipse cx="100" cy="114" rx="36" ry="34" fill="#c09070"/>'
    # battle visor raised
    + '<path d="M58 76 Q100 68 142 76" fill="#585e68"/>'
    # weathered face
    + '<path d="M78 102 L82 106" stroke="#9a6840" stroke-width="2" stroke-linecap="round" opacity="0.6"/>'
    '<path d="M116 100 L120 96" stroke="#9a6840" stroke-width="2" stroke-linecap="round" opacity="0.6"/>'
    '<path d="M90 120 L94 118" stroke="#9a6840" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>'
    + eyes(83, 117, 100, r=6, iris="#4a5a8a", pupil="#111")
    + '<circle cx="86" cy="97" r="1.5" fill="white" opacity="0.7"/>'
    '<circle cx="120" cy="97" r="1.5" fill="white" opacity="0.7"/>'
    # nose
    + '<path d="M97 108 L100 114 L103 108" stroke="#9a7050" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    # determined set mouth
    + '<path d="M84 124 Q100 128 116 124" stroke="#9a6840" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    '<path d="M84 124 L80 136 L88 132 Z" fill="#d0c8a8"/>'
    '<path d="M116 124 L120 136 L112 132 Z" fill="#d0c8a8"/>'
    # plume on helm
    + '<path d="M100 44 Q90 36 82 20 Q96 30 100 40 Q104 30 118 20 Q110 36 100 44 Z" fill="#cc2222"/>'
)

# ── Banshee ────────────────────────────────────────────────────────────────────
MONSTERS["banshee"] = tok("#040810", "#08101c",
    # ethereal wisps
    '<path d="M30 80 Q50 70 60 90 Q70 70 80 85 Q90 65 100 80" stroke="#80b8e0" stroke-width="3" fill="none" opacity="0.4"/>'
    '<path d="M170 80 Q150 70 140 90 Q130 70 120 85 Q110 65 100 80" stroke="#80b8e0" stroke-width="3" fill="none" opacity="0.4"/>'
    # spectral head
    + '<ellipse cx="100" cy="100" rx="50" ry="55" fill="#90c0d8" opacity="0.7"/>'
    '<ellipse cx="100" cy="100" rx="50" ry="55" fill="url(#bGrad)" opacity="0.5"/>'
    # flowing spectral hair
    + '<path d="M52 80 Q44 55 56 36 Q66 52 60 72" fill="#a8d8f0" opacity="0.6"/>'
    '<path d="M148 80 Q156 55 144 36 Q134 52 140 72" fill="#a8d8f0" opacity="0.6"/>'
    '<path d="M58 68 Q50 50 60 34" stroke="#c0e8ff" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<path d="M142 68 Q150 50 140 34" stroke="#c0e8ff" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>'
    # hollow wailing eye sockets
    + '<ellipse cx="80" cy="95" rx="16" ry="13" fill="#020614" opacity="0.9"/>'
    '<ellipse cx="120" cy="95" rx="16" ry="13" fill="#020614" opacity="0.9"/>'
    + glow_eyes(80, 120, 95, r=8, color="#60ccff")
    # open wailing mouth
    + '<ellipse cx="100" cy="126" rx="24" ry="18" fill="#020614" opacity="0.9"/>'
    '<ellipse cx="100" cy="120" rx="20" ry="10" fill="#020614" opacity="0.7"/>'
    # sound waves
    + '<path d="M52 120 Q42 130 52 140" stroke="#60ccff" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<path d="M148 120 Q158 130 148 140" stroke="#60ccff" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<defs><radialGradient id="bGrad" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="white" stop-opacity="0.2"/><stop offset="100%" stop-color="#40a0cc" stop-opacity="0"/></radialGradient></defs>'
)

# ── Owlbear ────────────────────────────────────────────────────────────────────
MONSTERS["owlbear"] = tok("#100e05", "#1a1608",
    # ear tufts
    '<path d="M72 64 L64 36 L84 58 Z" fill="#8a6a30"/>'
    '<path d="M128 64 L136 36 L116 58 Z" fill="#8a6a30"/>'
    '<path d="M74 62 L68 44 L82 58 Z" fill="#f0d898"/>'
    '<path d="M126 62 L132 44 L118 58 Z" fill="#f0d898"/>'
    # head
    + '<ellipse cx="100" cy="108" rx="54" ry="50" fill="#9a8040"/>'
    # owl face disc (facial disc — owl  feature)
    + '<ellipse cx="100" cy="104" rx="44" ry="40" fill="#d4b870"/>'
    '<path d="M58 104 Q100 64 142 104" fill="#c4a860" opacity="0.5"/>'
    # owl eyes (large round)
    + '<ellipse cx="80" cy="95" rx="16" ry="16" fill="#1a1808"/>'
    '<ellipse cx="120" cy="95" rx="16" ry="16" fill="#1a1808"/>'
    '<ellipse cx="80" cy="95" rx="11" ry="11" fill="#f0a800"/>'
    '<ellipse cx="120" cy="95" rx="11" ry="11" fill="#f0a800"/>'
    '<ellipse cx="80" cy="95" rx="6" ry="7" fill="#111"/>'
    '<ellipse cx="120" cy="95" rx="6" ry="7" fill="#111"/>'
    '<circle cx="83" cy="91" r="3" fill="white" opacity="0.6"/>'
    '<circle cx="123" cy="91" r="3" fill="white" opacity="0.6"/>'
    # hooked beak
    + '<path d="M90 108 L100 100 L110 108 Q106 120 100 122 Q94 120 90 108 Z" fill="#aa8820"/>'
    '<path d="M92 108 L100 102 L108 108 Q106 116 100 118 Q94 116 92 108 Z" fill="#c8a830"/>'
)

# ── Troll ──────────────────────────────────────────────────────────────────────
MONSTERS["troll"] = tok("#051005", "#081808",
    # lumpy warty head
    '<ellipse cx="100" cy="108" rx="56" ry="54" fill="#3a6a3a"/>'
    # warts / lumps
    + '<circle cx="68" cy="88" r="7" fill="#2a5a2a"/>'
    '<circle cx="74" cy="78" r="5" fill="#2a5a2a"/>'
    '<circle cx="132" cy="84" r="6" fill="#2a5a2a"/>'
    '<circle cx="120" cy="78" r="4" fill="#2a5a2a"/>'
    '<circle cx="88" cy="76" r="4" fill="#2a5a2a"/>'
    '<circle cx="108" cy="80" r="3" fill="#2a5a2a"/>'
    # nose - very large
    + '<ellipse cx="100" cy="116" rx="20" ry="16" fill="#2a5a2a"/>'
    '<circle cx="89" cy="114" r="8" fill="#1a4a1a"/>'
    '<circle cx="111" cy="114" r="8" fill="#1a4a1a"/>'
    # beady eyes under heavy brow
    + '<ellipse cx="100" cy="87" rx="48" ry="12" fill="#2a5a2a"/>'
    + eyes(82, 118, 94, r=7, iris="#cc4400", pupil="#111")
    # loose hanging jaw
    + '<path d="M62 130 Q100 156 138 130 Q130 148 100 155 Q70 148 62 130 Z" fill="#1a4a1a"/>'
    # few teeth
    + '<path d="M76 132 L72 148 L82 140 Z" fill="#d8d0a0"/>'
    '<path d="M124 132 L128 148 L118 140 Z" fill="#d8d0a0"/>'
    # regenerating flesh wisps
    + '<path d="M56 90 Q48 80 52 68" stroke="#4a8a4a" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>'
    '<path d="M52 92 Q42 88 44 76" stroke="#4a8a4a" stroke-width="2.5" fill="none" opacity="0.5" stroke-linecap="round"/>'
    # ears
    + '<ellipse cx="44" cy="106" rx="12" ry="18" fill="#3a6a3a"/>'
    '<ellipse cx="156" cy="106" rx="12" ry="18" fill="#3a6a3a"/>'
)

# ── Air Elemental ─────────────────────────────────────────────────────────────
MONSTERS["air-elemental"] = tok("#080e18", "#0c1422",
    # swirling wind form
    '<path d="M100 50 Q130 60 145 85 Q158 115 140 140 Q120 162 100 155 Q80 162 60 140 Q42 115 55 85 Q70 60 100 50 Z" fill="none" stroke="#c0d8f0" stroke-width="3" opacity="0.4"/>'
    '<path d="M100 60 Q124 70 138 90 Q151 115 133 138 Q116 158 100 152 Q84 158 67 138 Q49 115 62 90 Q76 70 100 60 Z" fill="none" stroke="#e0eeff" stroke-width="2" opacity="0.3"/>'
    # core whorl
    + '<ellipse cx="100" cy="100" rx="46" ry="50" fill="#b4ccee" opacity="0.25"/>'
    '<ellipse cx="100" cy="100" rx="36" ry="40" fill="#c8dcff" opacity="0.2"/>'
    # wind streaks
    + '<path d="M55 80 Q75 70 95 80 Q115 90 135 80" stroke="white" stroke-width="2.5" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<path d="M52 100 Q78 88 100 100 Q122 112 148 100" stroke="white" stroke-width="2.5" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<path d="M58 120 Q80 110 100 120 Q120 130 142 120" stroke="white" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>'
    '<path d="M64 140 Q84 132 100 140 Q116 148 136 140" stroke="white" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round"/>'
    # face-like suggestion
    + '<ellipse cx="82" cy="90" rx="10" ry="8" fill="#ddeeff" opacity="0.5"/>'
    '<ellipse cx="118" cy="90" rx="10" ry="8" fill="#ddeeff" opacity="0.5"/>'
    '<path d="M76 116 Q100 126 124 116" stroke="#ddeeff" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>'
)

# ── Earth Elemental ────────────────────────────────────────────────────────────
MONSTERS["earth-elemental"] = tok("#0e0a04", "#161008",
    # rocky body
    '<ellipse cx="100" cy="108" rx="58" ry="56" fill="#7a6040"/>'
    # rock layers/striations
    + '<path d="M44 90 Q100 82 156 90 Q150 98 100 96 Q50 98 44 90 Z" fill="#6a5030"/>'
    '<path d="M42 108 Q100 100 158 108 Q152 116 100 114 Q48 116 42 108 Z" fill="#6a5030"/>'
    '<path d="M44 126 Q100 118 156 126 Q150 134 100 132 Q50 134 44 126 Z" fill="#6a5030"/>'
    # craggy face
    + '<path d="M68 86 Q80 78 88 86" stroke="#4a3018" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<path d="M112 86 Q120 78 132 86" stroke="#4a3018" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + glow_eyes(80, 120, 93, r=8, color="#cc6600")
    # craggy nose
    + '<path d="M92 110 L100 102 L108 110 L106 118 L94 118 Z" fill="#5a3818"/>'
    # cracked ground mouth
    + '<path d="M66 128 Q100 138 134 128" stroke="#3a2808" stroke-width="4" fill="#3a2808"/>'
    '<path d="M72 128 L76 140" stroke="#8a7850" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M86 130 L88 144" stroke="#8a7850" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M100 130 L100 146" stroke="#8a7850" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M114 130 L112 144" stroke="#8a7850" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M128 128 L124 140" stroke="#8a7850" stroke-width="4" stroke-linecap="round"/>'
    # rock chunks around head
    + '<polygon points="44,72 52,58 62,70 54,80" fill="#6a5030"/>'
    '<polygon points="156,72 148,58 138,70 146,80" fill="#6a5030"/>'
    '<polygon points="50,140 44,156 62,150" fill="#5a4028"/>'
)

# ── Fire Elemental ─────────────────────────────────────────────────────────────
MONSTERS["fire-elemental"] = tok("#1a0500", "#280800",
    # flame base
    '<path d="M60 155 Q60 130 50 110 Q44 90 60 75 Q70 65 65 50 Q78 62 74 78 Q72 90 80 78 Q88 62 86 44 Q100 58 96 76 Q94 88 100 76 Q106 60 104 44 Q118 58 114 76 Q112 88 120 78 Q128 62 135 50 Q130 65 140 75 Q156 90 150 110 Q140 130 140 155 Z" fill="#d44800"/>'
    '<path d="M65 155 Q65 130 56 112 Q52 95 64 80 Q74 70 70 56 Q82 66 78 80 Q77 92 84 82 Q92 66 90 50 Q104 62 100 80 Q100 92 106 80 Q110 64 110 50 Q124 62 122 78 Q120 90 128 82 Q136 66 136 56 Q142 70 136 80 Q148 95 144 112 Q135 130 135 155 Z" fill="#f06000"/>'
    '<path d="M72 155 Q72 135 65 118 Q62 102 70 90 Q80 78 78 66 Q90 76 86 90 Q85 102 92 92 Q100 76 100 64 Q108 76 115 90 Q115 104 120 90 Q118 78 130 66 Q130 80 136 92 Q138 108 135 118 Q128 135 128 155 Z" fill="#ff9800"/>'
    '<path d="M82 155 Q80 138 76 128 Q76 112 84 102 Q92 90 92 80 Q100 90 108 80 Q108 90 116 102 Q124 112 124 128 Q120 138 118 155 Z" fill="#ffcc00"/>'
    # eyes glow
    + '<ellipse cx="84" cy="108" rx="12" ry="10" fill="#ff4400" opacity="0.8"/>'
    '<ellipse cx="116" cy="108" rx="12" ry="10" fill="#ff4400" opacity="0.8"/>'
    + glow_eyes(84, 116, 108, r=7, color="#ffff00")
)

# ── Water Elemental ────────────────────────────────────────────────────────────
MONSTERS["water-elemental"] = tok("#040c18", "#081422",
    # water form
    '<ellipse cx="100" cy="108" rx="56" ry="52" fill="#1a5a88" opacity="0.8"/>'
    '<ellipse cx="100" cy="108" rx="48" ry="44" fill="#2a78aa" opacity="0.6"/>'
    # wave patterns
    + '<path d="M46 88 Q60 78 74 88 Q88 98 102 88 Q116 78 130 88 Q144 98 154 88" stroke="#60aad0" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>'
    '<path d="M44 106 Q58 96 72 106 Q86 116 100 106 Q114 96 128 106 Q142 116 156 106" stroke="#80c8e8" stroke-width="2.5" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<path d="M48 124 Q62 114 76 124 Q90 134 104 124 Q118 114 132 124 Q142 132 152 124" stroke="#60aad0" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>'
    # face suggestion
    + '<ellipse cx="82" cy="95" rx="13" ry="10" fill="#0a3060" opacity="0.7"/>'
    '<ellipse cx="118" cy="95" rx="13" ry="10" fill="#0a3060" opacity="0.7"/>'
    + glow_eyes(82, 118, 95, r=7, color="#40d0ff")
    # foamy crest
    + '<path d="M60 72 Q80 60 100 66 Q120 60 140 72" stroke="white" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>'
    '<path d="M64 68 Q82 56 100 62 Q118 56 136 68" stroke="white" stroke-width="2" fill="none" opacity="0.3" stroke-linecap="round"/>'
    # whirlpool mouth
    + '<path d="M76 120 Q100 134 124 120 Q116 130 100 133 Q84 130 76 120 Z" fill="#0a3060" opacity="0.8"/>'
    '<path d="M80 120 Q100 128 120 120" stroke="#60c8e8" stroke-width="1.5" fill="none" opacity="0.5"/>'
    '<path d="M84 124 Q100 130 116 124" stroke="#60c8e8" stroke-width="1" fill="none" opacity="0.4"/>'
)

# ── Young Green Dragon ────────────────────────────────────────────────────────
MONSTERS["young-green-dragon"] = tok("#042210", "#063018",
    # horns
    '<path d="M72 66 L58 28 L80 58" fill="#1a4a18" stroke="#0a3010" stroke-width="1"/>'
    '<path d="M128 66 L142 28 L120 58" fill="#1a4a18" stroke="#0a3010" stroke-width="1"/>'
    '<path d="M86 58 L82 36 L94 54" fill="#1a4a18" stroke="#0a3010" stroke-width="1"/>'
    '<path d="M114 58 L118 36 L106 54" fill="#1a4a18" stroke="#0a3010" stroke-width="1"/>'
    # head
    + '<ellipse cx="100" cy="108" rx="54" ry="50" fill="#3a7a34"/>'
    # scales pattern
    + '<path d="M50 90 Q70 82 90 90 Q110 98 130 90 Q150 82 156 90" stroke="#2a6a24" stroke-width="2" fill="none" opacity="0.5"/>'
    '<path d="M46 108 Q66 100 86 108 Q106 116 126 108 Q146 100 154 108" stroke="#2a6a24" stroke-width="2" fill="none" opacity="0.5"/>'
    # long snout
    + '<ellipse cx="100" cy="126" rx="32" ry="20" fill="#2a6a24"/>'
    '<ellipse cx="100" cy="119" rx="28" ry="14" fill="#4a8a44"/>'
    # nostrils
    + '<ellipse cx="92" cy="116" rx="5" ry="4" fill="#1a4a18"/>'
    '<ellipse cx="108" cy="116" rx="5" ry="4" fill="#1a4a18"/>'
    # slit eyes
    + '<ellipse cx="80" cy="92" rx="14" ry="10" fill="#1a1a0a"/>'
    '<ellipse cx="120" cy="92" rx="14" ry="10" fill="#1a1a0a"/>'
    + glow_eyes(80, 120, 92, r=8, color="#44cc00")
    + '<ellipse cx="80" cy="92" rx="3" ry="7" fill="#111"/>'
    '<ellipse cx="120" cy="92" rx="3" ry="7" fill="#111"/>'
    # serrated grin
    + '<path d="M70 128 Q100 144 130 128" stroke="#1a4a18" stroke-width="2" fill="#1a4a18"/>'
    '<path d="M76 128 L72 140 L80 134 Z" fill="#e8e8d0"/>'
    '<path d="M88 130 L86 144 L94 136 Z" fill="#e8e8d0"/>'
    '<path d="M100 132 L100 148 L108 140 Z" fill="#e8e8d0"/>'
    '<path d="M112 130 L114 144 L106 136 Z" fill="#e8e8d0"/>'
    '<path d="M124 128 L128 140 L120 134 Z" fill="#e8e8d0"/>'
    # frill hint at sides
    + '<path d="M52 92 Q44 84 48 72 Q58 80 56 90" fill="#2a6a24" opacity="0.6"/>'
    '<path d="M148 92 Q156 84 152 72 Q142 80 144 90" fill="#2a6a24" opacity="0.6"/>'
)

# ── Clay Golem ────────────────────────────────────────────────────────────────
MONSTERS["golem-clay"] = tok("#1a0e08", "#241408",
    # crude head - lumpy clay
    '<ellipse cx="100" cy="108" rx="56" ry="54" fill="#a06840"/>'
    # clay lumps
    + '<ellipse cx="74" cy="86" rx="14" ry="12" fill="#b07848"/>'
    '<ellipse cx="126" cy="92" rx="12" ry="10" fill="#b07848"/>'
    '<ellipse cx="88" cy="136" rx="16" ry="10" fill="#a06840"/>'
    '<ellipse cx="118" cy="134" rx="12" ry="9" fill="#b07848"/>'
    # crude gouged eyes
    + '<ellipse cx="80" cy="96" rx="14" ry="10" fill="#7a4820"/>'
    '<ellipse cx="120" cy="96" rx="14" ry="10" fill="#7a4820"/>'
    + glow_eyes(80, 120, 96, r=7, color="#ee8822")
    # clay creator mark/rune on forehead
    + '<text x="100" y="82" text-anchor="middle" font-size="18" font-family="serif" fill="#7a4820" opacity="0.8">&#x05D0;</text>'
    # crude formed nose
    + '<path d="M90 112 L100 104 L110 112 L108 120 L92 120 Z" fill="#8a5828"/>'
    # wide slash for mouth
    + '<path d="M68 130 L132 130" stroke="#7a4820" stroke-width="5" fill="none"/>'
    '<path d="M72 128 L76 138" stroke="#8a5828" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M92 130 L94 140" stroke="#8a5828" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M100 130 L100 142" stroke="#8a5828" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M108 130 L106 140" stroke="#8a5828" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M128 128 L124 138" stroke="#8a5828" stroke-width="4" stroke-linecap="round"/>'
    # clay cracks
    + '<path d="M60 80 L68 96 L62 110" stroke="#7a4820" stroke-width="1.5" fill="none" opacity="0.5"/>'
    '<path d="M130 76 L138 90" stroke="#7a4820" stroke-width="1.5" fill="none" opacity="0.5"/>'
)

# ── Beholder ──────────────────────────────────────────────────────────────────
MONSTERS["beholder"] = tok("#0a0818", "#10102a",
    # body - floating orb
    '<circle cx="100" cy="108" r="54" fill="#4a3a60"/>'
    '<circle cx="88" cy="96" r="24" fill="#382850" opacity="0.7"/>'
    # eyestalks (8 smaller ones around)
    + '<line x1="100" y1="55" x2="100" y2="38" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="100" cy="34" r="9" fill="#2a1a3a"/><circle cx="100" cy="34" r="6" fill="#cc0000"/><circle cx="100" cy="34" r="3" fill="#111"/>'
    '<line x1="128" y1="62" x2="138" y2="48" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="142" cy="44" r="9" fill="#2a1a3a"/><circle cx="142" cy="44" r="6" fill="#8800cc"/><circle cx="142" cy="44" r="3" fill="#111"/>'
    '<line x1="148" y1="90" x2="162" y2="82" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="166" cy="78" r="9" fill="#2a1a3a"/><circle cx="166" cy="78" r="6" fill="#0088cc"/><circle cx="166" cy="78" r="3" fill="#111"/>'
    '<line x1="148" y1="122" x2="162" y2="128" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="166" cy="132" r="9" fill="#2a1a3a"/><circle cx="166" cy="132" r="6" fill="#cc8800"/><circle cx="166" cy="132" r="3" fill="#111"/>'
    '<line x1="72" y1="62" x2="62" y2="48" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="58" cy="44" r="9" fill="#2a1a3a"/><circle cx="58" cy="44" r="6" fill="#00cc44"/><circle cx="58" cy="44" r="3" fill="#111"/>'
    '<line x1="52" y1="90" x2="38" y2="82" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="34" cy="78" r="9" fill="#2a1a3a"/><circle cx="34" cy="78" r="6" fill="#cc4400"/><circle cx="34" cy="78" r="3" fill="#111"/>'
    '<line x1="52" y1="122" x2="38" y2="128" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="34" cy="132" r="9" fill="#2a1a3a"/><circle cx="34" cy="132" r="6" fill="#cccc00"/><circle cx="34" cy="132" r="3" fill="#111"/>'
    '<line x1="128" y1="148" x2="136" y2="162" stroke="#3a2a50" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="140" cy="166" r="9" fill="#2a1a3a"/><circle cx="140" cy="166" r="6" fill="#cc00aa"/><circle cx="140" cy="166" r="3" fill="#111"/>'
    # CENTRAL EYE - large
    + '<ellipse cx="100" cy="100" rx="30" ry="24" fill="#1a1228"/>'
    '<ellipse cx="100" cy="100" rx="22" ry="18" fill="#aa0000"/>'
    '<ellipse cx="100" cy="100" rx="14" ry="12" fill="#440000"/>'
    '<ellipse cx="100" cy="100" rx="7" ry="8" fill="#110000"/>'
    '<ellipse cx="93" cy="93" rx="5" ry="4" fill="white" opacity="0.4"/>'
    # eyelid
    + '<path d="M70 100 Q100 82 130 100" stroke="#3a2a50" stroke-width="3" fill="none"/>'
    '<path d="M70 100 Q100 118 130 100" stroke="#3a2a50" stroke-width="3" fill="none"/>'
    # mouth
    + '<path d="M68 134 Q100 148 132 134 Q124 144 100 147 Q76 144 68 134 Z" fill="#1a1228"/>'
    '<path d="M74 134 L76 144" stroke="#7a548a" stroke-width="2" stroke-linecap="round"/>'
    '<path d="M88 136 L90 148" stroke="#7a548a" stroke-width="2" stroke-linecap="round"/>'
    '<path d="M100 138 L100 150" stroke="#7a548a" stroke-width="2" stroke-linecap="round"/>'
    '<path d="M112 136 L110 148" stroke="#7a548a" stroke-width="2" stroke-linecap="round"/>'
    '<path d="M126 134 L124 144" stroke="#7a548a" stroke-width="2" stroke-linecap="round"/>'
)

# ── Lich ──────────────────────────────────────────────────────────────────────
MONSTERS["lich"] = tok("#050508", "#0a0a10",
    # robes / dark cowl
    '<path d="M34 170 Q48 130 60 110 Q56 90 64 74 Q74 58 88 54 Q94 80 100 64 Q106 80 112 54 Q126 58 136 74 Q144 90 140 110 Q152 130 166 170 Z" fill="#1a1828"/>'
    # crown of unlife
    + '<path d="M64 72 L68 50 L76 66 L82 44 L90 62 L100 40 L110 62 L118 44 L124 66 L132 50 L136 72 Z" fill="#7a6a30"/>'
    '<path d="M64 72 L136 72" stroke="#a89040" stroke-width="3"/>'
    # gem in crown
    + '<circle cx="100" cy="56" r="7" fill="#8800cc"/>'
    '<circle cx="82" cy="52" r="4" fill="#cc0022" opacity="0.8"/>'
    '<circle cx="118" cy="52" r="4" fill="#0044cc" opacity="0.8"/>'
    # skull face
    + '<ellipse cx="100" cy="102" rx="44" ry="46" fill="#d8d0c0"/>'
    # skull shape
    + '<path d="M58 98 Q60 72 100 68 Q140 72 142 98 Q142 120 134 130 Q126 140 122 150 Q112 158 100 158 Q88 158 78 150 Q74 140 66 130 Q58 120 58 98 Z" fill="#e0d8c8"/>'
    # cracking on skull
    + '<path d="M84 76 L82 90 L88 98" stroke="#b8b0a0" stroke-width="1.5" fill="none"/>'
    '<path d="M112 78 L116 94" stroke="#b8b0a0" stroke-width="1.5" fill="none"/>'
    # glowing eye sockets
    + '<ellipse cx="80" cy="100" rx="16" ry="13" fill="#0a0a12"/>'
    '<ellipse cx="120" cy="100" rx="16" ry="13" fill="#0a0a12"/>'
    + glow_eyes(80, 120, 100, r=8, color="#8800ff")
    # nasal void
    + '<path d="M96 118 L100 112 L104 118 Q102 124 100 124 Q98 124 96 118 Z" fill="#0a0a12"/>'
    # grinning teeth
    + '<path d="M66 136 Q100 144 134 136" stroke="#0a0a12" stroke-width="2" fill="#c8c0a8"/>'
    '<rect x="74" y="130" width="7" height="11" rx="2" fill="#e8e0d0"/>'
    '<rect x="83" y="130" width="6" height="13" rx="2" fill="#e8e0d0"/>'
    '<rect x="91" y="130" width="6" height="14" rx="2" fill="#e8e0d0"/>'
    '<rect x="99" y="130" width="6" height="14" rx="2" fill="#e8e0d0"/>'
    '<rect x="107" y="130" width="6" height="13" rx="2" fill="#e8e0d0"/>'
    '<rect x="115" y="130" width="7" height="11" rx="2" fill="#e8e0d0"/>'
    # phylactery gem glow hint
    + '<circle cx="100" cy="172" r="8" fill="#6600aa" opacity="0.7"/>'
    '<circle cx="100" cy="172" r="5" fill="#aa00ff" opacity="0.8"/>'
)

for slug, svg in MONSTERS.items():
    p = OUT / f"{slug}.svg"
    p.write_text(svg)
    print(f"  wrote {p.name}")

print(f"\nDone: {len(MONSTERS)} files")
