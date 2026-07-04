# Niramoy — Agent Context File

> Read this file before working on any part of the Niramoy codebase.
> This file describes what the product is, who uses it, and what every
> feature does. It does not cover technical implementation.

---

## What is Niramoy?

Niramoy (নিরাময়) is a web-based platform that shows real-time ICU, NICU,
CCU, and HDU bed availability across hospitals in Bangladesh. The name means
"cure" or "recovery" in Bengali.

The core problem it solves: during a medical emergency in Bangladesh, families
have no way to know which hospitals have available critical care beds without
calling each one individually. Niramoy aggregates this information in one place
so that a person in crisis can find an available bed in minutes instead of hours.

The platform does not connect to hospital databases directly. Hospitals
self-report their own bed counts through a portal. The data is only as accurate
as the hospital staff who update it. This is the realistic model — no hospital
in Bangladesh exposes its internal systems to third parties.

---

## Who Uses It

### Public Users (Patients and Families)
Anyone in Bangladesh looking for a critical care bed. They do not need an
account. They are often in an emergency situation. Speed and clarity matter
more than anything else for this group. They should be able to find a hospital,
see available beds, and make a call within 60 seconds of landing on the site.

### Hospital Admins
Staff members at registered hospitals who are responsible for keeping their
hospital's bed counts, pricing, and contact information up to date. Each
hospital admin can only see and edit their own hospital's data. They log in
through the same login page as system admins but are routed to a different
dashboard.

### System Admins
The team that runs the Niramoy platform itself. They approve new hospital
registrations, manage user accounts, moderate data updates, and monitor
platform health. They have access to all hospitals and all data.

---

## The Four Bed Types

Every feature in the platform revolves around these four bed types:

- **ICU** — Intensive Care Unit. For critically ill patients requiring constant
  monitoring and life support.
- **NICU** — Neonatal Intensive Care Unit. For newborns who are premature or
  critically ill.
- **CCU** — Coronary Care Unit. For patients with serious heart conditions.
- **HDU** — High Dependency Unit. Step-down from ICU; for patients who need
  more monitoring than a general ward but less than full ICU.

A hospital may offer any combination of these. A hospital that offers ICU but
not NICU will show N/A for NICU across the platform.

---

## Availability Color System

Every bed count display across the entire platform uses the same three-color
system. Agents must never deviate from this:

- **Green** — More than 50% of beds are available. Safe to contact.
- **Orange** — Between 10% and 50% of beds are available. Limited.
- **Red** — Less than 10% available, or zero beds available. Critical or full.
- **Grey** — The hospital has not updated their count in more than 24 hours.
  Data may be stale.

---

## Pages and Features

---

### Homepage — The Map

The homepage IS the map. There is no separate landing page. When a user opens
Niramoy, they immediately see an interactive map of Bangladesh with all
hospitals plotted as color-coded markers. This decision was made deliberately
— users in emergencies should not have to navigate past marketing content to
reach the tool they need.

The map shows the entire country by default. If the user grants location
permission, the map zooms to their city and highlights nearby hospitals.

Every hospital on the map is a custom pin marker colored by the availability
system described above. Clicking a marker opens a popup showing the hospital's
name, bed counts for all four types, cost per day, phone number, last updated
time, and buttons to view the full detail page or get directions.

The map has two view modes:
- **Marker mode** — individual colored pins per hospital, clustered in dense
  areas like Dhaka to avoid clutter.
- **Heatmap mode** — the map switches to district-level polygons colored
  green to red based on the aggregate ICU availability ratio across all
  hospitals in that district. This gives a bird's-eye view of where shortages
  are concentrated nationally.

---

### Left Panel — Filters and Results

A panel sits alongside the map (collapses to a bottom drawer on mobile) with
two purposes: filtering the map and listing matching hospitals.

**Live Stats Bar** at the top of the panel shows four numbers that update
automatically: total hospitals on the platform, ICU beds currently available,
NICU beds currently available, and the last updated timestamp.

**Filter controls** let users narrow results by:
- Bed type — ICU, NICU, CCU, HDU (can select multiple)
- Division and district (cascading — selecting a division filters the district
  dropdown)
- Availability — toggle to show only hospitals with at least one available bed
- Cost per day — a range slider in BDT
- Search radius — used when Find Nearest is active: 5 km, 10 km, 25 km, or
  Nationwide

**Find Nearest button** requests the user's GPS location and re-sorts all
results by distance from the user. Each hospital card then shows the distance
in kilometres. If the user denies location permission, the search falls back
to manual district selection.

**Results list** shows all hospitals matching the current filters as cards.
Each card shows the hospital name, district, all four bed counts color-coded,
cost range, star rating, distance (if geolocation is active), last updated
time, a call button, and a view details button. Hovering a card highlights its
corresponding marker on the map. Clicking a card pans the map to that marker.

---

### Hospital Detail Page

A full page for a single hospital. This is where a user goes after finding a
promising hospital in the search results to confirm details before calling.

The page shows:
- Hospital name, district, and whether it is verified by the platform
- Four live bed count cards — one per bed type — each showing available beds,
  total capacity, a progress bar, cost per day, and how recently the count
  was updated. These update in real time without requiring a page refresh.
- Full address and an interactive map showing the hospital's exact location
- Emergency phone number and general phone number
- Whether the hospital operates 24 hours
- Which of the four bed types the hospital offers
- A description of the hospital
- A 7-day availability trend chart showing how bed counts have changed over
  the past week for each bed type. This helps users judge how reliable the
  hospital's updates are.
- Patient and family reviews with star ratings
- A row of related hospitals nearby with available beds

---

### Hospital Comparison Page

Users can select up to four hospitals (using checkboxes on result cards) and
compare them side by side. A sticky bar at the bottom of the search results
page appears when two or more hospitals are selected, with a Compare Now
button.

The comparison table has one column per selected hospital and rows for every
data point: available beds per type, cost per day per type, star rating,
distance from the user, emergency phone, last updated time, and verification
status. The best value in each row is highlighted in green so the user can
identify the best option at a glance.

---

### Ambulance Directory

A separate page listing ambulance services across Bangladesh organized by
district. This page requires no login and is accessible from the emergency
strip at the bottom of every page.

At the top, the national emergency number (999) and the DGHS hotline (16401)
are always pinned regardless of any filter. Below that, ambulance service
cards show the service name, organization, district, a large tap-to-call
phone number, whether it operates 24 hours, and whether it is government,
private, or NGO.

---

### Hospital Admin Portal

After login, a verified hospital admin is taken to their dashboard. They
cannot see any other hospital's data.

**Dashboard** shows the current bed counts for their hospital as four
metric cards. If the counts have not been updated in more than 6 hours, a
yellow warning banner prompts them to update. There is a quick update widget
on the dashboard that lets them change counts without navigating away. A
preview card shows exactly how their hospital appears in public search
results.

**Update Bed Counts** is the most important page in the admin portal.
The admin enters the current available count for each bed type. The form
shows the current value alongside the input and prevents entering a number
higher than the total capacity. Before submitting, a change summary shows
exactly what is changing (for example, ICU: 5 → 3, NICU: no change). There
is an optional note field for explaining the reason for a change. Every
submission is logged to the audit trail with a timestamp.

**Update Pricing** lets the admin set the cost per day in BDT for each bed
type. Previous prices are shown alongside the inputs.

**Update Profile** lets the admin update the hospital's address, phone
numbers, description, and photo. It also includes a draggable map pin the
admin can move to correct the hospital's location if it was geocoded
inaccurately. The hospital name cannot be changed from this page — name
changes must go through the system admin.

**Update History** is a full audit log of every change the hospital has
made. It can be filtered by date range and update type, and exported as a
CSV. Each row shows what changed, from what value to what value, who made
the change, when, and any note they left.

---

### System Admin Dashboard

**Overview** is the first screen after system admin login. It shows
platform-wide metrics: total hospitals, how many are verified, how many
are pending approval, total ICU beds across all hospitals, current
availability rate, how many hospital admins are active, how many hospitals
have not updated in over 24 hours, and total reviews. It also shows a live
list of hospital registrations waiting for approval and a list of hospitals
with stale data.

**Manage Hospitals** is a searchable, filterable table of every hospital on
the platform. The system admin can verify or unverify a hospital, suspend a
hospital (which hides it from public search and disables the admin's login),
edit any hospital's profile directly, or delete a hospital. They can also
add new hospitals directly without going through the registration flow, which
is used to seed the platform with publicly available hospital data.

**Manage Users** is a table of all user accounts across all roles. The
system admin can suspend or reactivate accounts, reset passwords, view which
hospital a hospital admin is linked to, and create new system admin accounts.

**Review Updates** is the moderation queue. When a hospital submits a
significant update (configured by the system admin), it enters this queue
instead of going live immediately. The system admin can approve it (goes
live instantly) or reject it with a reason. The rejection reason appears in
the hospital's own update history so they know why it was declined.

**Reports** provides five pre-built reports:
- District-wise ICU availability summary as a table and bar chart
- Division-level bed occupancy as an embedded heatmap
- Hospital update frequency — which hospitals update regularly versus rarely
- Bed availability trend over a custom date range
- Review volume ranked by hospital

All reports can be filtered by date range, division, district, and bed type,
and exported as PDF or CSV.

**Reference Data** is where the system admin manages the underlying data
that the rest of the platform depends on: the list of all 64 districts and
8 divisions, the definitions of the four bed types, and the ambulance
directory entries.

---

## Real-Time Behavior

When a hospital admin saves a bed count update, the change appears on the
public map and search results instantly for all users who are currently
viewing the site — without any of them needing to refresh. A small
notification toast appears on the public side briefly noting which hospital
just updated. The updated marker on the map flashes briefly to draw
attention to the change.

This real-time behavior applies to:
- Map marker colors
- Bed count cards on the hospital detail page
- Bed count numbers in the search results list
- The live stats bar in the left panel

---

## Data Honesty Rules

These rules exist throughout the product and agents must respect them:

- Every bed count display must show the last updated timestamp alongside
  the count. Never show a number without a timestamp.
- Counts not updated in over 24 hours must be shown with a grey stale
  indicator, not a green/orange/red badge.
- A disclaimer must appear on every public-facing page: "Bed counts are
  self-reported by hospital staff. Always call to confirm before traveling."
- The platform never claims its data is live in the sense of being directly
  connected to hospital systems. It is only as current as the last manual
  update from hospital staff.

---

## Emergency Accessibility Rules

Because this platform is used by people in medical emergencies, the following
are non-negotiable across every public page:

- Phone numbers must always be tappable on mobile (tap to call).
- The national emergency number (999) and DGHS hotline (16401) must be
  visible on every public page via the fixed emergency strip at the bottom.
- The path from landing on the site to seeing available beds must never
  require more than two interactions.
- No login should ever be required to search or view bed availability.
- If the user's location is unavailable, the search must fall back gracefully
  to manual district entry — never show an error and stop.
- The site must be usable on a low-end Android phone on a 4G connection.

---

## Language

The platform supports two languages: English (default) and Bengali (বাংলা).
The language toggle is in the navbar on all public pages. All public-facing
content — search results, hospital names, bed counts, error messages, the
emergency strip — must be available in both languages. The admin portals are
English only in the current version.

---

## What the Platform is NOT

- It is not connected to any hospital's internal patient management system.
- It does not show which specific beds are occupied or by whom.
- It does not handle bookings, reservations, or payments.
- It does not dispatch ambulances.
- It does not provide medical advice.
- It is not an official government system, though it uses publicly available
  government data (DGHS hospital listings) to seed the hospital directory.

---

## Verification and Trust

A hospital goes through the following states on the platform:

1. **Pending** — Registration submitted, not yet reviewed by system admin.
   The hospital does not appear in public search.
2. **Verified** — System admin has confirmed the hospital is real and the
   contact details are accurate. A green verified badge (✓ Verified) appears
   on all public displays of this hospital. The hospital admin can log in and
   update data.
3. **Suspended** — System admin has suspended the account due to inactivity,
   inaccurate data, or non-compliance. The hospital is hidden from public
   search and the admin cannot log in.

Users can see the verified badge on hospital cards and detail pages. Unverified
hospitals do not appear in public search results at any point.
