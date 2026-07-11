Small circular progress indicator in each day column's header, showing task completion.

```jsx
<ProgressRing pct={60} />
```

The reference prototype rendered a static ring (border top-color accent); this
component drives the same visual with a conic-gradient so it can reflect real progress.
