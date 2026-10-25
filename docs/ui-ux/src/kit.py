"""Shared shell, phone frame and icons for the ConciergeIQ mockups."""

PAGES = {}


def reg(name, w=1440, h=900):
    def deco(fn):
        PAGES[name] = (fn, w, h)
        return fn
    return deco


_P = {
    "orders": '<rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="11" rx="1.5"/>',
    "bed": '<path d="M2 18V6M2 14h20v4M22 14v-2a3 3 0 0 0-3-3h-8v5"/><circle cx="6.5" cy="10.5" r="2"/>',
    "menu": '<path d="M7 2v9a2 2 0 0 0 2 2v9M11 2v7a2 2 0 0 1-2 2M7 2v7"/><path d="M17 22V2c-2 1-3 4-3 8h3"/>',
    "card": '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    "qr": '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    "users": '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
    "log": '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    "chart": '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
    "scale": '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    "siren": '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 21h14v-3H5zM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4"/>',
    "settings": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>', "minus": '<path d="M5 12h14"/>',
    "check": '<path d="M20 6L9 17l-5-5"/>', "x": '<path d="M18 6L6 18M6 6l12 12"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>', "back": '<path d="M15 6l-6 6 6 6"/>',
    "chev": '<path d="M9 6l6 6-6 6"/>', "chevd": '<path d="M6 9l6 6 6-6"/>',
    "alert": '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "cart": '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>',
    "volume": '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    "wifioff": '<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.5-1.8M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M12 20h.01"/>',
    "door": '<path d="M3 21h18M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><circle cx="14.5" cy="12" r="1"/>',
    "logout": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    "printer": '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    "refresh": '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    "download": '<path d="M12 3v12M6 11l6 6 6-6M4 21h16"/>',
    "sparkle": '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    "send": '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    "towel": '<path d="M5 3h14v14H5zM5 17v4h14v-4M9 7h6"/>',
    "phone": '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    "dots": '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    "edit": '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    "filter": '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    "shield": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    "cash": '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    "bank": '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M12 3l9 5H3z"/>',
    "whatsapp": '<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
    "lang": '<path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
    "palette": '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-5-4.5-8.8-10-8.8z"/>',
    "upload": '<path d="M12 21V9M6 13l6-6 6 6M4 3h16"/>',
    "lock": '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    "eye": '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "home": '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    "list": '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    "bellconcierge": '<path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4"/>',
}


def ic(name, w=None):
    size = f' width="{w}" height="{w}"' if w else ""
    return (f'<svg viewBox="0 0 24 24"{size} fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round">{_P[name]}</svg>')


MARK = f'<div class="mark">{ic("bellconcierge")}</div>'

NAV = [
    ("Operations", [("orders", "Live orders", "orders", "3", ""), ("rooms", "Rooms & stays", "bed", None, ""),
                    ("menu", "Menu", "menu", None, ""), ("payments", "Payments", "card", "5", "n")]),
    ("Administration", [("qr", "QR codes", "qr", None, ""), ("staff", "Staff & roles", "users", None, ""), ("audit", "Activity log", "log", None, "")]),
    ("Owner", [("insights", "Insights", "chart", "S2", ""), ("recon", "Reconciliation", "scale", "S2", ""), ("escal", "Escalations", "siren", "S2", "")]),
]


def shell(active, title, sub, body, actions="", role="Receptionist", user=("AO", "Amaka Obi")):
    nav = []
    for head, items in NAV:
        nav.append(f'<div class="navh up">{head}</div>')
        for key, label, icon, cnt, cls in items:
            badge = ""
            if cnt == "S2":
                badge = '<span class="s2">S2</span>'
            elif cnt:
                badge = f'<span class="cnt {cls}">{cnt}</span>'
            nav.append(f'<div class="nav{" on" if key == active else ""}">{ic(icon)}{label}{badge}</div>')
    nav.append(f'<div class="nav{" on" if active == "settings" else ""}" style="margin-top:6px">{ic("settings")}Settings</div>')
    return f'''
<div class="app">
  <aside class="side">
    <div class="logo">{MARK}<span>Concierge<span style="color:var(--brass2)">IQ</span></span></div>
    <div class="hotel"><div class="av" style="background:var(--brass);width:28px;height:28px">AB</div><div class="grow"><div style="color:#fff;font-weight:600;font-size:13px">Azure Bay Hotel</div><div class="tiny" style="color:#8F98B3">Victoria Island, Lagos</div></div>{ic("chevd")}</div>
    {''.join(nav)}
    <div class="sidefoot"><div class="av" style="background:#3B4C7E">{user[0]}</div><div class="grow"><div style="color:#fff;font-weight:600;font-size:13px">{user[1]}</div><div class="tiny" style="color:#8F98B3">{role}</div></div>{ic("logout")}</div>
  </aside>
  <main class="main">
    <header class="top">
      <div class="search">{ic("search")}<span>Search orders, rooms, guests…</span></div>
      <div class="grow"></div>
      <span class="live">Live · connected</span>
      <span class="btn ghost" style="padding:0 8px">{ic("volume")}</span>
      <span class="btn ghost" style="padding:0 8px;position:relative">{ic("bell")}<span style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--red)"></span></span>
      <span class="pill p-brass">{role}</span>
    </header>
    <div class="content">
      <div class="row between"><div><h1>{title}</h1><div class="muted mt4">{sub}</div></div><div class="row gap8">{actions}</div></div>
      {body}
    </div>
  </main>
</div>'''


def phone(inner, foot=""):
    return f'''<div class="phone"><div class="sbar"><span>9:41</span><span class="notch"></span><span style="letter-spacing:2px">▂▄▆ ▮</span></div>
<div class="pscroll">{inner}</div>{f'<div class="pfoot">{foot}</div>' if foot else ''}</div>'''


def stage(ph, step, title, desc, bullets=()):
    bl = "".join(f'<div class="row gap8 small" style="align-items:flex-start"><span class="green" style="margin-top:1px">{ic("check")}</span><span class="muted">{b}</span></div>' for b in bullets)
    return f'''<div class="stage"><div class="caption"><div class="row gap8">{MARK}<b>Concierge<span class="brass">IQ</span></b><span class="pill p-brass">Guest app</span></div>
<div class="up mt24">{step}</div><h1 class="mt8">{title}</h1><p class="muted mt12" style="font-size:16px">{desc}</p><div class="col mt20" style="gap:10px">{bl}</div></div>{ph}</div>'''


def page(title, body):
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>
<link rel="stylesheet" href="ciq.css"></head><body>{body}</body></html>'''
