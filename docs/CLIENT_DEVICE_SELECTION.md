# Client Device Selection (120-150 EUR)

Guidance for choosing Android phones to ship to clients together with the Movella DOT sensors.
Researched August 2026. Prices fluctuate; re-check before bulk purchase.

## 1. Requirements derived from the app

These come from the actual codebase, not generic "budget phone" advice.

| Requirement | Source | Implication |
|---|---|---|
| 1080p display | `MovementAnalysisCard.tsx`, chart rendering, `Avatar.tsx` | Joint-angle charts and ROM figures are read for clinical meaning. Reject 720p panels. |
| Step-counter hardware (nice to have) | `healthService.ts` uses `Pedometer` | Without it `isAvailableAsync()` fails and step tracking silently reports zeros. Not fatal, but the feature dies. |
| 5 simultaneous BLE connections | `BleConnectionScreen.tsx` requires DeviceTags 1-5 (right thigh, right shank, left thigh, left shank, pelvis) | Needs a modern, well-behaved BLE stack. This is the single hardest constraint. |
| BLE 5.0 with DLE2 preferred | Movella DOT BLE spec (compatible with 4.2, best performance on 5.0 + DLE2) | Bluetooth 5.2 or newer on the handset. |
| Android 8.0+ (API 26) | Movella DOT Android SDK minimum | Trivially met; all candidates ship Android 14/15. |
| Android 7.0+ (API 24) | Expo SDK 54 / React Native 0.81.5 | Trivially met. |
| On-device movement analysis | `analysisApi.ts` runs all kinematics locally since the external API was removed | CPU and RAM matter more than they would for a normal app. |
| 3D avatar rendering | `three@0.166` in `Avatar.tsx` | Needs a competent GPU; entry-level Unisoc chips struggle. |
| ZIP/CSV session parsing | `jszip`, `papaparse`, `expo-file-system` | 6 GB RAM recommended, microSD slot useful for session archives. |

**Practical floor:** Bluetooth 5.2+, 6 GB RAM (4 GB workable but tighter), a mid-tier
MediaTek Helio G-series / Dimensity or Exynos 1330 class chipset. Avoid entry-level
Unisoc-based handsets.

## 2. Recommended options

### Option A: Samsung Galaxy A16 5G  (best for a managed fleet)

- Price: ~146 EUR (4 GB/128 GB), ~165 EUR (6 GB/128 GB)
- Chipset: Exynos 1330 (some regions: Dimensity 6300)
- Bluetooth 5.3, 6.7" Super AMOLED 90 Hz, 5000 mAh, microSD
- **Six years of OS and security updates, through October 2030**

The update commitment is the deciding factor. For devices handed to clients and used in a
clinical-adjacent context, a fleet that stays patched until 2030 avoids a mid-project
hardware refresh. Samsung's BLE stack is also the most widely tested against Movella DOT.
Prefer the 6 GB variant if the extra ~20 EUR fits.

### Option B: Xiaomi Redmi Note 14 4G  (best performance per euro)

- Price: ~145-165 EUR (6 GB/128 GB)
- Chipset: MediaTek Helio G99 Ultra
- Bluetooth 5.3, 6.67" AMOLED 120 Hz, 5500 mAh, microSD

Fastest of the three for the local analysis pass, and 6 GB RAM is standard rather than an
upcharge. Trade-off is a shorter update window than Samsung and HyperOS aggressive
background-process killing, which needs checking against long BLE recording sessions.

### Option C: Motorola Moto G55 5G  (most RAM, if bought on offer)

- Price: 130-155 EUR on offer; 178-212 EUR at typical list
- Chipset: MediaTek Dimensity 7025, 8 GB RAM / 256 GB
- Bluetooth 5.3, 6.49" IPS 120 Hz, 5000 mAh, microSD

8 GB RAM and near-stock Android with light background restrictions, which suits long
foreground BLE sessions. Only worth it at the discounted price; at list it leaves the budget.

## 2b. eSIM support

Relevant because eSIM lets you provision data remotely instead of mailing SIM cards with
every device, and lets you cancel or re-provision a plan when a device comes back.

| Model | eSIM | Notes |
|---|---|---|
| Motorola Moto G55 5G | **Yes** | EU/global units support eSIM. Units originating from China, Hong Kong or Macao do not. |
| Samsung Galaxy A16 5G | **Disputed, verify per SKU** | Sources conflict. GSMArena lists "Nano-SIM + eSIM" as an available configuration; Samsung's EU support pages and EU community reports say eSIM does not work; Samsung's US page says it does. Samsung ships 9+ variants (SM-A166B, A166U, A166P, A166E, A166W...) and eSIM hardware plausibly differs between them. Do not assume either way. |
| Xiaomi Redmi Note 14 4G | **No** | Only the Note 14 Pro 5G and Pro+ 5G support eSIM. The 4G base model is physical SIM only. |

**If eSIM is a hard requirement**, the Moto G55 5G is the only unambiguous option in this
price band, and it should be bought on offer (130-155 EUR) rather than at list. Otherwise the
choice is to move up to roughly 200+ EUR for a Galaxy A26 or similar.

### How to settle eSIM support definitively

eSIM requires an eUICC chip in the handset. The carrier is not the variable: if the hardware
is present, any provider's profile (Vodafone included) will provision; if it is absent, no
provider can enable it in software. Vendor spec sheets and carrier compatibility lists
disagree often enough that they should not be trusted for a bulk purchase.

The decisive check, on a physical unit of the **exact SKU your supplier will ship**:

1. Dial `*#06#`.
2. If an **EID** is listed alongside the IMEI, the device has eSIM hardware.
3. No EID means no eSIM, conclusively.

Settings > About phone > Status shows the same field. Cross-reference against your national
Vodafone eSIM device list, then order.

### Which eSIM standard applies

The Moto G55, like every consumer smartphone, implements **GSMA SGP.22 (consumer eSIM)**.
The other two standards are not options here:

| Standard | For | Applies to this fleet |
|---|---|---|
| SGP.22 | Consumer devices (phones, tablets, wearables) | **Yes.** Pull-based provisioning, expects user interaction. |
| SGP.02 | Legacy M2M modules | No. Requires M2M eUICC hardware and carrier SM-SR integration. |
| SGP.32 | Headless IoT devices | No. Consumer handsets do not implement it. |

The practical consequence: with plain SGP.22, someone has to scan a QR code or enter an
activation code **on each handset** during setup. There is no headless bulk provisioning the
way there would be with an IoT eSIM.

**The exception worth knowing about:** on Android 15+, the Android Management API supports
remote eSIM provisioning on fully managed (device owner) devices. If the fleet is enrolled in
Android Enterprise via an MDM, profiles can be pushed, swapped and removed centrally without
touching the device. The device still has to enrol over WiFi first, then receives the eSIM
command. Confirm the shipped Android version before relying on this; the G55 launched on
Android 14 and needs the Android 15 update for AMAPI eSIM management.

### Which kind of plan

The app needs **data only**, no voice and no SMS. Since analysis runs on-device, the only
traffic is login, patient/exercise fetches and session upload, all small JSON payloads.
Expect very low monthly usage per device.

| Plan type | Fit |
|---|---|
| IoT / MVNO data-only eSIM | **Best fit.** Cheapest per device for low data volumes, and matches the traffic profile. |
| Business eSIM with a management portal | Good above ~10 devices. Bulk purchase, per-device usage caps, central billing, MDM integration. |
| Standard consumer carrier plan | Works, but you pay for voice and SMS the fleet will never use. |
| Travel / regional eSIM | Wrong tool. Built for short validity windows, not permanent deployment. |

Set a per-device data cap in the provider portal. It bounds the cost of a misbehaving device
and flags anomalies early.

### Does the fleet need cellular at all?

Worth settling before paying for eSIM. Since the movement analysis now runs entirely
on-device, the app only needs connectivity for backend calls: login, patient and exercise
data, and session upload. That traffic is small and not latency-critical.

- **WiFi-only** is viable if clients use the app at home or in a clinic with WiFi. Sessions
  are analysed locally and can be uploaded whenever the device reconnects. No SIM cost,
  no eSIM constraint, and the device choice stays open.
- **Cellular** is needed only if clients are expected to use it away from known WiFi, or if
  you want the fleet reachable for support and remote configuration regardless of location.

If WiFi-only is acceptable, the eSIM question is moot and the Section 5 recommendation stands.

## 3. Not recommended in this price band

| Model | Reason |
|---|---|
| Moto G35 5G, Moto G17 | Entry-level Unisoc/low-tier chipsets, 4 GB RAM. Risky for 5-stream BLE plus local analysis. |
| Xiaomi Redmi 15C 4G | See the detailed assessment in section 3b below. |
| Xiaomi Redmi 15C 5G, Redmi 17 | Entry tier, 4 GB base RAM, weaker GPU for the three.js avatar. |
| realme C100, realme P4 lite | Entry tier, limited update support, less predictable BLE stacks. |

## 3b. Detailed assessment: Xiaomi Redmi 15C 4G

Evaluated separately because it is the cheapest candidate (105-133 EUR) and therefore
tempting. Verdict: **not recommended for this app**, for reasons specific to what the app does.

Specs: Helio G81 Ultra (12 nm, 2x Cortex-A75 @2.0 GHz, Mali-G52 MC2), 4-8 GB LPDDR4X,
eMMC 5.1, 6.9" IPS 720x1600, 6000 mAh, IP64, Gorilla Glass 3, Bluetooth 5.4,
dedicated microSD slot, Android 15 / HyperOS 2.

### Blocking issues

1. **Display resolution: 720x1600 on a 6.9" panel (~254 ppi).** The app renders joint-angle
   charts, ROM figures and a 3D avatar that clinicians and patients read for clinical
   meaning. Every other candidate is 1080p AMOLED. This is the single strongest argument
   against the device.
2. **No gyroscope.** Sensors are fingerprint, accelerometer and compass only. Core movement
   analysis is unaffected because all motion data arrives from the DOT sensors over BLE, but
   `healthService.ts` uses `Pedometer`, whose `isAvailableAsync()` check will likely fail
   without step-counter hardware. Step tracking degrades to zeros rather than crashing, so
   the feature is effectively dead on this handset.
3. **GPU 86% slower than the Helio G99.** 3DMark 592 vs 1101; AnTuTu 41% behind. The
   three.js avatar in `Avatar.tsx` is precisely the workload this gap penalises.
4. **eMMC 5.1 rather than UFS.** Slower sequential and much slower random I/O, which affects
   ZIP session read/write.

### Genuine strengths

- **Bluetooth 5.4**, the newest of any candidate, which is a real positive for the
  5-sensor BLE requirement.
- **Dedicated microSD slot** rather than a hybrid tray, so storage expansion costs no SIM slot.
- **IP64 and Gorilla Glass 3**, meaningful for devices handled daily by clients.
- 6000 mAh battery.

### If chosen anyway

Take the **8 GB / 256 GB variant (~133 EUR)**, never a 4 GB configuration. Note that this
lands within ~15 EUR of the Redmi Note 14 4G, which offers a 1080p AMOLED display, a
substantially faster GPU and a gyroscope. The saving does not justify the compromise for a
clinical application.

## 4. Out of budget

| Model | Price | Note |
|---|---|---|
| Xiaomi Redmi Note 15 4G | ~199 EUR | Helio G100, 6000 mAh. Good, but over budget. |
| Samsung Galaxy A17 5G | ~229 EUR | Successor to the A16, same Exynos 1330. |

## 4b. Constraint: must be purchased from Vodafone Portugal

Devices must come from the Vodafone Portugal consumer store, which narrows the field to
their catalogue regardless of open-market pricing.

**Caveat on prices:** Vodafone's catalogue backend could not be read directly, so the
per-model prices below are unverified. Carrier pricing typically runs above open-market
pricing, so confirm each figure in the store before deciding. Model availability is
confirmed; prices are not.

### What Vodafone Portugal carries in the relevant range

| Model | Verdict |
|---|---|
| **Samsung Galaxy A16 4G** | **Recommended.** See below. |
| Samsung Galaxy A16 5G | Good. Same display and update policy; Exynos 1330 / Dimensity 6300. |
| Xiaomi Redmi Note 14 5G | Good on hardware. Dimensity 7025-Ultra, 6.67" AMOLED 1080p 120Hz, 2100 nits, Gorilla Glass 5, BT 5.4. Only 2 major OS upgrades. |
| Samsung Galaxy A17 4G / 5G | Fine, but newer and priced above the band. |
| Motorola G37 5G | **Rejected.** 720x1604 IPS (~264 ppi), 4 GB RAM in every configuration, and ~249 EUR list. Notable for having eSIM, plus gyro, BT 5.4, UFS 2.2, MIL-STD-810H, Gorilla Glass 7i, Android 16 and a dedicated microSD slot. If eSIM ever becomes mandatory, this is the Vodafone-available option, but the display disqualifies it for clinical readouts. A G37 Power variant adds 8 GB RAM and a 7000 mAh battery but shares the same 720p panel. Note the display is a regression from the 1080p G35 it replaces. |
| Motorola G35 5G, G05 4G | Entry tier. Not suitable, per section 3. |
| Xiaomi Redmi 15C 5G, 14C 4G, 13C, 12C, A3 | Entry tier. Not suitable, per sections 3 and 3b. |

Note that the Redmi Note 14 **4G** and the Moto G55 are **not** in Vodafone's catalogue;
only the Note 14 **5G** and the Moto G05/G35/Edge series are.

### Recommended under this constraint: Samsung Galaxy A16 4G

- **Mediatek Helio G99 (6 nm)**, 2x Cortex-A76 @2.2 GHz, Mali-G57 MC2. This is the same
  chipset class praised in the Redmi Note 14 4G, so the performance argument carries over.
- **6.7" Super AMOLED, 1080x2340, 385 ppi**, 90 Hz. Clears the display requirement.
- **Gyroscope present**, along with accelerometer, proximity and magnetometer.
- **Up to 6 major Android upgrades**, the longest support of anything in the band.
- 5000 mAh, IP54, microSD.

**Why the 4G variant specifically:** the app has no use for 5G. Since analysis runs
on-device, the only network traffic is login, patient/exercise fetches and session upload,
all small JSON payloads that are indifferent to 5G. Dropping the 5G modem should make this
the cheapest of the genuinely suitable handsets in Vodafone's catalogue. Paying a carrier
premium for a 5G radio this deployment never exercises is wasted budget.

Second choice if the A16 4G is unavailable or overpriced: **Redmi Note 14 5G** for stronger
raw hardware, accepting the shorter update window; or **Galaxy A16 5G** to keep the six-year
support horizon.

## 4c. Stock-agnostic screening rule

Named recommendations go out of stock. Use this to evaluate any handset against the app's
actual needs in about a minute, without waiting on a fresh round of research.

Look the model up on GSMArena and check these in order. **The first three are pass/fail.**

| # | Check | Threshold | Why |
|---|---|---|---|
| 1 | **Display resolution** | **1080p minimum. Reject 720p outright.** | Joint-angle charts, ROM figures and the 3D avatar are read for clinical meaning. This rejects the Redmi 15C, Moto G37, Moto G35 and most sub-150 EUR handsets. |
| 2 | **Chipset class** | Helio G99/G100, Dimensity 6300/7025, Exynos 1330 **or better**. Reject Helio G81/G85/G88 and Unisoc T-series. | Analysis runs on-device; the three.js avatar needs a Mali-G57 class GPU or better. |
| 3 | **Gyroscope in the sensor list** | Preferred, not mandatory | **Quality proxy, not a functional requirement.** Its absence signals a stripped entry-tier device. The app itself does not need it: all motion data arrives from the DOT sensors over BLE, and Android's step counter is accelerometer-based, so `healthService.ts` works without a gyro. |
| 4 | **RAM** | 6 GB preferred, 4 GB is the floor | three.js plus JSZip plus the analysis pass. Never buy 4 GB if a 6 GB SKU exists. |
| 5 | **Storage type** | UFS 2.2+ preferred, avoid eMMC 5.1 | ZIP session read/write speed. |
| 6 | **Bluetooth** | 5.2 or newer | Movella DOT performs best on BLE 5.0 with DLE2, across 5 concurrent connections. |
| 7 | **Update support** | 2+ years of OS updates remaining | Fleet stays patched without a hardware refresh. Samsung leads heavily here. |

**Fast heuristic:** in this price band, a 1080p AMOLED panel is the single strongest
predictor of overall suitability. Manufacturers that fit one rarely pair it with a bottom-tier
SoC. Filtering Vodafone's catalogue by "1080p or better" removes almost every unsuitable
device in one step.

**5G is not a requirement.** Analysis is on-device, so network traffic is only login,
patient/exercise fetches and session upload. Prefer the 4G variant of any model when it is
cheaper; the saving is real and nothing is lost.

## 4d. In-stock shortlist (evaluated August 2026)

Both models below were confirmed in stock at Vodafone Portugal and **both pass the section 4c
screening rule**. Earlier picks (Galaxy A16 4G/5G, Redmi Note 14 4G, Moto G55) were out of stock.

| | Samsung Galaxy A17 4G | Xiaomi Redmi Note 15 4G |
|---|---|---|
| Chipset | Helio G99 (6 nm), Mali-G57 MC2 | Helio G100 Ultra (6 nm), Mali-G57 MC2 |
| Display | 6.7" Super AMOLED, 1080x2340, 385 ppi, 90 Hz | 6.77" AMOLED, 1080x2392, 388 ppi, **120 Hz, 3200 nits** |
| RAM options | 4 / 6 / 8 GB (**4 GB variant exists**) | **6 or 8 GB only** |
| Storage | Not specified by GSMArena | **UFS 2.2** |
| Gyroscope | **Absent** | Present |
| Bluetooth | 5.3 | 5.3 |
| OS updates | **Up to 6 major** | Up to 4 major |
| Battery | 5000 mAh, 51:33h endurance | **6000 mAh, 55:02h endurance** |
| Durability | Gorilla Glass **Victus+**, IP54, drop Class B | Mohs 5, IP64, drop **Class A (270 falls)** |
| Open-market price | **~162 EUR** (4/128), ~219 EUR (8/256) | ~199 EUR (6/128), ~239 EUR (8/256) |

### Recommendation: Samsung Galaxy A17 4G, 6 GB or 8 GB variant

Six major OS updates against Xiaomi's four is decisive for a fleet supported over several
years, and it is roughly 37 EUR cheaper. Gorilla Glass Victus+ is a meaningful durability
upgrade for handsets used daily by patients.

**Do not buy the 4 GB A17 configuration.** It is the cheapest listing and will be the default
offer; insist on 6 GB or 8 GB.

### On the A17's missing gyroscope

Not a functional problem for this app, and a correction to earlier guidance in this document:

- Movement analysis never reads the phone's own sensors; all data arrives from the DOT
  sensors over BLE.
- Android's step counter (`TYPE_STEP_COUNTER`) is accelerometer-based, so the `Pedometer`
  usage in `healthService.ts` does not require a gyroscope.

It remains a cost-cutting signal, and rules out any future feature that would need phone
orientation, but it does not affect current functionality.

### When to prefer the Redmi Note 15 4G

Better hardware in isolation: a brighter 120 Hz panel, confirmed UFS 2.2 storage, a larger
battery and a superior drop rating. Choose it if on-screen chart legibility (including
outdoors) outweighs support longevity. If chosen, take the **8 GB** variant; owners report
the 6/128 configuration stutters.

### Budget note

Both exceed the original 120-150 EUR target at open-market prices, and carrier pricing
typically runs higher. Confirm Vodafone's actual figures before ordering.

## 4e. Below-budget candidates: Moto G05, Redmi A5, Galaxy A06

Evaluated when the budget was pushed below the 120-150 EUR band.
**Verdict: all three rejected. This tier is below the app's functional floor.**

| | Moto G05 | Redmi A5 | Galaxy A06 |
|---|---|---|---|
| Display | 720x1604 IPS, 264 ppi | 720x1640 IPS, 260 ppi, 450 nits | 720x1600 PLS LCD, 262 ppi |
| Chipset | Helio G81 Extreme (12 nm) | Unisoc T7250 (12 nm) | Helio G85 (12 nm) |
| CPU / GPU | 2x A75 @2.0, Mali-G52 MC2 | 2x A75 @1.8, Mali-G57 MP1 | 2x A75 @2.0, Mali-G52 MC2 |
| RAM | 4 GB only | up to 6 GB | 4 or 6 GB |
| Storage | — | eMMC 5.1 | eMMC 5.1 |
| Gyroscope | Absent | Absent | Absent |
| OS | Android 15 | **Android 15 Go edition** | Android 14, 2 major updates |
| Bluetooth | — | — | 5.3 |

All three fail screening checks 1 (1080p minimum) and 2 (chipset class). The Unisoc T7250 is
explicitly on the reject list; the Helio G81/G85 are the same 12 nm Cortex-A75 generation
already rejected in the Redmi 15C.

### Two findings that make this tier worse than the Redmi 15C

**1. Measured GPU performance (Galaxy A06).** GSMArena lab figures, like-for-like:

| Device | 3DMark Wild Life Extreme | AnTuTu v10 |
|---|---|---|
| Galaxy A06 (Helio G85) | **188** | 247,675 |
| Galaxy A16 5G (Dimensity 6300) | **360** | 435,895 |

Roughly half the GPU throughput of the device already treated as the practical floor. The
three.js avatar in `Avatar.tsx` is precisely the workload this penalises.

**2. Single-core GPU (Redmi A5).** The A5 uses a **Mali-G57 MP1** — one GPU core. The Galaxy
A07, A16 and A17 all use the Mali-G57 **MC2**, which is two. Roughly half the graphics
hardware, aimed directly at the three.js avatar. Its CPU is also the slowest of any candidate
reviewed: Cortex-A75 at 1.8 GHz against the A07's Cortex-A76 at 2.2 GHz, an older core design
at a lower clock, which slows the local kinematics pass.

Supporting issues on the A5: eMMC 5.1 rather than UFS 2.2, only 2 major OS updates,
Bluetooth 5.2 (lowest of the set, though it does clear the BLE 5.0 + DLE2 bar), no gyroscope,
450 nits typical brightness, and a 3 GB base variant.

**Note on Android Go (Redmi A5).** The A5 does ship Android 15 Go edition, but this was
overstated in an earlier revision of this document. Go edition primarily tightens *background*
execution limits, and BLE recording in this app runs in the foreground. Treat it as a signal
that the device is not built for demanding applications, not as the primary disqualifier. The
GPU and display are the actual failures.

**Evidence limitation.** GSMArena publishes no measured benchmarks for the Redmi A5, unlike
the Galaxy A06 (3DMark 188) and A07 (338). The A5 assessment rests on silicon specification
rather than lab figures.

### The decisive argument: dominated on price

| | Redmi A5 | Galaxy A07 4G |
|---|---|---|
| Price | 119.99 EUR (3/64), 130.49 EUR (4/128) | ~120 USD / ~109 GBP |
| Chipset | Unisoc T7250, 2x A75 @1.8 GHz | **Helio G99, 2x A76 @2.2 GHz** |
| GPU | Mali-G57 **MP1** | Mali-G57 **MC2** |
| Storage | eMMC 5.1 | **UFS 2.2** |
| OS updates | 2 | **6** |

At roughly the same price the A07 offers a materially better chipset, double the GPU cores,
faster storage and three times the support window. The A5 is not merely below the bar; it is
beaten outright by a same-price alternative.

### Why this is a false economy

At this tier the app does not degrade gracefully; it likely fails to complete a session. A
handset that cannot finish a recording is not cheaper hardware, it is a total loss, plus
support burden and clinical data never captured.

### If the budget genuinely cannot reach ~145 EUR (new units only)

Refurbished is excluded, so the options are:

1. **Samsung Galaxy A07 4G** — see section 4f. The only new sub-145 EUR handset found with
   adequate compute. Trade-off is the display alone.
2. **Buy fewer units and rotate them between patients.** Fewer working devices beat more
   non-working ones.

## 4f. The one viable sub-145 EUR new option: Samsung Galaxy A07 4G

Found while re-checking the gap between the A06 tier and the A16. It **breaks the pattern the
section 4c screening rule relies on**, and deserves separate treatment.

| Spec | Value | Screening check |
|---|---|---|
| Chipset | **Mediatek Helio G99 (6 nm)**, 2x Cortex-A76 @2.2 GHz, Mali-G57 MC2 | **Pass** — same silicon as the A16 4G and A17 4G |
| AnTuTu v10 | **394,421** | Pass |
| 3DMark Wild Life Extreme | **338** | Pass — compare A16 5G 360, Galaxy A06 188 |
| RAM | 4 / 6 / 8 GB | Pass at 6 or 8 GB |
| Storage | **UFS 2.2** | Pass |
| Bluetooth | 5.3 | Pass |
| OS support | Android 15, **up to 6 major OS updates** | Pass — best in class |
| Other | IP54, 5000 mAh (12:44h), dedicated microSD slot | — |
| **Display** | **720x1600 PLS LCD, 262 ppi, 90 Hz, 468 nits measured** | **Fail** |
| **Gyroscope** | **Absent** (fingerprint, accelerometer, proximity only) | Soft fail (see 4c note) |
| Price | ~120 USD / ~109 GBP (64 GB/4 GB); ~135 USD (128 GB/4 GB) | — |

### Correction to the screening heuristic

Section 4c states that "a 1080p panel is the single strongest predictor of overall
suitability" because manufacturers rarely pair a good panel with a bottom-tier SoC. **The A07
decouples these.** Samsung put a genuinely capable 6 nm Helio G99 behind a 720p LCD. So for
this device the display objection stands on its own rather than signalling a weak chipset, and
the heuristic must not be applied mechanically.

### The actual trade-off

Unlike the Moto G05 / Redmi A5 / Galaxy A06 tier, **compute is not the problem here**. The
local kinematics pass and the three.js avatar will perform at roughly Galaxy A16 5G level.
What is lost:

- **Resolution.** 262 ppi against 385 ppi on the A16/A17 Super AMOLED. Charts and ROM figures
  remain legible; fine detail and small-text crispness degrade.
- **Brightness.** 468 nits measured is dim. This is the more serious concern: outdoor or
  bright-clinic legibility will be noticeably worse than an AMOLED panel.
- **Gyroscope.** Absent, but per section 4c this does not affect app function.

Net: roughly 40-50 EUR saved per unit, paying for it purely in display quality.

### If choosing the A07 4G

1. Take the **6 GB or 8 GB variant**. Never 4 GB.
2. **Availability at Vodafone Portugal is unconfirmed.** Their catalogue backend could not be
   read; the A16 and A17 product pages were confirmed, the A07 was not. Verify before planning
   around it.
3. **Test chart legibility on one unit before bulk ordering.** Load a real session and have a
   clinician read the ROM figures and angle charts, indoors and near a window. The display is
   the entire risk here, so test exactly that.

## 5. Recommendation

## 5. Recommendation

Standardise on **one model** for the whole fleet so BLE behaviour, permission prompts and
support instructions are identical for every client.

**Current answer, given the Vodafone Portugal + in-stock constraints: the Galaxy A17 4G in
a 6 GB or 8 GB configuration. See section 4d.** The options below apply to open-market
purchasing without a stock constraint.

- Default choice: **Galaxy A16 5G, 6 GB variant**, for the 2030 support horizon.
- If per-unit cost is the binding constraint: **Redmi Note 14 4G 6 GB/128 GB**.
- If eSIM is required: **Moto G55 5G**, bought on offer. It is the only eSIM-capable
  handset in the band, and the 8 GB RAM is a genuine bonus for the local analysis.

## 6. Before committing to a bulk order

1. Buy one unit of the shortlisted model and verify all 5 DOT sensors connect and stream
   concurrently without dropouts across a full exercise session.
2. Time a complete local analysis run on-device and confirm it is acceptable.
3. Confirm battery drain over a realistic session with 5 sensors streaming.
4. Check that the OEM battery optimiser does not kill the app mid-recording. Xiaomi HyperOS
   and Motorola both need the app whitelisted; document this in the client setup guide.
5. Verify the required runtime permissions flow (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`,
   `ACCESS_FINE_LOCATION`) on the shipped Android version.

## Sources

- [Kimovil: best phones under 150 EUR, August 2026](https://www.kimovil.com/en/best-smartphones-under-150-euros)
- [Movella DOT BLE Service Specification](https://www.xsens.com/hubfs/Downloads/Manuals/Xsens%20DOT%20BLE%20Services%20Specifications.pdf)
- [Movella DOT SDK Programming Guide for Android](https://www.xsens.com/hubfs/Movella%20DOT%20SDK%20Programming%20Guide_Android.pdf)
- [GSMArena: Samsung Galaxy A16 5G](https://www.gsmarena.com/samsung_galaxy_a16_5g-13346.php)
- [Idealo ES: Galaxy A16 5G pricing](https://www.idealo.es/precios/204897321/samsung-galaxy-a16-5g.html)
- [GSMArena: A16 5G six years of software support](https://m.gsmarena.com/samsung_galaxy_a16_5g_announced_with_6_years_of_software_support_-news-64821.php)
- [GSMArena: Xiaomi Redmi Note 14 4G](https://m.gsmarena.com/xiaomi_redmi_note_14_4g-ampp-13616.php)
- [Kimovil: Redmi Note 14 4G pricing](https://www.kimovil.com/en/where-to-buy-xiaomi-redmi-note-14-4g)
- [Geizhals: Motorola Moto G55 5G](https://geizhals.de/motorola-moto-g55-5g-v174059.html)
- [Notebookcheck: Moto G55 5G specifications](https://www.notebookcheck.net/Motorola-Moto-G55-5G-debuts-as-new-mid-range-smartphone-packed-full-of-features-for-under-EUR250.881809.0.html)
- [Airalo: Motorola eSIM compatibility](https://www.airalo.com/blog/are-motorola-phones-esim-compatible)
- [Lenovo forums: eSIM on Moto G55 5G](https://forums.lenovo.com/t5/moto-g55-5G/How-many-eSIMs-can-be-uploaded-to-Moto-g55-5G/m-p/5390507)
- [Samsung EU Community: eSIM on A16 5G](https://eu.community.samsung.com/t5/galaxy-a-series/esim-on-an-a16-5g/td-p/11993284)
- [Vodafone UK: eSIM compatible devices list](https://www.vodafone.co.uk/sim-only/esim/esim-compatible-phones)
- [Xiaomi support: does the Redmi Note 14 support eSIM](https://www.mi.com/global/support/faq/details/KA-529703/)
- [Xiaomi support: Redmi 15C FAQ (no eSIM, no EID)](https://www.mi.com/global/support/faq/details/KA-597672/)
- [GSMArena: Xiaomi Redmi 15C 4G](https://www.gsmarena.com/xiaomi_redmi_15c_4g-14005.php)
- [Notebookcheck: Helio G99 vs Helio G81 Ultra](https://www.notebookcheck.net/Helio-G99-vs-Helio-G81-Ultra_14649_18631.247596.0.html)
- [Vodafone PT: Galaxy A16 4G](https://www.vodafone.pt/loja/telemoveis/samsung/galaxy-a16-4g.html)
- [Vodafone PT: Galaxy A16 5G](https://www.vodafone.pt/loja/telemoveis/samsung/galaxy-a16-5g.html)
- [Vodafone PT: Redmi Note 14 5G](https://www.vodafone.pt/loja/telemoveis/xiaomi/redmi-note-14-5g.html)
- [Vodafone PT: Motorola G37 5G](https://www.vodafone.pt/loja/telemoveis/motorola/g37-5g.html)
- [GSMArena: Motorola Moto G37](https://www.gsmarena.com/motorola_moto_g37-14646.php)
- [GSMArena: Samsung Galaxy A17 4G](https://www.gsmarena.com/samsung_galaxy_a17-14157.php)
- [GSMArena: Xiaomi Redmi Note 15 4G](https://www.gsmarena.com/xiaomi_redmi_note_15-14323.php)
- [GSMArena: Samsung Galaxy A06](https://www.gsmarena.com/samsung_galaxy_a06-13265.php)
- [GSMArena: Xiaomi Redmi A5](https://www.gsmarena.com/xiaomi_redmi_a5_4g-13737.php)
- [GSMArena: Motorola Moto G05](https://www.gsmarena.com/motorola_moto_g05-13573.php)
- [GSMArena: Samsung Galaxy A07 4G](https://www.gsmarena.com/samsung_galaxy_a07-14066.php)
- [GSMArena: Samsung Galaxy A16 4G review](https://www.gsmarena.com/samsung_galaxy_a16_4g-review-2770.php)
- [GSMArena: Xiaomi Redmi Note 14 5G](https://www.gsmarena.com/xiaomi_redmi_note_14_5g_(global)-13615.php)
- [Unite4buy: Helio G81 vs Helio G99 benchmarks](https://unite4buy.com/cpu/MediaTek-Helio-G81-vs-MediaTek-Helio-G99/)
- [Onomondo: SGP.02 vs SGP.22 vs SGP.32](https://onomondo.com/blog/sgp-02-vs-sgp-22-vs-sgp-32/)
- [Kigen: IoT eSIMs and consumer eSIMs explained](https://kigen.com/resources/blog/esims-explained-sgp-32-iot-esims-and-consumer-esims/)
- [Jason Bayton: is it possible to manage eSIM on Android Enterprise](https://bayton.org/android/android-enterprise-faq/manage-esim/)
- [Applivery: eSIM remote provisioning and management](https://www.applivery.com/esim-remote-provisioning-management/)
