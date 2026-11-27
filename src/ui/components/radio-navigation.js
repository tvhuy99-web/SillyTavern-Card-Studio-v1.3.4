export function createRadioNavigation(dependencies = {}) {
function handleRadioKeyDown(event) {
  if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;
  let group = event.currentTarget.closest('[role="radiogroup"]');
  let enabledRadios = group ? [...group.querySelectorAll('[role="radio"]:not([disabled])')] : [];
  let currentIndex = enabledRadios.indexOf(event.currentTarget);
  if (currentIndex < 0 || enabledRadios.length === 0) return;
  let nextIndex = event.key === "ArrowRight" || event.key === "ArrowDown"
    ? (currentIndex + 1) % enabledRadios.length
    : (currentIndex - 1 + enabledRadios.length) % enabledRadios.length;
  event.preventDefault();
  enabledRadios[nextIndex].focus();
  enabledRadios[nextIndex].click();
}
return { handleRadioKeyDown };
}
