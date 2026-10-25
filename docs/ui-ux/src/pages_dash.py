from kit import reg, ic, shell, MARK


def spark(vals, w=600, h=150, color="#B9822F", fill=True):
    mx, mn = max(vals), min(vals)
    pts = [(6 + i * (w - 12) / (len(vals) - 1), h - 6 - (v - mn) / ((mx - mn) or 1) * (h - 12)) for i, v in enumerate(vals)]
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    gid = f"g{abs(hash((tuple(vals), color))) % 99999}"
    f = (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{color}" stop-opacity=".25"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></linearGradient></defs>'
         f'<path d="{d} L{pts[-1][0]:.1f},{h} L{pts[0][0]:.1f},{h} Z" fill="url(#{gid})"/>') if fill else ""
    return f'<svg viewBox="0 0 {w} {h}" width="100%" height="{h}" preserveAspectRatio="none">{f}<path d="{d}" fill="none" stroke="{color}" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>'


def kpis(items):
    return '<div class="grid g4">' + "".join(
        f'<div class="card stat" style="padding:16px 18px"><div class="row between"><span class="muted small b">{t}</span><div class="ico {c}" style="width:30px;height:30px">{ic(i)}</div></div><div class="v" style="font-size:24px">{v}</div><div class="small {sc} mt4">{s}</div></div>'
        for t, v, s, sc, i, c in items) + "</div>"


# ---------------------------------------------------------------- design system
@reg("00-design-system", 1440, 1100)
def ds():
    sw = lambda n, v: f'<div><div style="height:64px;border-radius:12px;background:{v};border:1px solid var(--line)"></div><div class="small b mt8">{n}</div><div class="tiny mono dim">{v}</div></div>'
    return f'''<div style="padding:48px 56px;display:flex;flex-direction:column;gap:24px">
<div class="row between"><div class="row gap16">{MARK.replace('class="mark"', 'class="mark" style="width:46px;height:46px;border-radius:13px"')}<div><h1 class="serif" style="font-size:34px;font-weight:600">ConciergeIQ Design System</h1><div class="muted">Warm hospitality for guests, calm clarity for staff · v1.0</div></div></div><div class="row gap8"><span class="pill p-brass">Light-first</span><span class="pill">Noto Serif Display · Ubuntu Sans</span></div></div>
<div class="grid" style="grid-template-columns:1.3fr 1fr;gap:20px">
 <div class="card"><div class="up">Palette</div><div class="grid mt16" style="grid-template-columns:repeat(6,1fr);gap:14px">
  {sw("Navy · ink", "#16213A")}{sw("Brass · brand", "#B9822F")}{sw("Ivory · canvas", "#F6F3EE")}{sw("Surface", "#FFFFFF")}{sw("Line", "#E6E0D6")}{sw("Muted", "#6E7488")}
  {sw("Pending", "#D98A0B")}{sw("In progress", "#2F6FEB")}{sw("Delivered", "#1F9D6E")}{sw("Cancelled", "#D9434F")}{sw("AI / Stage 2", "#7357D8")}{sw("Sunk", "#F1EDE6")}</div></div>
 <div class="card"><div class="up">Type</div><div class="col mt16" style="gap:12px">
  <div class="serif" style="font-size:40px;font-weight:600;line-height:1">Welcome to Room 101</div><div class="tiny dim mono">Guest display · Noto Serif Display 40</div>
  <h1>Live orders · 26 / 700</h1><h2>Section heading · 18 / 650</h2><div>Body 14: Staff receive every request on a real-time board.</div><div class="up">Overline 11</div></div></div>
</div>
<div class="grid g3" style="gap:20px">
 <div class="card"><div class="up">Order status, one colour each everywhere</div>
  <div class="row wrap gap8 mt16"><span class="pill p-pending"><i></i>PENDING</span><span class="pill p-progress"><i></i>IN PROGRESS</span><span class="pill p-delivered"><i></i>DELIVERED</span><span class="pill p-cancelled"><i></i>CANCELLED</span></div>
  <div class="up mt20">Room state</div><div class="row wrap gap8 mt8"><span class="pill p-delivered"><i></i>Occupied</span><span class="pill"><i></i>Vacant</span><span class="pill p-pending"><i></i>Checking out today</span><span class="pill p-cancelled"><i></i>Out of order</span></div>
  <div class="up mt20">Roles (cumulative)</div><div class="row wrap gap8 mt8"><span class="pill p-navy">Admin</span><span class="pill p-brass">Manager</span><span class="pill p-progress">Receptionist</span><span class="pill">Staff</span></div></div>
 <div class="card"><div class="up">Buttons</div>
  <div class="row wrap mt16"><span class="btn pri">{ic("check")}Accept</span><span class="btn ok">{ic("check")}Delivered</span><span class="btn">Secondary</span></div>
  <div class="row wrap mt12"><span class="btn gold">Place order</span><span class="btn danger">Cancel order</span><span class="btn sm">Small</span></div>
  <div class="up mt20">Inputs</div><div class="field mt8"><label>Room number</label><div class="input focus"><span>101</span></div></div></div>
 <div class="card"><div class="up">Feedback & realtime</div><div class="col mt16" style="gap:10px">
  <div class="note n-green">{ic("check")}<span><b>Order A-1042 delivered</b> · Room 101</span></div>
  <div class="note n-amber">{ic("bell")}<span><b>New order · Room 214</b> · sound alert played</span></div>
  <div class="note n-red">{ic("wifioff")}<span><b>Offline</b> · reconnecting… orders are safe</span></div>
  <div class="row"><span class="live">Live · connected</span><span class="toggle on"></span><span class="toggle"></span></div></div></div>
</div></div>'''


# ---------------------------------------------------------------- landing
@reg("01-landing-page", 1440, 2020)
def landing():
    feats = [("qr", "i-brass", "Zero-install QR", "Guests scan and order. No app, no login, no phone line."),
             ("orders", "i-blue", "Real-time staff board", "Every request lands on a Kanban board with sound and visual alerts."),
             ("chart", "i-green", "Owner insights", "Sales, response times and staff activity from anywhere."),
             ("shield", "i-navy", "Secure by design", "Unguessable tokens, sessions end at check-out, strict tenant isolation."),
             ("siren", "i-red", "Escalations", "SMS/WhatsApp alerts if an order isn't accepted in time."),
             ("sparkle", "i-violet", "AI concierge", "Answers from hotel-approved content, never orders by itself.")]
    fc = "".join(f'<div class="card" style="padding:24px"><div class="ico {c}">{ic(i)}</div><h2 class="mt16">{t}</h2><p class="muted mt8">{d}</p></div>' for i, c, t, d in feats)
    steps = [("1", "Set up", "Rooms, menu, staff, and print one QR per room."), ("2", "Check in", "Reception starts a stay and the room's code goes live."),
             ("3", "Order", "Guest scans, orders, and tracks it live."), ("4", "Fulfil & pay", "Staff accept, deliver, and record payment."), ("5", "Check out", "Every guest session for the room ends instantly.")]
    sc = "".join(f'<div><div class="av" style="width:40px;height:40px;background:var(--brass);font-size:15px">{n}</div><h3 class="mt12">{t}</h3><p class="small muted mt4">{d}</p></div>' for n, t, d in steps)
    return f'''<div style="background:radial-gradient(1000px 600px at 80% -10%,#EAD9BC,transparent),var(--bg)">
<nav class="row between" style="padding:22px 80px"><div class="row gap8">{MARK}<b style="font-size:17px">Concierge<span class="brass">IQ</span></b></div>
<div class="row gap24 muted b"><span>Product</span><span>How it works</span><span>For owners</span><span>Pricing</span><span>Security</span></div><div class="row gap8"><span class="btn ghost">Staff sign in</span><span class="btn pri">Book a demo</span></div></nav>
<section class="grid" style="grid-template-columns:1.05fr 1fr;padding:70px 80px 40px;align-items:center;gap:40px">
 <div><span class="pill p-brass">For hotels, serviced apartments &amp; resorts</span>
  <h1 class="serif" style="font-size:66px;line-height:1.02;font-weight:600;margin-top:22px">Retire the room phone.<br><span class="brass">Delight every guest.</span></h1>
  <p class="muted" style="font-size:19px;margin-top:20px;max-width:540px">A QR code in each room becomes a digital concierge. Guests order food and amenities in seconds, staff see it live, and owners finally see everything.</p>
  <div class="row mt24" style="gap:12px"><span class="btn lg gold">Book a demo {ic("arrow")}</span><span class="btn lg">{ic("qr")}Try the guest demo</span></div>
  <div class="row gap24 mt24 small muted"><span class="row gap6"><b class="green">{ic("check")}</b>No app for guests</span><span class="row gap6"><b class="green">{ic("check")}</b>Live in a day</span><span class="row gap6"><b class="green">{ic("check")}</b>Multi-property</span></div></div>
 <div style="position:relative;height:520px">
  <div class="card" style="position:absolute;left:0;top:60px;width:350px;padding:0;overflow:hidden;box-shadow:0 30px 70px rgba(22,33,58,.18)">
   <div class="row between" style="padding:12px 16px;border-bottom:1px solid var(--line)"><b>Live orders</b><span class="live">Live</span></div>
   <div class="grid g2" style="padding:14px;gap:10px;background:var(--bg)">
    {''.join(f'<div class="card" style="padding:12px"><div class="row between"><b class="small">Room {r}</b><span class="pill {p}" style="font-size:10px">{s}</span></div><div class="tiny muted mt4">{d}</div><div class="tiny dim mt8">{t}</div></div>' for r, s, p, d, t in [("214", "PENDING", "p-pending", "Club burger ×2", "just now"), ("101", "IN PROGRESS", "p-progress", "Jollof rice, Chapman ×2", "6 min"), ("318", "PENDING", "p-pending", "Extra towels", "1 min"), ("205", "DELIVERED", "p-delivered", "Caesar salad", "18 min")])}
   </div></div>
  <div class="phone" style="position:absolute;right:0;top:0;transform:scale(.62);transform-origin:top right;box-shadow:0 30px 60px rgba(22,33,58,.3)"><div style="height:100%;background:linear-gradient(160deg,#22305A,#16213A);color:#fff;padding:60px 26px"><div class="serif" style="font-size:38px;line-height:1.1">Welcome to<br>Room 101</div><div class="mt24 col" style="gap:12px">{''.join(f'<div style="background:rgba(255,255,255,.1);border-radius:16px;padding:18px;font-size:18px;font-weight:600">{x}</div>' for x in ["🍛  Room service", "🛁  Amenities", "📦  My orders", "✨  Ask concierge"])}</div></div></div>
 </div>
</section>
<section style="padding:30px 80px 60px"><div class="card" style="padding:32px"><div class="up">How it works</div><div class="grid mt16" style="grid-template-columns:repeat(5,1fr);gap:28px">{sc}</div></div></section>
<section style="padding:20px 80px 60px"><h1 class="serif" style="font-size:42px;font-weight:600">Everything a modern front desk needs</h1><div class="grid g3 mt24" style="gap:18px">{fc}</div></section>
<section style="padding:20px 80px 70px"><div class="grid g4" style="gap:18px">
 {''.join(f'<div class="card"><div class="serif brass" style="font-size:40px;font-weight:600">{v}</div><div class="muted small mt4">{t}</div></div>' for v, t in [("0", "orders lost, guaranteed by the transactional outbox"), ("&lt;1s", "from guest tap to staff alert"), ("1", "scan to start, with no app or login"), ("100%", "tenant-isolated data per hotel")])}
</div></section>
<section style="padding:0 80px 60px"><div class="card row between" style="padding:40px;background:var(--navy);border:0;color:#fff"><div><h1 class="serif" style="font-size:36px;font-weight:600">Ready to hang up the room phone?</h1><p style="color:#C9CFDF" class="mt8">Pilot ConciergeIQ in your property this month.</p></div><span class="btn lg gold">Book a demo {ic("arrow")}</span></div>
<div class="row between small dim mt24"><span>© 2026 ConciergeIQ</span><span class="row gap24"><span>Privacy</span><span>Security</span><span>Contact</span></span></div></section>
</div>'''


# ---------------------------------------------------------------- login
@reg("02-staff-login", 1440, 900)
def login():
    return f'''<div style="display:grid;grid-template-columns:1fr 1fr;height:100vh">
<div style="background:var(--navy);color:#fff;padding:50px 64px;display:flex;flex-direction:column;position:relative;overflow:hidden">
 <div style="position:absolute;right:-120px;bottom:-120px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(211,160,80,.35),transparent 70%)"></div>
 <div class="row gap8">{MARK}<b style="font-size:17px">Concierge<span style="color:var(--brass2)">IQ</span></b></div>
 <div style="margin-top:auto;position:relative"><h1 class="serif" style="font-size:46px;font-weight:600;line-height:1.08">Every request.<br>Every room.<br>In real time.</h1>
 <p style="color:#C9CFDF;font-size:16px;max-width:440px" class="mt16">Sign in to see live orders, manage stays and keep your guests happy.</p></div></div>
<div style="display:grid;place-items:center"><div style="width:400px">
 <h2 class="serif" style="font-size:30px;font-weight:600">Staff sign in</h2><p class="muted mt4">Use the account your hotel admin created for you.</p>
 <div class="field mt24"><label>Email</label><div class="input focus"><span>reception@azurebay.ng</span></div></div>
 <div class="field mt16"><div class="row between"><label>Password</label><span class="small brass b">Forgot?</span></div><div class="input"><span style="letter-spacing:3px">••••••••••</span><span class="suf">{ic("eye")}</span></div></div>
 <div class="row mt16 small muted gap8"><span class="toggle on"></span>Keep me signed in on this device</div>
 <span class="btn lg pri block mt24">Sign in</span>
 <div class="note n-blue mt16">{ic("shield")}<span class="small">Short-lived access tokens with rotating refresh. Sessions end when an admin deactivates you.</span></div>
</div></div></div>'''


# ---------------------------------------------------------------- live orders kanban
def ocard(code, room, items, total, age, who="", urgent=False, extra=""):
    border = "border:1.5px solid var(--amber);box-shadow:0 0 0 4px var(--amber-soft)" if urgent else ""
    return f'''<div class="card" style="padding:14px;{border}"><div class="row between"><div class="row gap8"><b>Room {room}</b><span class="tiny dim mono">{code}</span></div><span class="tiny {'amber b' if urgent else 'dim'}">{age}</span></div>
<div class="small muted mt8">{items}</div><div class="row between mt12"><b class="small">{total}</b>{who}</div>{extra}</div>'''


@reg("03-live-orders-board", 1440, 1000)
def board():
    pend = ocard("A-1047", "214", "Azure club burger ×2 · Chapman", "₦23,200", "2:41 waiting", urgent=True, extra=f'<div class="grid g2 mt12" style="gap:8px"><span class="btn sm danger" style="justify-content:center">Cancel</span><span class="btn sm pri" style="justify-content:center">{ic("check")}Accept</span></div>') + \
        ocard("A-1046", "318", "🛁 Extra towels ×2 · Toiletries", "Free", "1 min", extra=f'<div class="grid g2 mt12" style="gap:8px"><span class="btn sm danger" style="justify-content:center">Cancel</span><span class="btn sm pri" style="justify-content:center">{ic("check")}Accept</span></div>') + \
        ocard("A-1045", "407", "Egusi &amp; pounded yam · Water", "₦9,100", "just now", extra=f'<div class="grid g2 mt12" style="gap:8px"><span class="btn sm danger" style="justify-content:center">Cancel</span><span class="btn sm pri" style="justify-content:center">{ic("check")}Accept</span></div>')
    prog = ocard("A-1042", "101", "Jollof rice &amp; chicken · Club burger · Chapman ×2", "₦26,606", "8 min", '<span class="row gap6 tiny muted"><span class="av" style="width:20px;height:20px;font-size:9px">CE</span>Chidi</span>', extra=f'<span class="btn sm ok block mt12">{ic("check")}Mark delivered</span>') + \
        ocard("A-1040", "112", "Caesar salad · Sparkling water", "₦7,900", "14 min", '<span class="row gap6 tiny muted"><span class="av" style="width:20px;height:20px;font-size:9px;background:var(--brass)">FA</span>Fatima</span>', extra=f'<span class="btn sm ok block mt12">{ic("check")}Mark delivered</span>')
    deliv = ocard("A-1039", "205", "Seafood pasta", "₦11,000", "18 min", '<span class="pill p-pending" style="font-size:11px">Unpaid</span>', extra='<span class="btn sm block mt12">Mark as paid</span>') + \
        ocard("A-1036", "309", "Breakfast ×2", "₦18,000", "1 h", '<span class="pill p-delivered" style="font-size:11px">Paid · Card</span>') + \
        ocard("A-1035", "118", "Iron &amp; board", "Free", "1 h", '<span class="pill" style="font-size:11px">No charge</span>')
    canc = ocard("A-1038", "220", "Club burger", "₦9,200", "40 min", '<span class="tiny muted">Guest changed mind</span>')

    def col(title, cls, n, body):
        return f'<div style="background:var(--sunk);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px"><div class="row between" style="padding:2px 4px"><span class="pill {cls}"><i></i>{title}</span><b class="muted small">{n}</b></div>{body}</div>'
    return shell("orders", "Live orders", "Tonight · 12 open · avg. accept time 1m 52s", f'''
<div class="note n-amber">{ic("bell")}<span><b>New order from Room 407</b> · Egusi &amp; pounded yam. Sound alert played. <span class="b" style="text-decoration:underline">Jump to order</span></span></div>
<div class="row between"><div class="seg"><span class="on">All</span><span>Food</span><span>Amenities</span></div><div class="row gap8"><span class="btn sm">{ic("filter")}Floor</span><span class="btn sm">{ic("menu")}Mark item unavailable</span></div></div>
<div class="grid g4" style="align-items:start">{col("PENDING", "p-pending", 3, pend)}{col("IN PROGRESS", "p-progress", 2, prog)}{col("DELIVERED", "p-delivered", 18, deliv)}{col("CANCELLED", "p-cancelled", 1, canc)}</div>''',
                 actions=f'<span class="btn">{ic("volume")}Sound on</span><span class="btn">{ic("list")}List view</span>', role="Staff · Kitchen", user=("CE", "Chidi Eze"))


# ---------------------------------------------------------------- order drawer
@reg("04-order-detail-drawer", 1440, 1000)
def drawer():
    bg = board()
    d = f'''<div class="scrim" style="background:rgba(22,33,58,.25);backdrop-filter:none"></div><div class="drawer">
<div class="row between" style="padding:20px 24px;border-bottom:1px solid var(--line)"><div><div class="row gap8"><h2>Order A-1042</h2><span class="pill p-progress"><i></i>IN PROGRESS</span></div><div class="small muted mt4">Room 101 · Mr. Bello · placed 19:38</div></div>{ic("x")}</div>
<div style="padding:22px 24px;display:flex;flex-direction:column;gap:18px;overflow:hidden">
 <div class="card" style="padding:0">{''.join(f'<div class="row" style="padding:12px 16px;border-bottom:1px solid var(--line)"><b class="small" style="width:24px">{q}×</b><div class="grow"><div class="small b">{n}</div><div class="tiny amber">{note}</div></div><span class="small">{p}</span></div>' for q, n, note, p in [(1, "Jollof rice &amp; grilled chicken", "Less pepper, extra plantain", "₦8,500"), (1, "Azure club burger", "No onions", "₦9,200"), (2, "Chapman", "", "₦4,800")])}
 <div style="padding:12px 16px" class="col gap6"><div class="row between small"><span class="muted">Service + VAT</span><span>₦4,106</span></div><div class="row between"><b>Total</b><b>₦26,606</b></div></div></div>
 <div><div class="up">Timeline</div><div class="vsteps mt12">
  <div class="vs done"><div class="d">{ic("check")}</div><div class="row between"><div class="small b">Placed by guest</div><span class="tiny dim">19:38</span></div></div>
  <div class="vs done"><div class="d">{ic("check")}</div><div class="row between"><div class="small b">Accepted by Chidi E. <span class="muted" style="font-weight:400">· 1m 12s</span></div><span class="tiny dim">19:42</span></div></div>
  <div class="vs cur"><div class="d">3</div><div class="small b">Deliver to Room 101</div></div></div></div>
 <div class="field"><label>Payment</label><div class="grid g3" style="gap:8px"><span class="btn" style="justify-content:center">{ic("cash")}Cash</span><span class="btn" style="justify-content:center;border-color:var(--brass);background:var(--brass-soft)">{ic("card")}Card</span><span class="btn" style="justify-content:center">{ic("bank")}Transfer</span></div><span class="hint">Recording payment requires Receptionist role or higher.</span></div>
</div>
<div class="row" style="margin-top:auto;padding:16px 24px;border-top:1px solid var(--line)"><span class="btn danger">Cancel order</span><span class="grow"></span><span class="btn">Mark as paid</span><span class="btn ok">{ic("check")}Mark delivered</span></div></div>'''
    return bg + d


# ---------------------------------------------------------------- rooms & stays
@reg("05-rooms-and-stays", 1440, 1000)
def rooms():
    data = [("101", "occ", "Mr. Bello", "Out Oct 22", 1), ("102", "vac", "", "", 0), ("103", "occ", "Ms. Adeyemi", "Out today", 0), ("104", "occ", "Mr. & Mrs. Okafor", "Out Oct 24", 0),
            ("105", "ooo", "", "AC repair", 0), ("106", "vac", "", "", 0), ("107", "occ", "Dr. Nwosu", "Out Oct 21", 2),             ("201", "occ", "Mr. Danjuma", "Out today", 0), ("202", "occ", "Ms. Hassan", "Out Oct 25", 0), ("203", "vac", "", "", 0), ("204", "occ", "Mr. Ojo", "Out Oct 20", 0),
            ("207", "occ", "Mr. Lawal", "Out today", 1), ("208", "occ", "Ms. Uche", "Out Oct 26", 0)]
    cards = ""
    for n, s, g, d, o in data:
        if s == "occ":
            today = "today" in d
            pill = '<span class="pill p-pending" style="font-size:11px"><i></i>Due out</span>' if today else '<span class="pill p-delivered" style="font-size:11px"><i></i>Occupied</span>'
            body = f'<div class="small b mt8">{g}</div><div class="tiny muted">{d}</div>'
            act = f'<div class="tiny mt8 {"blue b" if o else "dim"}">{f"{o} open order" + ("s" if o > 1 else "") if o else "No open orders"}</div><span class="btn sm block mt8">{ic("logout")}Check out</span>'
        elif s == "vac":
            pill = '<span class="pill"><i></i>Vacant</span>'
            body = '<div class="small dim mt8">Ready for guest</div><div class="tiny dim">QR inactive</div><div class="tiny mt8">&nbsp;</div>'
            act = f'<span class="btn sm pri block mt12">{ic("door")}Check in</span>'
        else:
            pill = '<span class="pill p-cancelled" style="font-size:11px"><i></i>Out of order</span>'
            body = f'<div class="small b mt8">Maintenance</div><div class="tiny muted">{d}</div>'
            act = '<span class="btn sm block mt12" style="opacity:.6">Unavailable</span>'
        cards += f'<div class="card" style="padding:14px"><div class="row between"><b style="font-size:18px">{n}</b>{pill}</div>{body}{act}</div>'
    return shell("rooms", "Rooms & stays", "48 rooms · 31 occupied · 3 checking out today", f'''
<div class="grid g4">{''.join(f'<div class="card" style="padding:14px 16px"><div class="muted small b">{t}</div><div class="bb mt4" style="font-size:24px">{v}</div><div class="bar mt8"><span style="width:{p}%;background:{c}"></span></div></div>' for t, v, p, c in [("Occupancy", "65%", 65, "var(--green)"), ("Arrivals today", "7", 40, "var(--blue)"), ("Departures today", "3", 20, "var(--amber)"), ("Out of order", "1", 4, "var(--red)")])}</div>
<div class="row between"><div class="seg"><span class="on">All floors</span><span>Floor 1</span><span>Floor 2</span><span>Floor 3</span><span>Floor 4</span></div><div class="seg"><span class="on">Grid</span><span>List</span></div></div>
<div class="grid" style="grid-template-columns:repeat(6,1fr);gap:14px">{cards}</div>''',
                 actions=f'<span class="btn">{ic("plus")}Add rooms</span><span class="btn pri">{ic("door")}Quick check-in</span>')


@reg("06-check-in-check-out", 1440, 1000)
def checkin():
    bg = rooms()
    m = f'''<div class="scrim" style="gap:30px;grid-template-columns:auto auto;align-content:center;justify-content:center">
<div class="modal"><div class="modal-h"><div class="row"><div class="ico i-blue">{ic("door")}</div><div><h2>Check in · Room 102</h2><div class="small muted">Starts a stay and activates the room's QR code</div></div></div>{ic("x")}</div>
<div class="modal-b"><div class="field"><label>Guest name</label><div class="input focus"><span>Mrs. Funke Adebayo</span></div></div>
<div class="grid g2"><div class="field"><label>Arrival</label><div class="input"><span>Today · 15:20</span></div></div><div class="field"><label>Expected departure</label><div class="input"><span>Oct 23, 2026</span></div></div></div>
<div class="field"><label>Phone (for escalations, optional)</label><div class="input"><span class="ph">+234 …</span></div></div>
<div class="note n-green">{ic("qr")}<span class="small">Room 102's QR code becomes active as soon as you confirm.</span></div></div>
<div class="modal-f"><span class="btn">Cancel</span><span class="btn pri">{ic("check")}Check in</span></div></div>
<div class="modal"><div class="modal-h"><div class="row"><div class="ico i-amber">{ic("logout")}</div><div><h2>Check out · Room 207</h2><div class="small muted">Mr. Lawal · stayed 3 nights</div></div></div>{ic("x")}</div>
<div class="modal-b"><div class="note n-red">{ic("alert")}<span class="small"><b>1 order still open:</b> A-1044 · Pepper soup · IN PROGRESS. Resolve it or check out anyway.</span></div>
<div class="card" style="padding:0">{''.join(f'<div class="row between" style="padding:11px 16px;border-bottom:1px solid var(--line)"><span class="small">{a}</span><span class="small {c}">{b}</span></div>' for a, b, c in [("Orders this stay", "6", ""), ("Total charged", "₦64,300", "b"), ("Paid", "₦52,100", "green b"), ("Outstanding", "₦12,200", "red b")])}</div>
<div class="note n-blue">{ic("shield")}<span class="small">All guest sessions for Room 207 end immediately. A photographed QR code won't work after this.</span></div></div>
<div class="modal-f"><span class="btn">Collect ₦12,200 first</span><span class="btn danger">Check out anyway</span></div></div></div>'''
    return bg + m


# ---------------------------------------------------------------- menu management
@reg("07-menu-management", 1440, 1000)
def menu_mgmt():
    cats = [("Breakfast", 9, False), ("Mains", 14, True), ("Soups & swallows", 6, False), ("Salads", 4, False), ("Desserts", 5, False), ("Drinks", 22, False), ("Amenities", 8, False)]
    cl = "".join(f'<div class="row between" style="padding:10px 12px;border-radius:10px;{"background:var(--brass-soft);" if on else ""}"><span class="small {"b" if on else ""}">{n}</span><span class="tiny muted">{c}</span></div>' for n, c, on in cats)
    items = [("🍛", "#FDEBD3", "Jollof rice & grilled chicken", "₦8,500", True, "142"), ("🍔", "#F9E0D6", "Azure club burger", "₦9,200", True, "118"), ("🍝", "#F3E3F0", "Seafood pasta", "₦11,000", False, "64"),
             ("🥩", "#F6DDD2", "Peppered goat meat", "₦6,000", True, "51"), ("🐟", "#DDEBF7", "Grilled croaker & chips", "₦14,500", True, "38"), ("🥘", "#FBE8C8", "Fried rice & turkey", "₦8,800", True, "97")]
    tr = "".join(f'<tr><td><div class="row"><div style="width:40px;height:40px;border-radius:10px;background:{bg};display:grid;place-items:center;font-size:20px">{e}</div><div><div class="b small">{n}</div><div class="tiny dim">Mains</div></div></div></td><td class="num b">{p}</td><td class="num muted">{s}</td><td><div class="row gap8"><span class="toggle {"on" if a else ""}"></span><span class="small {"green" if a else "red"} b">{"Available" if a else "Unavailable"}</span></div></td><td class="num"><span class="btn sm">{ic("edit")}Edit</span></td></tr>' for e, bg, n, p, a, s in items)
    return shell("menu", "Menu", "Changes push to every guest phone instantly", f'''
<div class="grid" style="grid-template-columns:240px 1fr;gap:20px;align-items:start">
 <div class="card" style="padding:12px"><div class="row between" style="padding:4px 8px 10px"><span class="up">Categories</span><span class="brass">{ic("plus")}</span></div>{cl}</div>
 <div class="card tight"><div class="card-h"><div class="row gap8"><h2>Mains</h2><span class="pill">14 items</span><span class="tiny muted">Served 11:00 – 23:00</span></div><div class="row gap8"><span class="btn sm">{ic("upload")}Bulk import CSV <span class="pill p-violet" style="font-size:10px;padding:0 6px">S2</span></span><span class="btn sm pri">{ic("plus")}Add item</span></div></div>
 <table><thead><tr><th>Item</th><th class="num">Price</th><th class="num">Sold (30d)</th><th>Availability · one tap</th><th></th></tr></thead><tbody>{tr}</tbody></table></div>
</div>''', actions=f'<span class="btn">{ic("eye")}Preview guest menu</span>', role="Manager", user=("KI", "Kemi Idowu"))


# ---------------------------------------------------------------- payments
@reg("08-payments", 1440, 960)
def payments():
    rows = [("A-1039", "205", "Seafood pasta", "₦11,000", "Unpaid", "", "", "Mark as paid"), ("A-1044", "207", "Pepper soup · Water", "₦12,200", "Unpaid", "", "", "Mark as paid"),
            ("A-1036", "309", "Breakfast ×2", "₦18,000", "Paid", "Card", "Amaka O. · 08:14", ""), ("A-1033", "101", "Club sandwich", "₦7,500", "Paid", "Transfer", "Amaka O. · 07:52", ""),
            ("A-1031", "104", "Fried rice & turkey ×2", "₦17,600", "Paid", "Cash", "Tunde B. · 23:40", ""), ("A-1029", "112", "Chapman ×3", "₦7,200", "Paid", "Card", "Tunde B. · 22:15", "")]
    tr = "".join(f'<tr><td class="mono small">{o}</td><td class="b">{r}</td><td class="muted">{i}</td><td class="num b">{a}</td><td><span class="pill {"p-pending" if s == "Unpaid" else "p-delivered"}"><i></i>{s}</span></td><td>{m and f"<span class=pill>{m}</span>"}</td><td class="small muted">{by}</td><td class="num">{f"<span class=\"btn sm pri\">{act}</span>" if act else ""}</td></tr>' for o, r, i, a, s, m, by, act in rows)
    return shell("payments", "Payments", "Collected at the front desk and recorded here", f'''
{kpis([("Collected today", "₦412,800", "38 payments", "green", "cash", "i-green"), ("Outstanding", "₦23,200", "5 delivered, unpaid", "amber", "alert", "i-amber"), ("Card", "₦248,100", "60%", "muted", "card", "i-blue"), ("Cash / transfer", "₦164,700", "40%", "muted", "bank", "i-brass")])}
<div class="card tight"><div class="card-h"><div class="tabs" style="border:0"><span class="tab on">Delivered orders</span><span class="tab">Unpaid <span class="pill p-pending" style="padding:0 7px">5</span></span><span class="tab">Paid</span></div><span class="btn sm">{ic("download")}Export</span></div>
<table><thead><tr><th>Order</th><th>Room</th><th>Items</th><th class="num">Amount</th><th>Status</th><th>Method</th><th>Recorded by</th><th></th></tr></thead><tbody>{tr}</tbody></table></div>''')


# ---------------------------------------------------------------- QR codes
def qr_svg(seed, size=120):
    import random
    rnd = random.Random(seed)
    n = 21
    cells = []
    for y in range(n):
        for x in range(n):
            finder = (x < 7 and y < 7) or (x > 13 and y < 7) or (x < 7 and y > 13)
            if finder:
                fx, fy = (x if x < 7 else x - 14), (y if y < 7 else y - 14)
                on = fx in (0, 6) or fy in (0, 6) or (2 <= fx <= 4 and 2 <= fy <= 4)
            else:
                on = rnd.random() < .48
            if on:
                cells.append(f'<rect x="{x}" y="{y}" width="1" height="1"/>')
    return f'<svg viewBox="-1 -1 23 23" width="{size}" height="{size}" fill="#16213A" shape-rendering="crispEdges"><rect x="-1" y="-1" width="23" height="23" fill="#fff"/>{"".join(cells)}</svg>'


@reg("09-qr-codes", 1440, 1000)
def qr():
    tiles = "".join(f'<div class="card center" style="padding:16px"><div class="row between"><b>Room {r}</b><span class="dim">{ic("dots")}</span></div><div style="margin:12px auto">{qr_svg(r, 110)}</div><div class="tiny mono dim">/r/{t}…</div><div class="tiny muted mt4">Regenerated {d}</div></div>'
                    for r, t, d in [("101", "k7Qx9v", "never"), ("102", "Pz3mA1", "never"), ("103", "Hq8LtR", "Oct 12"), ("104", "w2Ne5K", "never"), ("105", "Xc4bYu", "never"), ("106", "m9TgVs", "Sep 30"), ("107", "Rj1oPd", "never"), ("108", "Lf6eWa", "never")])
    sheet = f'''<div style="background:#fff;border:1px solid var(--line);box-shadow:var(--sh);border-radius:6px;padding:26px;aspect-ratio:1/1.414;display:flex;flex-direction:column;align-items:center;text-align:center">
<div class="row gap8">{MARK}<b>Azure Bay Hotel</b></div><div class="serif mt16" style="font-size:24px">Room service &amp; requests</div><div class="small muted">Scan with your phone camera. No app needed.</div>
<div class="mt16">{qr_svg("101", 190)}</div><div class="serif mt12" style="font-size:30px">Room 101</div><div class="tiny dim mt8">Wi-Fi: AzureBay-Guest</div></div>'''
    return shell("qr", "QR codes", "One unguessable token per room. Tokens never contain the room number.", f'''
<div class="grid" style="grid-template-columns:1fr 330px;gap:20px;align-items:start">
 <div class="col" style="gap:16px"><div class="row between"><div class="seg"><span class="on">Floor 1</span><span>Floor 2</span><span>Floor 3</span><span>Floor 4</span></div><span class="small muted">8 selected</span></div>
 <div class="grid g4">{tiles}</div></div>
 <div class="col" style="gap:16px"><div class="card"><div class="up">Print preview · A5 table card</div><div class="mt12">{sheet}</div><span class="btn pri block mt16">{ic("printer")}Download PDF (48 rooms)</span></div>
 <div class="note n-amber">{ic("refresh")}<span class="small"><b>Regenerate</b> if a code is photographed or leaked. The old code stops working instantly.</span></div></div>
</div>''', actions=f'<span class="btn">{ic("refresh")}Regenerate selected</span><span class="btn pri">{ic("download")}Print-ready PDF</span>', role="Admin", user=("EE", "Emmanuel Ekwe"))


# ---------------------------------------------------------------- staff
@reg("10-staff-and-roles", 1440, 980)
def staff():
    people = [("EE", "Emmanuel Ekwe", "admin@azurebay.ng", "Admin", "p-navy", "Active", "now"), ("KI", "Kemi Idowu", "kemi@azurebay.ng", "Manager", "p-brass", "Active", "12 min"),
              ("AO", "Amaka Obi", "reception@azurebay.ng", "Receptionist", "p-progress", "Active", "now"), ("TB", "Tunde Bakare", "tunde@azurebay.ng", "Receptionist", "p-progress", "Off shift", "9 h"),
              ("CE", "Chidi Eze", "kitchen@azurebay.ng", "Staff", "", "Active", "now"), ("FA", "Fatima Abubakar", "fatima@azurebay.ng", "Staff", "", "Active", "3 min"), ("SO", "Segun Ola", "segun@azurebay.ng", "Staff", "", "Deactivated", "14 d")]
    tr = "".join(f'<tr style="{"opacity:.55" if s == "Deactivated" else ""}"><td><div class="row"><div class="av" style="background:{["#16213A","#B9822F","#2F6FEB","#1F9D6E","#7357D8"][i % 5]}">{a}</div><div><div class="b small">{n}</div><div class="tiny dim">{e}</div></div></div></td><td><span class="pill {c}">{r}</span></td><td><span class="small {"green b" if s == "Active" else "muted"}">{s}</span></td><td class="muted small">{l}</td><td class="num"><span class="btn sm">{ic("edit")}</span></td></tr>' for i, (a, n, e, r, c, s, l) in enumerate(people))
    perms = [("View & update orders", 1, 1, 1, 1), ("Mark items unavailable", 0, 1, 1, 1), ("Record payments", 0, 1, 1, 1), ("Check in / out", 0, 1, 1, 1), ("Edit menu", 0, 0, 1, 1), ("Manage staff", 0, 0, "½", 1), ("Rooms & QR codes", 0, 0, 0, 1)]
    def mark(v):
        if v == 1: return f'<span class="green">{ic("check")}</span>'
        if v == "½": return '<span class="tiny amber b">Limited</span>'
        return '<span class="dim">—</span>'
    pr = "".join(f'<tr><td class="small">{p}</td>{"".join(f"<td style=text-align:center>{mark(v)}</td>" for v in vs)}</tr>' for p, *vs in perms)
    return shell("staff", "Staff & roles", "Roles are cumulative and enforced on the server for every request", f'''
<div class="grid" style="grid-template-columns:1.35fr 1fr;gap:20px;align-items:start">
 <div class="card tight"><div class="card-h"><h2>Team · 7</h2><div class="seg"><span class="on">All</span><span>Active</span><span>Deactivated</span></div></div><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last seen</th><th></th></tr></thead><tbody>{tr}</tbody></table></div>
 <div class="card tight"><div class="card-h"><h2>Permissions</h2><span class="tiny muted">Admin ⊃ Manager ⊃ Receptionist ⊃ Staff</span></div>
 <table><thead><tr><th></th><th style="text-align:center">Staff</th><th style="text-align:center">Recep.</th><th style="text-align:center">Mgr</th><th style="text-align:center">Admin</th></tr></thead><tbody>{pr}</tbody></table></div>
</div>''', actions=f'<span class="btn pri">{ic("plus")}Invite staff</span>', role="Admin", user=("EE", "Emmanuel Ekwe"))


# ---------------------------------------------------------------- audit
@reg("11-activity-log", 1440, 980)
def audit():
    ev = [("19:52", "order.status_changed", "A-1042 → IN_PROGRESS", "Chidi Eze", "p-progress"), ("19:48", "order.created", "A-1047 · Room 214 · ₦23,200", "Guest · Room 214", "p-pending"),
          ("19:41", "item.availability_changed", "Seafood pasta → unavailable", "Kemi Idowu", "p-cancelled"), ("19:30", "payment.recorded", "A-1036 · ₦18,000 · Card", "Amaka Obi", "p-delivered"),
          ("19:12", "stay.checked_out", "Room 115 · Mr. Ade", "Amaka Obi", ""), ("19:12", "guest_session.invalidated", "Room 115 · 2 sessions closed", "System", ""),
          ("18:55", "stay.checked_in", "Room 102 · Mrs. Adebayo", "Amaka Obi", "p-delivered"), ("18:20", "user.deactivated", "Segun Ola", "Emmanuel Ekwe", "p-cancelled"),
          ("17:05", "room.qr_regenerated", "Room 103", "Emmanuel Ekwe", "p-brass")]
    tr = "".join(f'<tr><td class="mono small muted">{t}</td><td><span class="pill {c} mono" style="font-size:11px">{e}</span></td><td class="small">{d}</td><td class="small muted">{a}</td></tr>' for t, e, d, a, c in ev)
    return shell("audit", "Activity log", "Immutable record built from domain events, scoped to this hotel", f'''
<div class="row between"><div class="row gap8"><div class="seg"><span class="on">All</span><span>Orders</span><span>Payments</span><span>Stays</span><span>Menu</span><span>Staff</span></div></div><div class="row gap8"><span class="btn sm">{ic("users")}Any staff</span><span class="btn sm">{ic("clock")}Today</span></div></div>
<div class="card tight"><table><thead><tr><th>Time</th><th>Event</th><th>Detail</th><th>Actor</th></tr></thead><tbody>{tr}</tbody></table></div>''',
                 actions=f'<span class="btn">{ic("download")}Export CSV</span>', role="Manager", user=("KI", "Kemi Idowu"))


# ---------------------------------------------------------------- owner insights
@reg("12-owner-insights", 1440, 1080)
def insights():
    rev = [180, 210, 195, 240, 260, 230, 290, 310, 280, 330, 350, 320, 380, 412]
    staff = [("Chidi Eze", "Kitchen", "1m 12s", 84, 96), ("Fatima Abubakar", "Kitchen", "1m 40s", 61, 88), ("Tunde Bakare", "Front desk", "2m 05s", 40, 74), ("Amaka Obi", "Front desk", "2m 31s", 33, 62)]
    sr = "".join(f'<tr><td class="b small">{n}</td><td class="muted small">{d}</td><td class="num small">{t}</td><td class="num small">{o}</td><td style="width:140px"><div class="bar"><span style="width:{p}%;background:var(--green)"></span></div></td></tr>' for n, d, t, o, p in staff)
    feed = [("🛎️", "New order · Room 214 · ₦23,200", "just now"), ("✅", "Delivered · Room 205 · Seafood pasta", "4 min"), ("💳", "Payment · ₦18,000 card · Room 309", "22 min"), ("🚪", "Check-out · Room 115", "40 min"), ("⚠️", "Escalated · Room 318 unaccepted 2m", "1 h")]
    fd = "".join(f'<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)"><span style="font-size:18px">{e}</span><span class="small grow">{t}</span><span class="tiny dim">{a}</span></div>' for e, t, a in feed)
    return shell("insights", "Owner insights", "Azure Bay Hotel · last 14 days", f'''
{kpis([("Revenue", "₦4.21M", "▲ 18% vs prior 14d", "green", "chart", "i-green"), ("Orders", "1,284", "▲ 11%", "green", "orders", "i-blue"), ("Avg. accept time", "1m 52s", "▼ 24s faster", "green", "clock", "i-brass"), ("Avg. order value", "₦18,400", "▲ ₦1,200", "green", "card", "i-violet")])}
<div class="grid" style="grid-template-columns:1.6fr 1fr;gap:20px">
 <div class="card"><div class="row between"><div><h2>Revenue</h2><div class="small muted">Room service + amenities</div></div><div class="seg"><span>7D</span><span class="on">14D</span><span>30D</span></div></div><div class="bb mt12" style="font-size:30px">₦412,800 <span class="small green">today</span></div><div class="mt12">{spark(rev, 800, 190)}</div><div class="row between tiny dim mt8"><span>Oct 6</span><span>Oct 10</span><span>Oct 14</span><span>Oct 19</span></div></div>
 <div class="card"><div class="row between"><h2>Live activity</h2><span class="live">Live</span></div><div class="mt8">{fd}</div></div>
</div>
<div class="grid" style="grid-template-columns:1.6fr 1fr;gap:20px">
 <div class="card tight"><div class="card-h"><h2>Response time by staff</h2><span class="tiny muted">Target: accept &lt; 2 min</span></div><table><thead><tr><th>Staff</th><th>Dept.</th><th class="num">Avg. accept</th><th class="num">Orders</th><th>Within target</th></tr></thead><tbody>{sr}</tbody></table></div>
 <div class="card"><h2>Top items</h2>{''.join(f'<div class="mt12"><div class="row between small"><span>{n}</span><b>{v}</b></div><div class="bar mt4"><span style="width:{p}%"></span></div></div>' for n, v, p in [("Jollof rice &amp; chicken", 142, 100), ("Azure club burger", 118, 83), ("Fried rice &amp; turkey", 97, 68), ("Chapman", 88, 62), ("Seafood pasta", 64, 45)])}</div>
</div>''', actions=f'<span class="btn">{ic("download")}Daily summary</span><span class="btn">{ic("clock")}Shift logs</span>', role="Owner · Admin", user=("EE", "Emmanuel Ekwe"))


# ---------------------------------------------------------------- reconciliation
@reg("13-reconciliation-report", 1440, 980)
def recon():
    rows = [("Night · Oct 18 (22:00–06:00)", "Tunde B.", 31, "₦486,200", "₦486,200", "₦0", "ok"), ("Day · Oct 18 (06:00–14:00)", "Amaka O.", 44, "₦702,900", "₦690,700", "₦12,200", "gap"),
            ("Eve · Oct 18 (14:00–22:00)", "Amaka O.", 52, "₦811,400", "₦811,400", "₦0", "ok"), ("Night · Oct 17", "Tunde B.", 28, "₦401,000", "₦392,000", "₦9,000", "gap"), ("Day · Oct 17", "Amaka O.", 39, "₦612,300", "₦612,300", "₦0", "ok")]
    tr = "".join(f'<tr><td class="b small">{s}</td><td class="small muted">{w}</td><td class="num">{n}</td><td class="num">{d}</td><td class="num">{p}</td><td class="num b {"red" if st == "gap" else "green"}">{g}</td><td><span class="pill {"p-cancelled" if st == "gap" else "p-delivered"}"><i></i>{"Needs review" if st == "gap" else "Balanced"}</span></td></tr>' for s, w, n, d, p, g, st in rows)
    return shell("recon", "Reconciliation", "Delivered orders vs. payments recorded, by shift", f'''
<div class="grid g3">
 <div class="card"><div class="muted small b">Delivered value (7d)</div><div class="bb mt8" style="font-size:28px">₦3,013,800</div></div>
 <div class="card"><div class="muted small b">Payments recorded (7d)</div><div class="bb mt8" style="font-size:28px">₦2,992,600</div></div>
 <div class="card" style="border-color:#F3C3C8;background:#FFF8F8"><div class="muted small b">Unreconciled</div><div class="bb mt8 red" style="font-size:28px">₦21,200</div><div class="small muted">2 shifts · 3 orders</div></div>
</div>
<div class="card tight"><div class="card-h"><h2>By shift</h2><div class="row gap8"><span class="btn sm">{ic("clock")}Last 7 days</span><span class="btn sm">{ic("download")}PDF</span></div></div>
<table><thead><tr><th>Shift</th><th>On duty</th><th class="num">Orders</th><th class="num">Delivered</th><th class="num">Paid</th><th class="num">Difference</th><th>Status</th></tr></thead><tbody>{tr}</tbody></table></div>
<div class="card"><div class="row between"><h2>Unpaid deliveries · Day · Oct 18</h2><span class="btn sm pri">Cross-check with front desk</span></div>
<div class="row mt12" style="padding:12px;border:1px solid var(--line);border-radius:12px"><span class="mono small">A-1044</span><b class="small">Room 207</b><span class="small muted grow">Pepper soup · Water · delivered 13:12 by Fatima A.</span><b class="red">₦12,200</b><span class="btn sm">Mark as paid</span></div></div>''',
                 role="Owner · Admin", user=("EE", "Emmanuel Ekwe"))


# ---------------------------------------------------------------- escalations
@reg("14-escalation-rules", 1440, 960)
def escal():
    return shell("escal", "Escalations", "Make sure no order waits unnoticed", f'''
<div class="grid" style="grid-template-columns:1.3fr 1fr;gap:20px;align-items:start">
 <div class="card"><h2>Escalation ladder</h2><div class="small muted mt4">Triggered when an order stays PENDING.</div>
  <div class="vsteps mt20">
   <div class="vs done"><div class="d">{ic("bell")}</div><div><div class="b">0s · Dashboard alert</div><div class="small muted">Sound + visual on every signed-in staff screen</div></div></div>
   <div class="vs cur"><div class="d">2</div><div><div class="row between"><div class="b">After <span class="brass">2 min</span> · Shift manager</div><span class="toggle on"></span></div><div class="row gap8 mt8"><span class="pill">{ic("whatsapp")}WhatsApp</span><span class="pill">Kemi Idowu · +234 803 ••• 4412</span></div></div></div>
   <div class="vs"><div class="d">3</div><div><div class="row between"><div class="b">After <span class="brass">5 min</span> · Admin / owner</div><span class="toggle on"></span></div><div class="row gap8 mt8"><span class="pill">{ic("phone")}SMS</span><span class="pill">Emmanuel Ekwe · +234 802 ••• 9017</span></div></div></div>
  </div>
  <div class="grid g2 mt8"><div class="field"><label>First alert after</label><div class="input"><span>120</span><span class="suf">seconds</span></div></div><div class="field"><label>Second alert after</label><div class="input"><span>300</span><span class="suf">seconds</span></div></div></div>
  <div class="row mt20" style="justify-content:flex-end;gap:8px"><span class="btn">Send test alert</span><span class="btn pri">Save rules</span></div></div>
 <div class="col" style="gap:16px">
  <div class="card"><div class="up">Message preview</div><div class="mt12" style="background:#E7F7EC;border-radius:14px 14px 14px 4px;padding:12px 14px" class="small"><b>ConciergeIQ ⚠️</b><br>Room 318 order <b>A-1046</b> (Extra towels) has waited <b>2 min</b> without being accepted.<br><span class="blue">Open dashboard →</span></div></div>
  <div class="card tight"><div class="card-h"><h3>Recent escalations</h3><span class="tiny muted">7 days</span></div>{''.join(f'<div class="row" style="padding:11px 20px;border-bottom:1px solid var(--line)"><span class="pill {c}" style="font-size:11px">{l}</span><span class="small grow">{d}</span><span class="tiny dim">{t}</span></div>' for l, c, d, t in [("Level 1", "p-pending", "Room 318 · accepted after 2m 40s", "1h"), ("Level 2", "p-cancelled", "Room 104 · accepted after 6m 02s", "2d"), ("Level 1", "p-pending", "Room 207 · accepted after 2m 15s", "3d")])}</div>
 </div>
</div>''', role="Admin", user=("EE", "Emmanuel Ekwe"))


# ---------------------------------------------------------------- settings
@reg("15-hotel-settings-branding", 1440, 980)
def settings():
    return shell("settings", "Settings", "Hotel profile, guest page branding and languages", f'''
<div class="tabs"><span class="tab on">Branding</span><span class="tab">Hotel profile</span><span class="tab">Service hours</span><span class="tab">Taxes &amp; charges</span><span class="tab">AI concierge content</span><span class="tab">Integrations</span></div>
<div class="grid" style="grid-template-columns:1fr 360px;gap:20px;align-items:start">
 <div class="col" style="gap:20px">
  <div class="card"><h2>Guest page branding</h2>
   <div class="grid g2 mt16" style="gap:16px">
    <div class="field"><label>Logo</label><div class="input" style="height:64px"><div class="av" style="background:var(--brass);width:40px;height:40px">AB</div><span class="small">azure-bay-logo.svg</span><span class="suf brass b">Replace</span></div></div>
    <div class="field"><label>Welcome headline</label><div class="input"><span>Welcome to Room {{room}}</span></div></div>
    <div class="field"><label>Brand colour</label><div class="row gap8">{''.join(f'<span style="width:36px;height:36px;border-radius:10px;background:{c};{"box-shadow:0 0 0 3px #fff,0 0 0 5px var(--ink)" if i == 0 else ""}"></span>' for i, c in enumerate(["#16213A", "#0E5E57", "#6B2737", "#2F2F2F", "#1D4ED8"]))}</div></div>
    <div class="field"><label>Accent colour</label><div class="row gap8">{''.join(f'<span style="width:36px;height:36px;border-radius:10px;background:{c};{"box-shadow:0 0 0 3px #fff,0 0 0 5px var(--ink)" if i == 0 else ""}"></span>' for i, c in enumerate(["#B9822F", "#D9434F", "#1F9D6E", "#7357D8", "#E58E26"]))}</div></div>
   </div></div>
  <div class="card"><h2>Guest languages <span class="pill p-violet" style="font-size:10px">S2</span></h2>{''.join(f'<div class="row between" style="padding:12px 0;border-bottom:1px solid var(--line)"><span class="small">{l}</span><span class="toggle {"on" if o else ""}"></span></div>' for l, o in [("English (default)", 1), ("French · Français", 1), ("Hausa", 0), ("Yorùbá", 0), ("Arabic · العربية", 0)])}</div>
 </div>
 <div class="card"><div class="up">Live preview</div>
  <div style="margin-top:12px;border-radius:24px;overflow:hidden;border:8px solid #121A2E">
   <div style="background:linear-gradient(160deg,#22305A,#16213A);color:#fff;padding:22px"><div class="row gap8"><div class="av" style="background:var(--brass)">AB</div><b class="small">Azure Bay Hotel</b></div><div class="serif mt24" style="font-size:26px;line-height:1.1">Welcome to Room 101</div></div>
   <div style="padding:14px;background:#FBF9F5" class="grid g2">{''.join(f'<div class="card" style="padding:12px"><div style="font-size:20px">{e}</div><div class="small b mt4">{t}</div></div>' for e, t in [("🍛", "Room service"), ("🛁", "Amenities"), ("📦", "My orders"), ("✨", "Concierge")])}</div>
  </div><span class="btn pri block mt16">Publish changes</span></div>
</div>''', role="Admin", user=("EE", "Emmanuel Ekwe"))


# ---------------------------------------------------------------- tablet / mobile staff + offline
@reg("16-staff-mobile-and-offline", 1440, 1000)
def staff_mobile():
    from kit import phone
    p1 = phone(f'''<div class="row between"><div class="row gap8">{MARK}<b>Orders</b></div><span class="live">Live</span></div>
<div class="seg" style="width:100%"><span class="on" style="flex:1;text-align:center">Pending 3</span><span style="flex:1;text-align:center">Active 2</span><span style="flex:1;text-align:center">Done</span></div>
{''.join(f'<div class="card" style="padding:14px;{"border:1.5px solid var(--amber)" if u else ""}"><div class="row between"><b>Room {r}</b><span class="tiny {"amber b" if u else "dim"}">{a}</span></div><div class="small muted mt4">{i}</div><div class="grid g2 mt12" style="gap:8px"><span class="btn sm danger" style="justify-content:center">Cancel</span><span class="btn sm pri" style="justify-content:center">Accept</span></div></div>' for r, i, a, u in [("214", "Club burger ×2 · Chapman", "2:41", 1), ("318", "Extra towels ×2", "1:02", 0), ("407", "Egusi &amp; pounded yam", "0:12", 0)])}''')
    p2 = phone(f'''<div class="row between"><div class="row gap8">{MARK}<b>Orders</b></div><span class="pill p-cancelled" style="font-size:11px">{ic("wifioff")}Offline</span></div>
<div class="note n-red small">{ic("wifioff")}<span><b>Connection lost.</b> Reconnecting… (attempt 3). Orders are safe on the server and will appear when you're back.</span></div>
<div class="card center" style="padding:28px"><div style="font-size:44px">📡</div><h3 class="mt8">Showing last known board</h3><div class="small muted mt4">Updated 19:52 · actions are paused</div><span class="btn block mt16">{ic("refresh")}Retry now</span></div>
<div class="card" style="padding:14px;opacity:.55"><div class="row between"><b>Room 214</b><span class="tiny dim">2:41</span></div><div class="small muted mt4">Club burger ×2 · Chapman</div></div>''')
    return f'''<div class="stage" style="gap:60px"><div class="caption"><div class="row gap8">{MARK}<b>Concierge<span class="brass">IQ</span></b><span class="pill p-navy">Staff app</span></div><h1 class="mt24">On the floor, on any phone.</h1>
<p class="muted mt12" style="font-size:16px">The dashboard is responsive, so runners and kitchen staff accept orders from their phones. When the WebSocket drops, the UI says so plainly and pauses actions instead of failing silently.</p>
<div class="col mt20" style="gap:10px">{''.join(f'<div class="row gap8 small"><span class="green">{ic("check")}</span><span class="muted">{b}</span></div>' for b in ["Big Accept / Cancel targets", "Waiting time turns amber past 2 minutes", "Clear offline banner with auto-retry", "Browsers block sound until first tap, so we prompt for it"])}</div></div>{p1}{p2}</div>'''
