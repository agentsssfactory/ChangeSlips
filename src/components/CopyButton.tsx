"use client";

export function CopyButton({
  text,
  label = "Copy link",
}: {
  text: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          const btn = document.activeElement as HTMLButtonElement;
          if (btn) {
            const old = btn.textContent;
            btn.textContent = "Copied";
            setTimeout(() => {
              btn.textContent = old;
            }, 1500);
          }
        });
      }}
    >
      {label}
    </button>
  );
}
