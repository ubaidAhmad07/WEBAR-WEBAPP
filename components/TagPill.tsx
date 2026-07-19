const SAGE_TAGS = new Set(["Halal", "Vegan", "Vegetarian", "Gluten-free"]);
const PEACH_TAGS = new Set(["Spicy", "Hot"]);

export default function TagPill({
  tag,
  size = "sm",
}: {
  tag: string;
  size?: "sm" | "md";
}) {
  const sizing =
    size === "sm"
      ? "px-2.5 py-0.5 text-[10px]"
      : "px-2.5 py-[3px] text-[10.5px]";
  let colors = "border border-line-strong text-muted";
  if (SAGE_TAGS.has(tag)) colors = "bg-sage-pale text-sage-ink";
  else if (PEACH_TAGS.has(tag)) colors = "bg-peach-pale text-rust-deep";
  return (
    <span className={`rounded-full font-sans font-semibold ${sizing} ${colors}`}>
      {tag}
    </span>
  );
}
