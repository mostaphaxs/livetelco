/** Splits a headline into words that can rise out of their own clipped line (.h-words, globals.css). */
export default function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i, a) => (
        <span key={i} className="w">
          <span>{w}{i < a.length - 1 ? " " : ""}</span>
        </span>
      ))}
    </>
  );
}
