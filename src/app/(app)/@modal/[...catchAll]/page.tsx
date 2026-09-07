// Soft-navigating to any route the modal slot doesn't match (e.g. clicking a
// sidebar link while the modal is open) resolves here → renders nothing, so the
// modal unmounts instead of staying stuck. See Next parallel-routes docs.
export default function CatchAll() {
  return null;
}
