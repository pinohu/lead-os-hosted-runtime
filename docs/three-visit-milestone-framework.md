# LeadOS Three-Visit Milestone Framework

LeadOS should optimize for the third meaningful interaction, not just the first conversion event.

The practical implication is simple:

- first touch creates identity
- second touch creates trust
- third touch creates momentum

This document turns that principle into an operating model for LeadOS.

## Core Rule

Every funnel should be designed to move a person through three milestone events instead of treating the first opt-in or sale as the whole job.

## Lead Milestones

### Lead Milestone 1: Captured

The visitor becomes a known lead.

Examples:

- form submitted
- chat identity captured
- webinar registration
- checklist opt-in

LeadOS goal:

- assign identity
- log the source and funnel
- deliver immediate value

### Lead Milestone 2: Return Engagement

The lead comes back or takes a second meaningful action that proves interest.

Examples:

- revisits the funnel
- opens a replay
- responds in chat
- consumes the promised asset
- clicks the second-step CTA

LeadOS goal:

- create a second trust event
- shift from cold capture to active intent

### Lead Milestone 3: Booked or Offered

The lead reaches the third meaningful action where a real commitment is in motion.

Examples:

- books a consult
- starts checkout
- requests a proposal
- completes an application

LeadOS goal:

- turn interest into a reliable conversion pattern

## Customer Milestones

### Customer Milestone 1: Onboarded

The customer receives welcome, access, and a clear next step.

### Customer Milestone 2: Activated

The customer completes a meaningful setup or usage milestone.

### Customer Milestone 3: Value Realized

The customer experiences a result strong enough to support retention, renewal, referral, or upsell.

## Funnel Implications

Each funnel family should explicitly answer:

1. What creates milestone one?
2. What creates milestone two?
3. What creates milestone three?

### Lead Magnet

- M1: opt-in
- M2: asset consumed or second click
- M3: consult or offer engagement

### Qualification

- M1: assessment started/completed
- M2: personalized follow-up engagement
- M3: booking or proposal

### Webinar

- M1: registration
- M2: attendance or replay watch
- M3: pitch click, booking, or checkout

### Retention

- M1: onboarding
- M2: activation
- M3: value realized

## Event Model

LeadOS should emit milestone events whenever a milestone is reached:

- `lead_milestone_reached`
- `customer_milestone_reached`

Each event should include:

- `milestoneId`
- `visitCount`
- `stage`
- trace metadata

## Reporting Questions

The dashboard should be able to answer:

- how many leads reach milestone 2?
- how many leads reach milestone 3?
- which funnel families create the strongest second return?
- which channels are best at moving people from milestone 1 to 2?
- which onboarding sequences produce milestone 3 for customers?

## Automation Implications

LeadOS recipes should be written to force the second and third event:

- after milestone 1:
  - trigger the easiest possible second win
- after milestone 2:
  - trigger the most natural third commitment
- after milestone 3:
  - branch into onboarding, retention, referral, or continuity

## Strategic Outcome

This framework shifts LeadOS from:

- lead capture software

to:

- repeat-behavior engineering software
