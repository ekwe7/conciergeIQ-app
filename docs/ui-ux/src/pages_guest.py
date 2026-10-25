from kit import reg, ic, phone, stage, MARK

W, H = 1200, 960


def food(emoji, bg, size=64, r=14):
    return f'<div class="food" style="width:{size}px;height:{size}px;border-radius:{r}px;background:{bg};display:grid;place-items:center;font-size:{int(size*.5)}px">{emoji}</div>'


def head(title, back=True, right=""):
    b = f'<span class="btn sm" style="width:34px;padding:0;justify-content:center;border-radius:50%">{ic("back")}</span>' if back else "<span></span>"
    return f'<div class="row between">{b}<b style="font-size:16px">{title}</b>{right or "<span style=width:34px></span>"}</div>'


ROOM = '<span class="pill p-brass">Room 101</span>'


@reg("G01-guest-welcome", W, H)
def welcome():
    ph = phone(f'''
<div style="margin:-10px -18px 0;height:300px;background:linear-gradient(160deg,#22305A,#16213A 60%);color:#fff;padding:26px 22px;position:relative;overflow:hidden">
  <div style="position:absolute;right:-60px;top:-40px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(211,160,80,.45),transparent 70%)"></div>
  <div class="row between"><div class="row gap8"><div class="av" style="background:var(--brass)">AB</div><b>Azure Bay Hotel</b></div><span class="pill" style="background:rgba(255,255,255,.12);color:#fff">{ic("globe")}EN</span></div>
  <div class="serif" style="font-size:34px;line-height:1.1;margin-top:58px">Good evening,<br>welcome to Room 101</div>
  <div class="small mt12" style="color:#C9CFDF">Order food, request amenities and track everything live, with no app needed.</div>
</div>
<div class="grid g2" style="gap:12px;margin-top:4px">
  <div class="card" style="padding:16px"><div class="ico i-brass">{ic("menu")}</div><div class="b mt12">Room service</div><div class="tiny muted">Kitchen open until 23:00</div></div>
  <div class="card" style="padding:16px"><div class="ico i-blue">{ic("towel")}</div><div class="b mt12">Amenities</div><div class="tiny muted">Towels, toiletries, pillows</div></div>
  <div class="card" style="padding:16px"><div class="ico i-green">{ic("list")}</div><div class="b mt12">My orders</div><div class="tiny muted">1 on its way</div></div>
  <div class="card" style="padding:16px"><div class="ico i-violet">{ic("sparkle")}</div><div class="b mt12">Ask concierge</div><div class="tiny muted">Wi-Fi, checkout, hours</div></div>
</div>
<div class="card row" style="padding:14px;background:var(--green-soft);border-color:#BFE5D3"><div class="ico" style="background:#fff;color:var(--green)">{ic("clock")}</div><div class="grow"><div class="b small">Jollof rice &amp; chicken</div><div class="tiny muted">In progress · arriving in ~12 min</div></div>{ic("chev")}</div>''')
    return stage(ph, "01 · Scan & welcome", "Scan. No app. No login.", "The QR code holds only a random token. The server resolves it to hotel + room and opens a session only during an active stay.",
                 ["Hotel branding and greeting by time of day", "Four clear entry points, big tap targets", "Active order surfaced at the top of the home screen", "Language switcher (Stage 2)"])


@reg("G02-guest-menu", W, H)
def menu():
    items = [("🍛", "#FDEBD3", "Jollof rice & grilled chicken", "Smoky party jollof, plantain", "₦8,500", ""),
             ("🍔", "#F9E0D6", "Azure club burger", "Beef, cheddar, fries", "₦9,200", "Popular"),
             ("🍲", "#E8F0DA", "Egusi soup & pounded yam", "Assorted meat", "₦7,800", ""),
             ("🥗", "#DDF1E8", "Caesar salad", "Romaine, parmesan, croutons", "₦5,500", ""),
             ("🍝", "#F3E3F0", "Seafood pasta", "Prawns, calamari, tomato", "₦11,000", "out")]
    rows = ""
    for e, bg, n, d, p, tag in items:
        out = tag == "out"
        badge = '<span class="pill p-cancelled" style="font-size:11px">Out of stock</span>' if out else (f'<span class="pill p-brass" style="font-size:11px">{tag}</span>' if tag else "")
        btn = '' if out else f'<span class="btn sm gold" style="width:30px;padding:0;justify-content:center;border-radius:50%">{ic("plus")}</span>'
        rows += f'<div class="row" style="padding:12px 0;border-bottom:1px solid var(--line);{"opacity:.5" if out else ""}">{food(e, bg)}<div class="grow"><div class="b small">{n}</div><div class="tiny muted">{d}</div><div class="row gap8 mt4"><b class="small">{p}</b>{badge}</div></div>{btn}</div>'
    ph = phone(f'''{head("Room service", right=ROOM)}
<div class="row" style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--dim)">{ic("search")}<span class="small">Search the menu</span></div>
<div class="row gap8" style="overflow:hidden"><span class="chip on">Mains</span><span class="chip">Breakfast</span><span class="chip">Drinks</span><span class="chip">Desserts</span><span class="chip">Sides</span></div>
<div class="row between"><h3 class="serif" style="font-size:20px">Mains</h3><span class="tiny muted">Served 11:00 – 23:00</span></div>
<div style="margin-top:-6px">{rows}</div>''',
               foot=f'<div class="btn lg pri block" style="justify-content:space-between"><span class="row gap8"><span class="pill" style="background:var(--brass);color:#fff">2</span>View cart</span><span>₦17,700</span></div>')
    return stage(ph, "02 · Browse the menu", "A menu built for thumbs.", "Categories, notes and live availability. When staff tap 'mark unavailable', the item greys out on every guest phone instantly.",
                 ["Sticky category chips", "Out-of-stock badge pushed in real time", "Floating cart with running total", "Prices shown, but always recalculated on the server"])


@reg("G03-guest-item-detail", W, H)
def item():
    ph = phone(f'''
<div style="margin:-10px -18px 0;height:270px;background:linear-gradient(160deg,#FDEBD3,#F6D3A8);display:grid;place-items:center;font-size:120px;position:relative">🍛
<span class="btn sm" style="position:absolute;left:18px;top:14px;width:34px;padding:0;justify-content:center;border-radius:50%">{ic("x")}</span></div>
<div><div class="row between"><h2 class="serif" style="font-size:24px">Jollof rice &amp; grilled chicken</h2></div><div class="muted small mt4">Smoky party jollof with quarter chicken, fried plantain and coleslaw. Mildly spicy.</div><div class="bb mt12" style="font-size:20px">₦8,500</div></div>
<div class="sep"></div>
<div><div class="b small">Choose protein</div>
<div class="col mt8" style="gap:8px">
<div class="row" style="padding:12px;border:1.5px solid var(--brass);background:var(--brass-soft);border-radius:12px"><span style="width:18px;height:18px;border-radius:50%;border:5px solid var(--brass)"></span><span class="grow small b">Grilled chicken</span><span class="tiny muted">Included</span></div>
<div class="row" style="padding:12px;border:1px solid var(--line2);border-radius:12px;background:#fff"><span style="width:18px;height:18px;border-radius:50%;border:2px solid var(--line2)"></span><span class="grow small">Fried fish</span><span class="tiny muted">+₦1,000</span></div>
</div></div>
<div class="field"><label>Note for the kitchen</label><div class="input" style="height:64px;align-items:flex-start;padding-top:10px"><span class="small">Less pepper please, extra plantain 🙏</span></div><span class="hint">Max 200 characters</span></div>''',
               foot=f'<div class="row"><span class="qty">{ic("minus")}1{ic("plus")}</span><span class="btn lg gold grow" style="justify-content:center">Add to cart · ₦8,500</span></div>')
    return stage(ph, "03 · Item detail", "Say it exactly how you want it.", "Options and a free-text note go straight to the kitchen ticket.",
                 ["Large imagery and clear price", "Option groups with price deltas", "Per-item notes", "Quantity stepper beside the main action"])


@reg("G04-guest-cart-checkout", W, H)
def cart():
    lines = [("🍛", "#FDEBD3", "Jollof rice & grilled chicken", "Less pepper, extra plantain", "₦8,500", 1), ("🍔", "#F9E0D6", "Azure club burger", "No onions", "₦9,200", 1), ("🥤", "#DDEBF7", "Chapman", "", "₦2,400", 2)]
    li = "".join(f'<div class="row" style="padding:12px 0;border-bottom:1px solid var(--line)">{food(e, bg, 52, 12)}<div class="grow"><div class="b small">{n}</div><div class="tiny muted">{d or "&nbsp;"}</div><b class="small">{p}</b></div><span class="qty" style="font-size:13px">{ic("minus")}{q}{ic("plus")}</span></div>' for e, bg, n, d, p, q in lines)
    ph = phone(f'''{head("Your order", right=ROOM)}
<div>{li}</div>
<div class="card" style="padding:16px"><div class="row between small"><span class="muted">Subtotal</span><span>₦22,500</span></div><div class="row between small mt8"><span class="muted">Service charge (10%)</span><span>₦2,250</span></div><div class="row between small mt8"><span class="muted">VAT (7.5%)</span><span>₦1,856</span></div><div class="sep mt12"></div><div class="row between mt12"><b>Total</b><b style="font-size:18px">₦26,606</b></div></div>
<div class="card row" style="padding:14px"><div class="ico i-brass">{ic("card")}</div><div class="grow"><div class="b small">Pay at the front desk</div><div class="tiny muted">Cash, card or transfer. Added to Room 101.</div></div></div>
<div class="note n-blue">{ic("shield")}<span class="small">Tapping twice won't create a duplicate order.</span></div>''',
               foot='<div class="btn lg gold block">Place order · ₦26,606</div>')
    return stage(ph, "04 · Cart & place order", "One tap, never twice.", "Each submit sends an Idempotency-Key, so a retry on a weak signal never creates a second order. The server recalculates prices.",
                 ["Inline quantity editing", "Transparent charges", "Payment expectation set up front", "Disabled + spinner while submitting"])


@reg("G05-guest-order-tracking", W, H)
def track():
    ph = phone(f'''{head("Order #A-1042", right=ROOM)}
<div class="card center" style="padding:22px;background:linear-gradient(180deg,#fff,#FBF6EE)">
  <div style="width:84px;height:84px;margin:0 auto;border-radius:50%;background:var(--blue-soft);display:grid;place-items:center;font-size:40px">👨‍🍳</div>
  <h2 class="serif mt12" style="font-size:24px">Being prepared</h2>
  <div class="muted small mt4">Accepted by Chidi · Kitchen · 19:42</div>
  <div class="pill p-progress mt12"><i></i>IN PROGRESS · ~12 min</div>
</div>
<div class="card"><div class="vsteps">
  <div class="vs done"><div class="d">{ic("check")}</div><div><div class="b small">Order received</div><div class="tiny muted">19:38 · sent to staff instantly</div></div></div>
  <div class="vs cur"><div class="d">2</div><div><div class="b small">Being prepared</div><div class="tiny muted">19:42 · accepted by kitchen</div></div></div>
  <div class="vs"><div class="d">3</div><div><div class="b small dim">Delivered to your room</div><div class="tiny dim">We'll update this screen live</div></div></div>
</div></div>
<div class="card" style="padding:14px"><div class="row between small"><span class="muted">3 items</span><b>₦26,606</b></div><div class="tiny muted mt4">Jollof rice &amp; chicken · Club burger · Chapman ×2</div></div>
<div class="row center small muted gap6"><span class="live" style="font-size:11px">Live</span>Updates automatically</div>''',
               foot=f'<div class="grid g2" style="gap:10px"><span class="btn lg" style="justify-content:center">{ic("phone")}Call desk</span><span class="btn lg pri" style="justify-content:center">Order more</span></div>')
    return stage(ph, "05 · Live tracking", "Know exactly where it is.", "Status changes travel over the room-scoped WebSocket: PENDING → IN_PROGRESS → DELIVERED.",
                 ["Plain-language status, not codes", "Who accepted it and when", "Live indicator with auto-reconnect", "Delivered state prompts a quick rating"])


@reg("G06-guest-amenities", W, H)
def amenities():
    am = [("🛁", "Extra towels"), ("🧴", "Toiletries"), ("🛏️", "Extra pillow"), ("🧹", "Room cleaning"), ("🧊", "Ice bucket"), ("🔌", "Phone charger"), ("👔", "Iron & board"), ("🌙", "Do not disturb")]
    tiles = "".join(f'<div class="card center" style="padding:14px 8px;{"border:1.5px solid var(--brass);background:var(--brass-soft)" if i in (0, 2) else ""}"><div style="font-size:28px">{e}</div><div class="small b mt8">{n}</div></div>' for i, (e, n) in enumerate(am))
    ph = phone(f'''{head("Amenities", right=ROOM)}
<div class="muted small">Free of charge. Housekeeping usually responds within 15 minutes.</div>
<div class="grid g2" style="gap:10px">{tiles}</div>
<div class="field"><label>Anything else?</label><div class="input"><span class="ph small">e.g. hypoallergenic pillow</span></div></div>''',
               foot='<div class="btn lg gold block">Request 2 items</div>')
    return stage(ph, "06 · Amenities", "Ask for anything, no phone call.", "Amenity requests flow through the same order pipeline, at zero price, so staff see them on the same live board.",
                 ["Multi-select tiles", "Expected response time shown", "Free-text fallback"])


@reg("G07-guest-ai-concierge", W, H)
def concierge():
    ph = phone(f'''{head("Concierge", right='<span class="pill p-violet">AI</span>')}
<div class="note n-blue small">{ic("info")}<span>I answer from Azure Bay's official info and can draft requests, but you always confirm before anything is sent.</span></div>
<div style="align-self:flex-end;max-width:80%;background:var(--navy);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px" class="small">What's the Wi-Fi password, and can I get breakfast at 7?</div>
<div style="max-width:86%;background:#fff;border:1px solid var(--line);padding:12px 14px;border-radius:16px 16px 16px 4px" class="small">Wi-Fi: <b>AzureBay-Guest</b>, password <b class="mono">sunrise2026</b>.<br><br>Breakfast is served in-room from 06:30. Want me to draft a 7:00 order?<div class="tiny dim mt8">Source: Guest info · Wi-Fi &amp; Dining</div></div>
<div style="align-self:flex-end;max-width:80%;background:var(--navy);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px" class="small">Yes, continental for one, with coffee.</div>
<div class="card" style="padding:14px;border:1.5px dashed var(--brass);background:#FFFCF6"><div class="row between"><span class="up brass" style="color:var(--brass)">Draft request</span><span class="pill p-pending" style="font-size:11px">Not sent</span></div>
<div class="row mt8">{food("🥐", "#FBEBD2", 44, 10)}<div class="grow"><div class="b small">Continental breakfast + coffee</div><div class="tiny muted">Deliver at 07:00 · ₦9,000</div></div></div>
<div class="grid g2 mt12" style="gap:8px"><span class="btn sm" style="justify-content:center">Edit</span><span class="btn sm gold" style="justify-content:center">Confirm &amp; send</span></div></div>''',
               foot=f'<div class="row" style="background:#fff;border:1px solid var(--line2);border-radius:24px;padding:6px 6px 6px 16px"><span class="small dim grow">Ask anything about your stay…</span><span class="btn sm pri" style="border-radius:50%;width:34px;height:34px;padding:0;justify-content:center">{ic("send")}</span></div>')
    return stage(ph, "07 · AI concierge (Stage 2)", "Helpful, with guardrails.", "Answers come only from hotel-approved content, with the source cited. It can draft an order but never submit one without the guest's tap.",
                 ["Grounded answers with source", "Draft card clearly marked 'Not sent'", "Explicit confirm step, which defeats prompt injection", "Falls back to 'call the desk' when unsure"])


@reg("G08-guest-error-states", 1440, 960)
def errors():
    def st(emoji, bg, title, body, btn):
        return phone(f'''<div style="height:640px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;padding:0 10px">
<div style="width:110px;height:110px;border-radius:50%;background:{bg};display:grid;place-items:center;font-size:52px">{emoji}</div>
<h2 class="serif" style="font-size:26px">{title}</h2><p class="muted small">{body}</p></div>''', foot=btn)
    a = st("🔍", "#F1EDE6", "This code isn't valid", "The QR code may have been replaced. Please scan the code in your room, or call the front desk.", f'<div class="btn lg pri block">{ic("phone")}Call front desk</div>')
    b = st("🛎️", "#FCF0DA", "Ordering isn't available for this room", "This room has no active stay. If you've just checked in, the front desk can activate it in seconds.", f'<div class="btn lg pri block">{ic("phone")}Call front desk</div>')
    c = st("📶", "#E6EEFD", "You're offline", "Your order is saved on this phone and will be sent once you're back online. It won't be duplicated.", f'<div class="btn lg block">{ic("refresh")}Try again</div>')
    return f'''<div class="stage" style="flex-direction:column;gap:30px"><div class="row gap8" style="align-self:flex-start;margin-left:60px">{MARK}<div><h1 class="serif" style="font-size:30px">Guest edge states</h1><div class="muted">Invalid / regenerated token · No active stay or after check-out · Network loss</div></div></div>
<div class="row" style="gap:44px">{a}{b}{c}</div></div>'''
