# Principles in Practice {#principles}

The implementation follows a small set of practical rules.

## Preserve meaning

Content structure, durable locations, and attribution take priority over visual
simulation.

## Bound optional work

Optional renderers load separately. Long publications must not fetch or decode
every fixed page merely because the reader opened one location.

## Keep a fallback

The original viewer remains pinned and separate while the new approach is
tested. Replacing it is a later decision, not a side effect of building V2.
{#keep-a-fallback}

