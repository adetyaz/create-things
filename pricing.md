# Pricing and the path to $1M

Written 2 Nov 2026 from a discussion; numbers are estimates to check before launch (Phase 11 item 84). Credit costs and the free quota live in [Project Breakdown.md](Project%20Breakdown.md) "Monetisation".

## The rule: free to use, credits only for AI

- **Always free:** saving (every way), undo, references, Recent saves, reviews, reshuffling plans, fit-it-in moves, the shutdown ranking, deleting memories, imports
- **Credits:** only AI calls, after the free daily quota. Running out never blocks anything: a save still happens, and its analysis waits until the free quota refreshes
- **Open question:** should *only* item analysis need credits, with roadmaps, chat, pick for me and the rest always free? Doable, but those calls are then paid by us; Workers AI's free daily allowance covers a lot early on

## The target price

About **$1.50 / ₦1,500 / £1 a month**, by country.

| Price | Per payer per year | Payers for $1M a year |
| --- | --- | --- |
| $1.50 a month | $18 | ~56,000 |
| Prices by country (average ~$1.20) | ~$14 | ~70,000 |
| $1.50 once | $1.50 | ~670,000 purchases |

## What eats into it

**Fees on small payments.** Stripe is 2.9% + $0.30, about **23% of a $1.50 payment**.

| Route | Fee on a small payment | Use it for |
| --- | --- | --- |
| Yearly billing ($15/year by card) | ~5% | Default: nudge monthly payers to yearly |
| Paystack (Nigeria) | ~1.5%; the ₦100 fixed fee is waived under ₦2,500 | Naira prices |
| USDC on Sui | Close to nothing (gasless stablecoin transfers) | Anyone with a wallet or zkLogin (hackathon H12–H13) |
| App stores | 15% (small business rate) | Only if the app goes into the stores |

**How many people pay.** Apps with a free tier usually convert 2–5% of active users. 56,000 payers means about **1.1M–2.8M active free users**: the free tier has to be good, and cheap for us to run (the cost rules in the Breakdown).

## Ways to need fewer users

1. **Price by country, not one price everywhere:** about $3 in the US and UK, ₦1,500 in Nigeria, £1-ish where it fits. One low price everywhere halves what the richest markets pay
2. **The pet store:** limited-edition accessories and pets, cosmetic only, never progress (design principle 15). A few big spenders often outearn subscriptions
3. **Credit packs** for heavy AI use, on top of the subscription
4. **Group seats:** bootcamps, schools and course creators (course import already works) buying 50–500 seats
5. **Lifetime option** ($30–40) for early fans: money up front

## A mix that reaches $1M a year

| Source | Count | Average | Per year |
| --- | --- | --- | --- |
| Subscribers | 35,000 | ~$14/year | ~$490k |
| Store buyers | 15,000 | ~$15/year | ~$225k |
| Group seats | 150 groups × 100 seats | ~$12/seat | ~$180k |
| Credit packs and lifetime | | | ~$100k+ |

## What decides it

- **People coming back:** the pet, plans that bend instead of break, reviews. At $1.50 people cancel quietly unless the app keeps pulling them back
- **A cheap free tier:** few AI calls, free quota first, cached results (Breakdown cost rules)

## To check before launch

- [ ] Real AI cost per active user per month (measured, Phase 11 item 84)
- [ ] Stripe, Paystack and other local providers' current fees per country
- [ ] Whether gasless USDC transfers on Sui cover our payment flow on mainnet (Breakdown §14)
- [ ] Country price list (purchasing power, competitors' local prices)
- [ ] Free-to-paid conversion once real users exist
- [ ] Decide the open question above (only analysis needs credits, or all AI)
