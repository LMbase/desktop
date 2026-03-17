const copilotImageUrl = new URL('./github-copilot.jpg', import.meta.url).href;

export function CopilotIcon() {
  return (
    <img
      className="provider-icon-image"
      src={copilotImageUrl}
      alt=""
      aria-hidden="true"
    />
  );
}
