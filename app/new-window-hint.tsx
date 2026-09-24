// One wording everywhere. Kept out of the index explicitly, because sr-only
// text is still text to Pagefind. [→ `pagefind-index-scope`]
export default function NewWindowHint() {
  return (
    <span className="sr-only" data-pagefind-ignore>
      {" "}
      (opens in a new window)
    </span>
  );
}
