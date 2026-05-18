# 🦅 BillKaw (Split Bills, Not Friendships)
Chin Ee Sheng     APU Bachelor Of Science (Honours) In Computer Science (Cyber Security )
> Shortcut Asia Internship Challenge 2026 submission

BillKaw is a sleek, animated bill-splitting web app built for the Malaysian context. It handles everything from equal splits to custom Malaysian taxes (SST + service charge), tracks who paid for what, visualises the split, and can email each person their personalised bill breakdown — all in one smooth, polished experience.

---

## Features

| Feature | Description |
|---|---|
| **3 split modes** | Split equally, select specific people, or enter custom RM amounts per person |
| **"Paid by" tracking** | Track who physically paid for each item — not just who owes what |
| **SST & service charge** | Toggle 6% SST and 10% service charge — distributed proportionally |
| **Custom charges** | Add delivery fees, rounding, etc. — split equally or assign to payer |
| **Settle-up algorithm** | Greedy min-transfers algorithm to clear all debts with fewest transactions |
| **Visual split bar** | Animated percentage bar showing each person's share at a glance |
| **📧 Email bills** | Send each person their personalised bill breakdown via mailto |
| **📋 Copy summary** | One-tap copy of the full settle-up summary for WhatsApp/Telegram |
| **Toast notifications** | Smooth animated feedback for every action |
| **Animated transitions** | Fluid tab switching with CSS transitions — no jarring page jumps |
| **Progress indicator** | Visual step tracker so you always know where you are |
| **Dark mode design** | Rich dark UI with orange accent — easy on the eyes at late-night mamak sessions |

---

Tech Stack

| Layer | Choice | Why |
|---|---|---
| Framework | React 18 | Component-based architecture, fast state updates |
| Build tool | Vite 5 | Sub-second HMR, minimal config, fast production builds |
| Styling | Plain CSS + CSS variables | Zero runtime cost, full control, no extra dependencies |
| Fonts | Syne + DM Sans (Google Fonts) | Distinctive display font + readable body font |
| Deployment | Vercel | Zero-config deployment for Vite/React projects |
| Language | JavaScript (JSX) | Fast to iterate; no type ceremony for a 1-week build |

---

## ## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Run locally

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/billkaw.git
cd billkaw

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open in browser
# → http://localhost:5173
```

### Build for production

```bash
npm run build
npm run preview  # preview the production build locally
```

### Deploy to Vercel (recommended)

```bash
# Option A — Vercel CLI
npm i -g vercel
vercel

# Option B — GitHub integration
# Push to GitHub → connect repo at vercel.com → auto-deploys on every push
```

---

##  How to Use

1. **Setup** — Name your bill and add everyone who's splitting it (optionally add their email for direct bill delivery)
2. **Items** — Add each item, select who paid for it physically, and choose how to split the cost:
   - *Everyone equally* — divides among all people
   - *Pick people* — select exactly who shares this item
   - *Custom RM* — type exactly how much each person pays
3. **Charges** — Toggle SST (6%) and/or service charge (10%). Add custom charges like delivery or rounding
4. **Results** — See the visual split bar, each person's itemised total, and the minimum settle-up transfers. Email bills or copy a summary for group chat.

---

## Project Structure

```
billkaw/
├── index.html              # Entry HTML — loads Google Fonts + React root
├── vite.config.js          # Vite config
├── package.json
└── src/
    ├── main.jsx            # React root mount
    ├── App.jsx             # All app logic & components
    └── App.css             # All styles with CSS variables + animations
```

---

##  Key Technical Decisions

### Why all in one file?
For a 1-week build, keeping all components in `App.jsx` meant faster iteration — no import juggling. The component boundaries (TabSetup, TabItems, TabCharges, TabResults, EmailModal) are clean and could be split into separate files trivially.

### Animated tab transitions
Instead of instant tab swaps, BillKaw uses a custom `useAnimatedMount` hook that manages mount/unmount with a 350ms CSS transition delay. This creates smooth fade+slide transitions between tabs without any animation library.

### Tax distribution logic
Taxes are distributed **proportionally** — if you ordered 70% of the food, you pay 70% of the SST. This is mathematically fairer than equal distribution when people order very different amounts.

### Settle-up algorithm
Uses a **greedy min-transfers algorithm**: sort creditors and debtors by absolute balance, then repeatedly match the largest creditor with the largest debtor, transferring `min(creditor_balance, debtor_balance)`. This minimises the number of transactions to zero all debts.

### Email bills via mailto
The app builds a personalised `mailto:` URI for each person including their specific item breakdown, their total, and only the settle-up rows that involve them. No server needed — it opens the user's email client directly.

### Visual split bar
An animated flex-based bar where each segment's `width` is a percentage of the grand total. CSS `transition: width 0.6s cubic-bezier(...)` gives the spring animation when values change.

---

## Design Decisions

- **Dark theme with orange accent** (`#FF6B35`) — warm, energetic, stands out in a sea of green/blue fintech apps
- **Syne font** for headings — geometric, bold, memorable; paired with DM Sans for body copy
- **Toast notifications** — every action gets immediate animated feedback (success/error/info)
- **Bottom navigation** — fixed Next/Back buttons so you never have to scroll to progress
- **Progress indicator** — step dots at the top so users always know where they are in the flow

---

## Flowcharts

### Main user flow
```
[Setup] → Add bill name + members (with optional emails)
    ↓
[Items] → Add items, select payer, choose split mode
    ↓
[Charges] → Toggle SST/service charge, add custom fees
    ↓
[Results] → View split bar + owe breakdown + settle-up
         → Email individual bills OR copy summary
```

### Settle-up algorithm
```
For each member: calculate (amount they owe) - (grand total / num members)
  → Positive balance = creditor (paid more than their share)
  → Negative balance = debtor (paid less than their share)

Sort creditors descending, debtors ascending
While creditors and debtors remain:
  amt = min(creditor.remaining, debtor.remaining)
  Record transfer: debtor → creditor for amt
  Reduce both remainders; advance pointer if exhausted
```

---

## Architecture Overview

```
React (Vite) SPA
└── App (state: tab, billName, members, items, charges, toasts)
    ├── Toast (notification system)
    ├── ProgressBar (step indicator)
    ├── TabBar (navigation)
    ├── AnimatedTab wrapper (fade/slide transitions)
    │   ├── TabSetup    → manages members state
    │   ├── TabItems    → manages items state
    │   ├── TabCharges  → manages charges state
    │   └── TabResults  → reads all state, computes results
    │       ├── SplitBar (visual percentage bar)
    │       └── EmailModal (mailto bill delivery)
    └── BottomNav (fixed Next/Back)
```

All state lives at the root `App` level and is passed down as props. No global state library needed — the app is simple enough that prop drilling is clean and traceable.

---

## Challenges & How I Solved Them

**Challenge 1: Smooth tab transitions without a library**  
React's conditional rendering (`{tab === "setup" && <TabSetup />}`) unmounts components instantly. I wrote a `useAnimatedMount` hook that delays unmounting by 350ms, giving CSS time to play the exit animation before the element disappears.

**Challenge 2: Proportional tax distribution**  
Distributing taxes equally is wrong if people ordered different amounts. The fix: each person's tax share = `(their subtotal / total subtotal) × tax amount`. This required knowing each person's pre-tax total before adding taxes.

**Challenge 3: Email formatting without a backend**  
To send personalised emails without a server, I build a `mailto:` URI with the bill breakdown in the body. The text is URL-encoded and opens the user's email client. Limitation: long emails may be truncated by some clients, but for bill summaries this works reliably.

**Challenge 4: Custom split validation**  
When using custom RM amounts, the amounts must sum exactly to the item price. Floating point arithmetic makes direct equality unreliable — solved with a `Math.abs(total - price) > 0.01` tolerance check.

---

## Author

**[Chin Ee Sheng]**  
APU — [APU Bachelor Of Science (Honours) In Computer Science (Cyber Security]
Built for Shortcut Asia Internship Challenge 2026

---

*BillKaw — because splitting the bill shouldn't split the friendship.*
