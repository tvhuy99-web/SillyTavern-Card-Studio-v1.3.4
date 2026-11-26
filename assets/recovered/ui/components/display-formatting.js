// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createDisplayFormatting(dependencies = {}) {
function Is(e,t){return!e||e.length<=t?e:e.substring(0,t)+"..."}
var js=[{label:"năm",seconds:31536e3},{label:"tháng",seconds:2592e3},{label:"tuần",seconds:604800},{label:"ngày",seconds:86400},{label:"giờ",seconds:3600},{label:"phút",seconds:60},{label:"giây",seconds:1}];
return { truncateText: Is, relativeTimeUnits: js };
}
