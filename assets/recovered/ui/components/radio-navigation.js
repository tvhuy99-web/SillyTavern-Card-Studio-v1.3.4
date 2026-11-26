// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRadioNavigation(dependencies = {}) {
function xu(e){if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;let t=e.currentTarget.closest('[role="radiogroup"]'),n=t?[...t.querySelectorAll('[role="radio"]:not([disabled])')]:[],r=n.indexOf(e.currentTarget);if(r<0||0===n.length)return;let a="ArrowRight"===e.key||"ArrowDown"===e.key?(r+1)%n.length:(r-1+n.length)%n.length;e.preventDefault(),n[a].focus(),n[a].click()}
return { handleRadioKeyDown: xu };
}
