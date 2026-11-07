/** The intro's signal, crossing the top edge of a section when it first comes into view. */
export default function Signal() {
  return (
    <div className="signal" aria-hidden="true" data-signal>
      <span className="signal-head" />
    </div>
  );
}
