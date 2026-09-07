// Nothing to render when the modal slot is inactive — including on a hard
// navigation / refresh, where Next can't recover the slot and falls back here
// (the real /changes/[id] page renders as the full page instead). Next 16
// requires an explicit default for a named slot.
export default function Default() {
  return null;
}
